const express = require("express");
const router = express.Router();

const { generateNextQuestion } = require("../services/aiService");
const { extractQA } = require("../utils/qaParser");
const { createMeeting } = require("../services/graphService");
const { joinMeetingWithBot } = require("../services/callService");
const { default: axios } = require("axios");

router.get("/start-interview", async (req, res) => {
  try {
    const meeting = await createMeeting();

    console.log("Meeting created:", meeting.joinWebUrl);

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
      meetingLink: meeting.joinWebUrl,
      botJoinStatus: botResponse.data,
    });
  } catch (err) {
    console.error("❌ Bot join failed");

    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("Error:", err.message);
    }

    res.status(500).json({
      ok: false,
      error: err.response?.data || err.message,
    });
  }
});

// ✅ TRANSCRIPT HANDLER
router.post("/transcript", async (req, res) => {
  try {
    const { text } = req.body;

    // Safety check
    if (!req.body || typeof text !== "string") {
      return res.sendStatus(200);
    }

    if (!text || text.trim().length < 5) return res.sendStatus(200);

    console.log("🎤 Incoming:", text);

    // Store transcript
    global.transcriptBuffer.push(text.trim());

    // Limit buffer
    if (global.transcriptBuffer.length > 20) {
      global.transcriptBuffer.shift();
    }

    const fullText = global.transcriptBuffer.join(" ");

    const { question, answer } = extractQA(fullText);

    if (!question || !answer) return res.sendStatus(200);

    console.log("👉 Q:", question);
    console.log("👉 A:", answer);

    const nextQuestion = await generateNextQuestion(question, answer);

    console.log("🤖 Next:", nextQuestion);

    // Send to frontend
    global.clients.forEach((client) => {
      client.send(
        JSON.stringify({
          type: "NEW_QUESTION",
          question,
          answer,
          nextQuestion,
        }),
      );
    });

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Transcript error:", err.message);
    res.sendStatus(500);
  }
});

module.exports = router;
