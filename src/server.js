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

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(express.json());
app.use(cors({ origin: "*" }));

const PORT = process.env.PORT || 5000;

/* ============================
   IN-MEMORY STORAGE
============================ */

const candidates = {};
const meetings = {};

/* ============================
   AI (DUMMY)
============================ */

async function getNextQuestion({ history }) {
  if (!history || history.length === 0) {
    return "Tell me about yourself.";
  }
  return "Can you elaborate more on that?";
}

/* ============================
   HELPERS
============================ */

function normalizeSpeaker(name) {
  if (!name) return "unknown";

  const s = name.toLowerCase();

  if (s.includes("bot")) return "bot";
  if (s.includes("interviewer")) return "interviewer";

  return "candidate"; // default
}

function getCandidateByEmail(email) {
  return Object.values(candidates).find((c) => c.email === email);
}

/* ============================
   GRAPH AUTH
============================ */

async function getAccessToken() {
  const res = await axios.post(
    `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );

  return res.data.access_token;
}

/* ============================
   CREATE TEAMS MEETING
============================ */

async function createTeamsMeeting(candidateEmail) {
  const token = await getAccessToken();

  const res = await axios.post(
    `https://graph.microsoft.com/v1.0/users/${process.env.ORGANIZER_EMAIL}/events`,
    {
      subject: "AI Interview",
      start: {
        dateTime: new Date(Date.now() + 5 * 60000).toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: new Date(Date.now() + 35 * 60000).toISOString(),
        timeZone: "UTC",
      },
      attendees: [
        {
          emailAddress: { address: candidateEmail },
          type: "required",
        },
      ],
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return res.data;
}

/* ============================
   GRAPH SUBSCRIPTION
============================ */

async function createSubscription() {
  const token = await getAccessToken();

  const res = await axios.post(
    "https://graph.microsoft.com/v1.0/subscriptions",
    {
      changeType: "created,updated",
      notificationUrl: process.env.WEBHOOK_URL,
      resource: "communications/onlineMeetings/getAllTranscripts",
      expirationDateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      clientState: "secure123",
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  console.log("📡 Subscription created:", res.data.id);
}

/* ============================
   TRANSCRIPT FETCH
============================ */

async function handleTranscript(graphMeetingId, transcriptId) {
  const token = await getAccessToken();

  const url = `https://graph.microsoft.com/v1.0/communications/onlineMeetings/${graphMeetingId}/transcripts/${transcriptId}/content`;

  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const transcript = res.data;

  const meeting = Object.values(meetings).find(
    (m) => m.graphMeetingId === graphMeetingId,
  );

  if (!meeting) {
    console.log("⚠️ Meeting not found:", graphMeetingId);
    return;
  }

  for (const item of transcript.transcriptContent || []) {
    const speaker = normalizeSpeaker(item.speaker?.displayName);
    const text = item.text;

    const chunk = {
      speaker,
      text,
      isFinal: true,
      at: new Date().toISOString(),
    };

    meeting.liveTranscript.push(chunk);

    io.to(meeting.id).emit("transcript-update", chunk);

    // Candidate answer → next question
    if (speaker === "candidate") {
      const index = meeting.currentQuestionIndex;

      meeting.answers[index] = text;

      const history = meeting.questions.map((q, i) => ({
        q,
        a: meeting.answers[i] || "",
      }));

      const nextQuestion = await getNextQuestion({ history });

      meeting.questions.push(nextQuestion);
      meeting.currentQuestionIndex++;

      io.to(meeting.id).emit("next-question", { nextQuestion });
    }
  }
}

/* ============================
   WEBHOOK
============================ */

app.post("/api/callback", async (req, res) => {
  // Validation handshake
  if (req.query.validationToken) {
    return res.send(req.query.validationToken);
  }

  try {
    const notifications = req.body.value;

    for (const note of notifications) {
      const resource = note.resource;

      const match = resource.match(/onlineMeetings\/(.+)\/transcripts\/(.+)/);

      if (!match) continue;

      const graphMeetingId = match[1];
      const transcriptId = match[2];

      await handleTranscript(graphMeetingId, transcriptId);
    }
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
  }

  res.sendStatus(200);
});

/* ============================
   SOCKET
============================ */

io.on("connection", (socket) => {
  socket.on("join-meeting-room", ({ meetingId }) => {
    if (meetingId) socket.join(meetingId);
  });
});

/* ============================
   ROUTES
============================ */

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

/* ===== CREATE CANDIDATE ===== */

app.post("/candidate", (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email required" });
  }

  const id = crypto.randomUUID();

  const candidate = { id, name, email };
  candidates[id] = candidate;

  res.json(candidate);
});

/* ===== CREATE MEETING ===== */

app.post("/create-meeting", async (req, res) => {
  try {
    const { candidateEmail } = req.body;

    const candidate = getCandidateByEmail(candidateEmail);
    if (!candidate) return res.status(404).json({ error: "Not found" });

    const data = await createTeamsMeeting(candidateEmail);

    const meetingId = crypto.randomUUID();

    const graphMeetingId = data.onlineMeeting?.id;
    const joinUrl = data.onlineMeeting?.joinUrl;

    const firstQuestion = await getNextQuestion({ history: [] });

    meetings[meetingId] = {
      id: meetingId,
      candidate,
      graphMeetingId,
      joinUrl,

      questions: [firstQuestion],
      answers: [],
      currentQuestionIndex: 0,

      liveTranscript: [],
    };

    res.json({ meetingId, joinUrl, firstQuestion });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Meeting creation failed" });
  }
});

/* ============================
   START SERVER
============================ */

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Server running on ${PORT}`);

  try {
    await createSubscription();
  } catch (err) {
    console.error("❌ Subscription failed:", err.message);
  }
});
