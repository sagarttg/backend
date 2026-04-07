import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "crypto";
import http from "http";
import { Server } from "socket.io";
import axios from "axios";

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

app.use(express.json());
app.use(cors({ origin: FRONTEND_ORIGIN }));

const io = new Server(server, {
  cors: { origin: FRONTEND_ORIGIN },
});

/* ======================
   STORAGE
====================== */
const candidates = {};
const meetings = {};

/* ======================
   GRAPH TOKEN
====================== */
async function getAccessToken() {
  const res = await axios.post(
    `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  );
  return res.data.access_token;
}

/* ======================
   CREATE TEAMS MEETING
====================== */
async function createTeamsMeeting(email) {
  const token = await getAccessToken();

  const res = await axios.post(
    `https://graph.microsoft.com/v1.0/users/${process.env.ORGANIZER_EMAIL}/events`,
    {
      subject: "AI Interview",
      start: { dateTime: new Date().toISOString(), timeZone: "UTC" },
      end: {
        dateTime: new Date(Date.now() + 30 * 60000).toISOString(),
        timeZone: "UTC",
      },
      attendees: [{ emailAddress: { address: email }, type: "required" }],
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return res.data;
}

/* ======================
   SOCKET
====================== */
io.on("connection", (socket) => {
  socket.on("join", ({ meetingId }) => {
    socket.join(meetingId);
  });
});

/* ======================
   CREATE CANDIDATE
====================== */
app.post("/candidate", (req, res) => {
  const { name, email, role, experience, skills } = req.body;

  if (!name || !email) return res.status(400).json({ error: "Missing fields" });

  const id = crypto.randomUUID();

  candidates[id] = {
    id,
    name,
    email,
    role,
    experience,
    skills,
  };

  res.json(candidates[id]);
});

/* ======================
   CREATE MEETING
====================== */
app.post("/meeting", async (req, res) => {
  try {
    const { candidateId } = req.body;
    const candidate = candidates[candidateId];

    if (!candidate)
      return res.status(404).json({ error: "Candidate not found" });

    const data = await createTeamsMeeting(candidate.email);

    const id = crypto.randomUUID();

    meetings[id] = {
      id,
      candidate,
      joinUrl: data.onlineMeeting.joinUrl,
      graphMeetingId: data.onlineMeeting.id,
      transcript: [],
      status: "active",
      lastTranscriptId: null,
    };

    res.json(meetings[id]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   RESOLVE ACTIVE MEETING
====================== */
app.get("/resolve-meeting", (req, res) => {
  const active = Object.values(meetings).find((m) => m.status === "active");
  if (!active) return res.status(404).json({ error: "No active meeting" });
  res.json({ meetingId: active.id });
});

/* ======================
   GET MEETING
====================== */
app.get("/meeting/:id", (req, res) => {
  const meeting = meetings[req.params.id];
  if (!meeting) return res.status(404).json({ error: "Not found" });
  res.json(meeting);
});

/* ======================
   TRANSCRIPT FETCH
====================== */
async function fetchTranscript(meeting) {
  try {
    const token = await getAccessToken();

    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/communications/onlineMeetings/${meeting.graphMeetingId}/transcripts`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const transcripts = res.data.value || [];

    for (const t of transcripts) {
      if (meeting.lastTranscriptId === t.id) continue;

      const content = await axios.get(
        `https://graph.microsoft.com/v1.0/communications/callRecords/${t.id}/transcriptContent`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const lines = content.data?.value || [];

      lines.forEach((line) => {
        const chunk = {
          speaker: line.speaker || "unknown",
          text: line.text,
          at: new Date().toISOString(),
        };

        meeting.transcript.push(chunk);
        io.to(meeting.id).emit("transcript", chunk);
      });

      meeting.lastTranscriptId = t.id;
    }
  } catch (err) {
    console.error("Transcript error:", err.message);
  }
}

/* ======================
   POLLING LOOP
====================== */
setInterval(() => {
  Object.values(meetings).forEach((m) => {
    if (m.status === "active" && m.graphMeetingId) {
      fetchTranscript(m);
    }
  });
}, 5000);

/* ======================
   START
====================== */
server.listen(PORT, () => {
  console.log("🚀 Running on", PORT);
});
