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

app.use(express.json());
app.use(cors({ origin: "*" }));

const io = new Server(server, {
  cors: { origin: "*" },
});

/* ======================
   TEMP DB
====================== */
const meetings = {};
const candidates = {};
const calls = {}; // bot calls

/* ======================
   GRAPH TOKEN
====================== */
async function getToken() {
  const res = await axios.post(
    `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    })
  );
  return res.data.access_token;
}

/* ======================
   CREATE TEAMS MEETING
====================== */
async function createTeamsMeeting(email) {
  const token = await getToken();

  const res = await axios.post(
    `https://graph.microsoft.com/v1.0/users/${process.env.ORGANIZER_EMAIL}/events`,
    {
      subject: "AI Interview",
      start: { dateTime: new Date().toISOString(), timeZone: "UTC" },
      end: {
        dateTime: new Date(Date.now() + 30 * 60000).toISOString(),
        timeZone: "UTC",
      },
      attendees: [{ emailAddress: { address: email }, type: "required" }],
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return res.data;
}

/* ======================
   BOT JOIN MEETING
====================== */
async function joinBot(joinUrl, meetingId) {
  const token = await getToken();

  const res = await axios.post(
    "https://graph.microsoft.com/v1.0/communications/calls",
    {
      callbackUri: process.env.PUBLIC_CALLBACK,
      requestedModalities: ["audio"],
      mediaConfig: {
        "@odata.type": "#microsoft.graph.serviceHostedMediaConfig",
      },
      meetingInfo: {
        "@odata.type": "#microsoft.graph.organizerMeetingInfo",
        joinWebUrl: joinUrl,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  calls[res.data.id] = { meetingId };

  return res.data;
}

/* ======================
   TRANSCRIPT FETCH
====================== */
async function fetchTranscripts(graphMeetingId) {
  const token = await getToken();

  const res = await axios.get(
    `https://graph.microsoft.com/v1.0/communications/onlineMeetings/${graphMeetingId}/transcripts`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data.value || [];
}

/* ======================
   AI
====================== */
async function getNextQuestion(history) {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Ask next interview question based on:\n${JSON.stringify(
            history
          )}`,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_KEY}`,
      },
    }
  );

  return res.data.choices[0].message.content;
}

async function scoreAnswer(answer) {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Score this out of 10: ${answer}` }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_KEY}`,
      },
    }
  );

  return res.data.choices[0].message.content;
}

function isAnswerComplete(text) {
  return text.length > 80 || text.endsWith(".");
}

/* ======================
   SOCKET
====================== */
io.on("connection", (socket) => {
  socket.on("join", ({ meetingId }) => {
    socket.join(meetingId);
  });

  socket.on("candidate-transcript", async ({ meetingId, text }) => {
    const meeting = meetings[meetingId];
    if (!meeting) return;

    const chunk = {
      speaker: "Candidate",
      text,
      at: new Date().toISOString(),
    };

    meeting.transcript.push(chunk);
    io.to(meetingId).emit("transcript", chunk);

    const i = meeting.currentQuestionIndex;
    meeting.answers[i] = (meeting.answers[i] || "") + " " + text;

    if (!isAnswerComplete(meeting.answers[i])) return;

    const score = await scoreAnswer(meeting.answers[i]);
    meeting.scores[i] = score;

    const nextQ = await getNextQuestion(
      meeting.questions.map((q, idx) => ({
        q,
        a: meeting.answers[idx] || "",
      }))
    );

    meeting.questions.push(nextQ);
    meeting.currentQuestionIndex++;

    io.to(meetingId).emit("next-question", { nextQuestion: nextQ });

    io.to(meetingId).emit("transcript", {
      speaker: "AI",
      text: nextQ,
      at: new Date().toISOString(),
    });
  });
});

/* ======================
   ROUTES
====================== */

/* CREATE CANDIDATE */
app.post("/candidate", (req, res) => {
  const id = crypto.randomUUID();
  candidates[id] = req.body;
  res.json({ id, ...req.body });
});

/* CREATE MEETING + BOT JOIN */
app.post("/meeting", async (req, res) => {
  try {
    const candidate = candidates[req.body.candidateId];
    if (!candidate) return res.status(400).send("Invalid candidate");

    const data = await createTeamsMeeting(candidate.email);

    const id = crypto.randomUUID();

    const meeting = {
      id,
      candidate,
      joinUrl: data.onlineMeeting.joinUrl,
      graphMeetingId: data.onlineMeeting.id,

      transcript: [],
      questions: ["Tell me about yourself"],
      answers: [],
      scores: [],
      currentQuestionIndex: 0,
      status: "active",
    };

    meetings[id] = meeting;

    // 🔥 BOT AUTO JOIN
    await joinBot(meeting.joinUrl, id);

    res.json(meeting);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Meeting error");
  }
});

/* RESOLVE MEETING */
app.post("/resolve-meeting", (req, res) => {
  const active = Object.values(meetings).find((m) => m.status === "active");
  res.json({ meetingId: active?.id });
});

/* GET MEETING */
app.get("/meeting/:id", (req, res) => {
  res.json(meetings[req.params.id]);
});

/* GRAPH CALLBACK */
app.post("/api/callback", (req, res) => {
  console.log("📡 Graph Event:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

/* POLL TRANSCRIPTS */
app.get("/poll-transcript/:id", async (req, res) => {
  try {
    const meeting = meetings[req.params.id];
    if (!meeting) return res.status(404).send("Not found");

    const transcripts = await fetchTranscripts(meeting.graphMeetingId);

    for (const t of transcripts) {
      const content = await axios.get(t.transcriptContentUrl);

      io.to(meeting.id).emit("candidate-transcript", {
        meetingId: meeting.id,
        text: content.data,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Transcript error");
  }
});

/* ======================
   START
====================== */
server.listen(process.env.PORT, () =>
  console.log("🚀 Full Backend Running")
);