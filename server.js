require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const interviewRoutes = require("./routes/interviewRoutes");

const app = express();

// ✅ ALLOW ALL CORS (DEV ONLY)
app.use(cors());

// ✅ JSON parser
app.use(express.json());

// ✅ HTTP server
const server = http.createServer(app);

// ✅ WebSocket server
const wss = new WebSocket.Server({ server });

global.clients = [];

// ✅ WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("🔌 Client connected");

  global.clients.push(ws);

  ws.on("close", () => {
    console.log("❌ Client disconnected");
    global.clients = global.clients.filter((c) => c !== ws);
  });
});

// ✅ API routes
app.use("/api", interviewRoutes);

// ✅ Health check (important for EC2 / ALB)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ✅ Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});