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

wss.on("connection", (ws) => {
  global.clients.push(ws);

  ws.on("close", () => {
    global.clients = global.clients.filter((c) => c !== ws);
  });
});

app.use("/api", interviewRoutes);

server.listen(3000, () => {
  console.log("Backend running on 3000");
});