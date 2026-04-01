import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import crypto from "crypto";

import { createTeamsMeeting, sendInviteEmail } from "./graph.js";
import { createMeetingRecord, getMeeting, meetings } from "./meetings.js";
import { getNextQuestion } from "./ai.js";

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
// CREATE MEETING
// ============================
app.post("/create-meeting", async (req, res) => {
  try {
    const { candidateEmail } = req.body;

    // 1. Create meeting
    const data = await createTeamsMeeting(candidateEmail);

    const appMeetingId = crypto.randomUUID();
    const joinUrl = data.onlineMeeting?.joinUrl;

    // 2. Store meeting
    createMeetingRecord(appMeetingId, {
      candidateEmail,
      graphEventId: data.id,
      joinUrl,
    });

    // 3. SEND EMAIL (CRITICAL FIX)
    await sendInviteEmail(candidateEmail, joinUrl);

    // 4. Respond
    res.json({
      meetingId: appMeetingId,
      joinUrl,
    });

  } catch (err) {
    console.error("CREATE MEETING ERROR:", err.response?.data || err.message);

    res.status(500).json({
      error: "Meeting failed",
      details: err.response?.data || err.message
    });
  }
});

// ============================
// OTHER ROUTES (UNCHANGED)
// ============================

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

app.post("/answer", async (req, res) => {
  try {
    const { meetingId, answer } = req.body;

    if (!meetingId || !answer) {
      return res.status(400).json({ error: "Missing meetingId or answer" });
    }

    const meeting = getMeeting(meetingId);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    meeting.answers.push(answer);

    const nextQuestion = await getNextQuestion(answer);

    meeting.questions.push(nextQuestion);

    return res.json({
      success: true,
      nextQuestion,
    });

  } catch (err) {
    console.error("ANSWER ERROR:", err.response?.data || err.message);

    return res.status(500).json({
      error: "AI failed",
      details: err.response?.data || err.message,
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});