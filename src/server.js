import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "crypto";

import { createTeamsMeeting } from "./graph.js";
import { createMeetingRecord, getMeeting, meetings } from "./meetings.js";
import { getNextQuestion } from "./ai.js";

import {
  createCandidate,
  getCandidateByEmail
} from "./candidates.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({ origin: "*" }));



const PORT = process.env.PORT || 5000;

// ============================
// HEALTH
// ============================
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});


// ============================
// CREATE CANDIDATE (WITH RESUME)
// ============================
app.post("/candidate", (req, res) => {
  try {
    const { name, email, phone, age, address } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email required" });
    }

    const candidate = createCandidate({
      name,
      email,
      phone,
      age,
      address
    });

    return res.json(candidate);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Candidate creation failed" });
  }
});


// ============================
// CREATE MEETING
// ============================
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
// RESOLVE MEETING (TEMP)
// ============================
app.post("/resolve-meeting", (req, res) => {
  const allMeetings = Object.values(meetings);

  if (!allMeetings.length) {
    return res.status(404).json({ error: "No meetings found" });
  }

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

    if (!meetingId || !answer) {
      return res.status(400).json({ error: "Missing data" });
    }

    const meeting = getMeeting(meetingId);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // store answer
    meeting.answers.push(answer);

    // build history
    const history = meeting.questions.map((q, i) => ({
      q,
      a: meeting.answers[i] || ""
    }));

    const nextQuestion = await getNextQuestion({
      answer,
      history
    });

    meeting.questions.push(nextQuestion);

    res.json({
      success: true,
      nextQuestion,
    });
  } catch (err) {
    console.error("ANSWER ERROR:", err.response?.data || err.message);

    res.status(500).json({
      error: "AI failed",
      details: err.response?.data || err.message,
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});