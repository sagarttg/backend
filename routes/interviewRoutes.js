const express = require("express");
const router = express.Router();

const { createMeeting } = require("../services/graphService");
const {
  createCandidate,
  attachMeeting,
  getCandidateByMeetingId,
  addTranscript,
} = require("../services/candidateService");

const { extractQA } = require("../utils/qaParser");
const { default: axios } = require("axios");

// ✅ CREATE CANDIDATE + MEETING
router.post("/create-interview", async (req, res) => {
  try {
    const { name, email, password, questionBank, resumeData, threadId } =
      req.body;
    const candidate = createCandidate({
      name,
      email,
      password,
      questionBank,
      resumeData,
      threadId, // ✅ IMPORTANT
    });

    if (!threadId) {
      return res.status(400).json({
        error: "threadId is required (must come from Teams tab)",
      });
    }
    const meeting = await createMeeting();

    attachMeeting(candidate.id, threadId);
    // 👉 CALL YOUR ECHOBOT HERE
    const botResponse = await axios.post(
      "https://dotnet.thetalent.games/Calls",
      {
        JoinUrl: meeting.joinWebUrl,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    res.json({
      ok: true,
      candidateId: candidate.id,
      meetingId: meeting.id,
      meetingLink: meeting.joinWebUrl,
      botJoinStatus: botResponse.data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ GET CANDIDATE INFO (FOR TAB)
router.get("/candidate", (req, res) => {
  const { threadId } = req.query;

  const candidate = getCandidateByMeetingId(threadId);

  if (!candidate) {
    return res.status(404).json({ error: "Candidate not found" });
  }

  res.json(candidate);
});

// ✅ TRANSCRIPT (MANUAL TEST)
router.post("/transcript", (req, res) => {
  try {
    const { threadId, text } = req.body;

    if (!text || text.length < 3) return res.sendStatus(200);

    const candidate = addTranscript(threadId, text);

    if (!candidate) return res.sendStatus(200);

    console.log(`🎤 ${candidate.name}: ${text}`);

    const fullText = candidate.transcript.join(" ");
    const { question, answer } = extractQA(fullText);

    if (question && answer) {
      console.log("👉 Q:", question);
      console.log("👉 A:", answer);
    }

    res.json({
      candidateId: candidate.id,
      transcript: candidate.transcript,
      question,
      answer,
    });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
