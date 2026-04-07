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

/* ============================
   CONFIG
============================ */

const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

/*
Required ENV variables:
----------------------
PORT=5000
FRONTEND_ORIGIN=http://localhost:3000

# Microsoft Graph (for creating Teams meeting)
TENANT_ID=xxxx
CLIENT_ID=xxxx
CLIENT_SECRET=xxxx
ORGANIZER_EMAIL=admin@yourdomain.com

# Azure Speech
AZURE_SPEECH_KEY=xxxx
AZURE_SPEECH_REGION=eastus

# Optional webhook if you still want Graph callbacks later
WEBHOOK_URL=https://yourdomain.com/api/callback
*/

app.use(express.json());
app.use(cors({ origin: FRONTEND_ORIGIN }));

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
  },
});

/* ============================
   IN-MEMORY STORAGE
============================ */

const candidates = {}; // { [candidateId]: {id,name,email} }
const meetings = {}; // { [meetingId]: {...meeting data...} }

/* ============================
   AI (DUMMY)
============================ */

async function getNextQuestion({ history }) {
  // Replace this with OpenAI call later
  if (!history || history.length === 0) {
    return "Tell me about yourself.";
  }

  // Example simple progression
  const last = history[history.length - 1];
  if (!last?.a || last.a.trim().length < 10) {
    return "Can you explain that in a bit more detail?";
  }

  return "Can you share a real example from your experience?";
}

/* ============================
   HELPERS
============================ */

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function getCandidateByEmail(email) {
  const e = normalizeEmail(email);
  return Object.values(candidates).find((c) => normalizeEmail(c.email) === e);
}

function ensureMeetingExists(meetingId) {
  const meeting = meetings[meetingId];
  if (!meeting) {
    throw new Error("Meeting not found");
  }
  return meeting;
}

/* ============================
   MICROSOFT GRAPH AUTH
============================ */

