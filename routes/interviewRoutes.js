// const express = require("express");
// const router = express.Router();

// const { extractQA } = require("../utils/qaParser");
// const { createMeeting } = require("../services/graphService");
// const { default: axios } = require("axios");

// router.get("/start-interview", async (req, res) => {
//   try {
//     const meeting = await createMeeting();

//     console.log("Meeting created:", meeting.joinWebUrl);

//     // 👉 CALL YOUR ECHOBOT HERE
//     const botResponse = await axios.post(
//       "https://dotnet.thetalent.games/Calls",
//       {
//         JoinUrl: meeting.joinWebUrl,
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//         },
//       },
//     );

//     res.json({
//       ok: true,
//       meetingLink: meeting.joinWebUrl,
//       botJoinStatus: botResponse.data,
//     });
//   } catch (err) {
//     console.error("❌ Bot join failed");

//     if (err.response) {
//       console.error("Status:", err.response.status);
//       console.error("Data:", JSON.stringify(err.response.data, null, 2));
//     } else {
//       console.error("Error:", err.message);
//     }

//     res.status(500).json({
//       ok: false,
//       error: err.response?.data || err.message,
//     });
//   }
// });

// // ✅ TRANSCRIPT HANDLER
// router.post("/transcript", async (req, res) => {
//   try {
//     const { text } = req.body;

//     // Safety check
//     if (!req.body || typeof text !== "string") {
//       return res.sendStatus(200);
//     }

//     if (!text || text.trim().length < 5) return res.sendStatus(200);

//     console.log("🎤 Incoming:", text);

//     // Store transcript
//     global.transcriptBuffer.push(text.trim());

//     // Limit buffer
//     if (global.transcriptBuffer.length > 20) {
//       global.transcriptBuffer.shift();
//     }

//     const fullText = global.transcriptBuffer.join(" ");

//     const { question, answer } = extractQA(fullText);

//     if (!question || !answer) return res.sendStatus(200);

//     console.log("👉 Q:", question);
//     console.log("👉 A:", answer);


//     // Send to frontend
//     global.clients.forEach((client) => {
//       client.send(
//         JSON.stringify({
//           question,
//           answer,
//         }),
//       );
//     });

//     res.sendStatus(200);
//   } catch (err) {
//     console.error("❌ Transcript error:", err.message);
//     res.sendStatus(500);
//   }
// });

// module.exports = router;





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


// ✅ CREATE CANDIDATE + MEETING
router.post("/create-interview", async (req, res) => {
  try {
    const { name, email, password, questionBank, resumeData } = req.body;

    const candidate = createCandidate({
      name,
      email,
      password,
      questionBank,
      resumeData,
    });

    const meeting = await createMeeting();

    attachMeeting(candidate.id, meeting.id);

    res.json({
      ok: true,
      candidateId: candidate.id,
      meetingId: meeting.id,
      meetingLink: meeting.joinWebUrl,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});


// ✅ GET CANDIDATE INFO (FOR TAB)
router.get("/candidate", (req, res) => {
  const { meetingId } = req.query;

  const candidate = getCandidateByMeetingId(meetingId);

  if (!candidate) {
    return res.status(404).json({ error: "Candidate not found" });
  }

  res.json(candidate);
});


// ✅ TRANSCRIPT (MANUAL TEST)
router.post("/transcript", (req, res) => {
  try {
    const { meetingId, text } = req.body;

    if (!text || text.length < 3) return res.sendStatus(200);

    const candidate = addTranscript(meetingId, text);

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