

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "crypto";

import { createTeamsMeeting } from "./graph.js";
import { createMeetingRecord, getMeeting, meetings } from "./meetings.js";
import { getNextQuestion } from "./ai.js";

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors({
  origin: "*",
}));

const PORT = process.env.PORT || 5000;

// HEALTH
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// ============================
// CREATE MEETING
// ============================
app.post("/create-meeting", async (req, res) => {
  try {
    const { candidateEmail } = req.body;

    const data = await createTeamsMeeting(candidateEmail);

    const appMeetingId = crypto.randomUUID();

    const joinUrl = data.onlineMeeting?.joinUrl;

    createMeetingRecord(appMeetingId, {
      candidateEmail,
      graphEventId: data.id,
      joinUrl,
    });

    res.json({
      meetingId: appMeetingId,
      joinUrl,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Meeting failed" });
  }
});

// ============================
// RESOLVE MEETING
// ============================
app.post("/resolve-meeting", (req, res) => {
  const allMeetings = Object.values(meetings);

  if (!allMeetings.length) {
    return res.status(404).json({ error: "No meetings found" });
  }

  // ✅ TEMP: return latest meeting
  const latestMeeting = allMeetings[allMeetings.length - 1];

  res.json({ meetingId: latestMeeting.id });
});

// ============================
// GET MEETING
// ============================
app.get("/meeting/:id", (req, res) => {
  const meeting = getMeeting(req.params.id);

  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  res.json(meeting);
});

// ============================
// ANSWER → AI
// ============================
app.post("/answer", async (req, res) => {
  try {
    const { meetingId, answer } = req.body;

    const meeting = getMeeting(meetingId);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    meeting.answers.push(answer);

    const nextQuestion = await getNextQuestion(answer);

    meeting.questions.push(nextQuestion);

    res.json({ nextQuestion });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "AI failed" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});