async function getAccessToken() {
  const tenant = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!tenant || !clientId || !clientSecret) {
    throw new Error("Missing TENANT_ID / CLIENT_ID / CLIENT_SECRET in .env");
  }

  const res = await axios.post(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
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
  const organizer = process.env.ORGANIZER_EMAIL;
  if (!organizer) throw new Error("Missing ORGANIZER_EMAIL in .env");

  const token = await getAccessToken();

  const startDate = new Date(Date.now() + 5 * 60 * 1000);
  const endDate = new Date(Date.now() + 35 * 60 * 1000);

  const res = await axios.post(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizer)}/events`,
    {
      subject: "AI Interview",
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: endDate.toISOString(),
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
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  return res.data;
}

/* ============================
   AZURE SPEECH TOKEN ENDPOINT
============================ */

/*
Frontend uses Azure Speech SDK directly in browser.
For security, do NOT expose AZURE_SPEECH_KEY to frontend.
Instead, frontend requests a short-lived token from backend.
*/
app.get("/api/speech/token", async (req, res) => {
  try {
    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;

    if (!key || !region) {
      return res.status(500).json({ error: "Azure Speech env vars missing" });
    }

    const tokenRes = await axios.post(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      null,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    return res.json({
      token: tokenRes.data,
      region,
    });
  } catch (err) {
    console.error("❌ Speech token error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to issue speech token" });
  }
});

/* ============================
   WEBHOOK (OPTIONAL)
   Not used for live transcript.
============================ */

app.post("/api/callback", async (req, res) => {
  // Validation handshake
  if (req.query.validationToken) {
    return res.status(200).send(req.query.validationToken);
  }

  try {
    // If you keep subscriptions, validate clientState
    const notifications = req.body.value || [];
    for (const note of notifications) {
      if (note.clientState && note.clientState !== "secure123") {
        continue;
      }
      // You can log notifications for debugging
      console.log("Graph notification:", note.resource);
    }
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
  }

  return res.sendStatus(200);
});

/* ============================
   SOCKET.IO
============================ */

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  // Candidate/admin joins room for one meeting
  socket.on("join-meeting-room", ({ meetingId, role }) => {
    try {
      if (!meetingId) return;
      socket.join(meetingId);
      socket.data.meetingId = meetingId;
      socket.data.role = role || "unknown";

      console.log(
        `🔗 ${socket.id} joined room ${meetingId} as ${role || "unknown"}`,
      );

      // Send current state to newly joined socket
      const meeting = meetings[meetingId];
      if (meeting) {
        socket.emit("meeting-state", {
          meetingId: meeting.id,
          candidate: meeting.candidate,
          joinUrl: meeting.joinUrl,
          questions: meeting.questions,
          answers: meeting.answers,
          currentQuestionIndex: meeting.currentQuestionIndex,
          liveTranscript: meeting.liveTranscript,
          status: meeting.status,
        });
      }
    } catch (err) {
      console.error("join-meeting-room error:", err.message);
    }
  });

  /*
    Candidate frontend sends transcript chunks:
    {
      meetingId: "...",
      text: "I have 3 years of React experience...",
      isFinal: true,
      confidence: 0.92
    }
  */
  socket.on("candidate-transcript", async (payload) => {
    try {
      const {
        meetingId,
        text,
        isFinal = true,
        confidence = null,
      } = payload || {};
      if (!meetingId || !text || !String(text).trim()) return;

      const meeting = meetings[meetingId];
      if (!meeting) return;

      const chunk = {
        speaker: "candidate",
        text: String(text).trim(),
        isFinal: !!isFinal,
        confidence,
        at: new Date().toISOString(),
      };

      // Push transcript and broadcast to room
      meeting.liveTranscript.push(chunk);
      io.to(meetingId).emit("transcript-update", chunk);

      // Only process final chunks for answer -> next question
      if (!isFinal) return;

      // Debounce duplicate finals (Speech SDK can emit repeated finals)
      const now = Date.now();
      if (now - (meeting.lastFinalAt || 0) < 1500) {
        return;
      }
      meeting.lastFinalAt = now;

      // Save answer against current question
      const qIndex = meeting.currentQuestionIndex;
      meeting.answers[qIndex] = chunk.text;

      // Build history
      const history = meeting.questions.map((q, i) => ({
        q,
        a: meeting.answers[i] || "",
      }));

      // Generate next question
      const nextQuestion = await getNextQuestion({ history });

      // Append next question and increment index
      meeting.questions.push(nextQuestion);
      meeting.currentQuestionIndex++;

      // Broadcast next question to admin + candidate
      io.to(meetingId).emit("next-question", {
        nextQuestion,
        questionIndex: meeting.currentQuestionIndex,
      });

      // Also store interviewer question in transcript for UI timeline
      const botChunk = {
        speaker: "interviewer",
        text: nextQuestion,
        isFinal: true,
        at: new Date().toISOString(),
      };
      meeting.liveTranscript.push(botChunk);
      io.to(meetingId).emit("transcript-update", botChunk);
    } catch (err) {
      console.error("candidate-transcript error:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
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
  try {
    const { name, email } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email required" });
    }

    const id = crypto.randomUUID();
    const candidate = {
      id,
      name: String(name).trim(),
      email: normalizeEmail(email),
    };
    candidates[id] = candidate;

    return res.json(candidate);
  } catch (err) {
    console.error("candidate error:", err.message);
    return res.status(500).json({ error: "Failed to create candidate" });
  }
});

/* ===== CREATE MEETING ===== */
app.post("/create-meeting", async (req, res) => {
  try {
    const { candidateEmail } = req.body || {};
    if (!candidateEmail) {
      return res.status(400).json({ error: "candidateEmail required" });
    }

    const candidate = getCandidateByEmail(candidateEmail);
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const data = await createTeamsMeeting(candidate.email);

    const meetingId = crypto.randomUUID();

    const graphMeetingId = data.onlineMeeting?.id || null;
    const joinUrl = data.onlineMeeting?.joinUrl || null;

    const firstQuestion = await getNextQuestion({ history: [] });

    meetings[meetingId] = {
      id: meetingId,
      candidate,
      graphMeetingId,
      joinUrl,

      questions: [firstQuestion],
      answers: [],
      currentQuestionIndex: 0,

      liveTranscript: [
        {
          speaker: "interviewer",
          text: firstQuestion,
          isFinal: true,
          at: new Date().toISOString(),
        },
      ],

      status: "active",
      createdAt: new Date().toISOString(),
      lastFinalAt: 0,
    };

    return res.json({
      meetingId,
      joinUrl,
      firstQuestion,
      candidate,
    });
  } catch (err) {
    console.error(
      "❌ create-meeting error:",
      err.response?.data || err.message,
    );
    return res.status(500).json({ error: "Meeting creation failed" });
  }
});

/* ===== GET MEETING STATE ===== */
app.get("/meeting/:meetingId", (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = ensureMeetingExists(meetingId);

    return res.json({
      id: meeting.id,
      candidate: meeting.candidate,
      joinUrl: meeting.joinUrl,
      questions: meeting.questions,
      answers: meeting.answers,
      currentQuestionIndex: meeting.currentQuestionIndex,
      liveTranscript: meeting.liveTranscript,
      status: meeting.status,
      createdAt: meeting.createdAt,
    });
  } catch (err) {
    return res.status(404).json({ error: "Meeting not found" });
  }
});

/* ===== MANUAL NEXT QUESTION (admin can trigger) ===== */
app.post("/meeting/:meetingId/next", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = ensureMeetingExists(meetingId);

    const history = meeting.questions.map((q, i) => ({
      q,
      a: meeting.answers[i] || "",
    }));

    const nextQuestion = await getNextQuestion({ history });

    meeting.questions.push(nextQuestion);
    meeting.currentQuestionIndex++;

    const botChunk = {
      speaker: "interviewer",
      text: nextQuestion,
      isFinal: true,
      at: new Date().toISOString(),
    };

    meeting.liveTranscript.push(botChunk);

    io.to(meetingId).emit("next-question", {
      nextQuestion,
      questionIndex: meeting.currentQuestionIndex,
    });
    io.to(meetingId).emit("transcript-update", botChunk);

    return res.json({
      nextQuestion,
      questionIndex: meeting.currentQuestionIndex,
    });
  } catch (err) {
    console.error("manual next error:", err.message);
    return res.status(500).json({ error: "Failed to generate next question" });
  }
});
/* ===== Resolve Metting ===== */

app.post("/resolve-meeting", (req, res) => {
  // Return latest active meeting (or create one if needed)
  const all = Object.values(meetings);
  const active = all.reverse().find((m) => m.status === "active");
  if (!active) return res.status(404).json({ error: "No active meeting found" });
  return res.json({ meetingId: active.id });
});
/* ===== END MEETING ===== */
app.post("/meeting/:meetingId/end", (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = ensureMeetingExists(meetingId);

    meeting.status = "ended";
    meeting.endedAt = new Date().toISOString();

    io.to(meetingId).emit("meeting-ended", { meetingId });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(404).json({ error: "Meeting not found" });
  }
});

/* ============================
   START SERVER
============================ */

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on ${PORT}`);
});
