require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const interviewRoutes = require("./routes/interviewRoutes");

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

global.clients = [];
global.transcriptBuffer = [];

wss.on("connection", (ws) => {
  console.log("Frontend connected");
  global.clients.push(ws);

  ws.on("close", () => {
    global.clients = global.clients.filter((c) => c !== ws);
  });
});

app.use("/api", interviewRoutes);

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on ${process.env.PORT || 3000}`);
});