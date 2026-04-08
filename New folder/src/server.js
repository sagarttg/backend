import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "crypto";
import http from "http";
import { Server } from "socket.io";

import { createTeamsMeeting } from "./graph.js";
import { createMeetingRecord, getMeeting, meetings } from "./meetings.js";
import { getNextQuestion } from "./ai.js";
import { createCandidate, getCandidateByEmail } from "./candidates.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(cors({ origin: "*" }));

const PORT = process.env.PORT || 5000;

io.on("connection", (socket) => {
  socket.on("join-meeting-room", ({ meetingId }) => {
    if (meetingId) socket.join(meetingId);
  });
});

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.post("/candidate", (req, res) => {
  try {
    const { name, email, phone, age, address } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email required" });
    }

    const candidate = createCandidate({ name, email, phone, age, address });
    return res.json(candidate);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Candidate creation failed" });
  }
});

app.post("/create-meeting", async (req, res) => {
  try {
    const { candidateEmail } = req.body;
    const candidate = getCandidateByEmail(candidateEmail);

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const data = await createTeamsMeeting(candidateEmail);
    const appMeetingId = crypto.randomUUID();
    const joinUrl = data.onlineMeeting?.joinUrl;

    await createMeetingRecord(appMeetingId, {
      candidate,
      graphEventId: data.id,
      joinUrl
    });

    res.json({
      meetingId: appMeetingId,
      joinUrl
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Meeting failed" });
  }
});

app.post("/resolve-meeting", (req, res) => {
  const allMeetings = Object.values(meetings);

  if (!allMeetings.length) {
    return res.status(404).json({ error: "No meetings found" });
  }

  const latestMeeting = allMeetings[allMeetings.length - 1];
  res.json({ meetingId: latestMeeting.id });
});

app.get("/meeting/:id", (req, res) => {
  const meeting = getMeeting(req.params.id);

  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  res.json(meeting);
});

// receives transcript chunks from your media bot / speech service
app.post("/transcript-chunk", async (req, res) => {
  try {
    const { meetingId, speaker, text, isFinal } = req.body;

    if (!meetingId || !text) {
      return res.status(400).json({ error: "meetingId and text required" });
    }

    const meeting = getMeeting(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const chunk = {
      speaker: speaker || "Unknown",
      text,
      isFinal: !!isFinal,
      at: new Date().toISOString()
    };

    meeting.liveTranscript.push(chunk);
    io.to(meetingId).emit("transcript-update", chunk);

    if (isFinal && speaker === "candidate") {
      meeting.answers.push(text);

      const history = meeting.questions.map((q, i) => ({
        q,
        a: meeting.answers[i] || ""
      }));

      const nextQuestion = await getNextQuestion({ answer: text, history });
      meeting.questions.push(nextQuestion);

      io.to(meetingId).emit("next-question", { nextQuestion });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("TRANSCRIPT CHUNK ERROR:", err?.message || err);
    return res.status(500).json({ error: "Transcript processing failed" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});