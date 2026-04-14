const express = require("express");
const router = express.Router();

const { generateNextQuestion } = require("../services/aiService");
const { extractQA } = require("../utils/qaParser");
const { createMeeting } = require("../services/graphService");

router.get("/start-interview", async (req, res) => {
  try {
    const meeting = await createMeeting();

    res.json({
      meetingLink: meeting.joinWebUrl,
      meetingId: meeting.id,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create meeting" });
  }
});

router.post("/transcript", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) return res.sendStatus(200);

    console.log("🎤 Incoming:", text);

    global.transcriptBuffer.push(text);

    const fullText = global.transcriptBuffer.join(" ");
    const { question, answer } = extractQA(fullText);

    if (!question || !answer) return res.sendStatus(200);

    console.log("👉 Q:", question);
    console.log("👉 A:", answer);

    const nextQuestion = await generateNextQuestion(question, answer);

    console.log("🤖 Next:", nextQuestion);

    global.clients.forEach((client) => {
      client.send(
        JSON.stringify({
          type: "NEW_QUESTION",
          question,
          answer,
          nextQuestion,
        })
      );
    });

    res.sendStatus(200);
  } catch (err) {
    console.error(err.message);
    res.sendStatus(500);
  }
});

module.exports = router;