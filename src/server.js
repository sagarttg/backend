import express from "express";
import http from "http";
import cors from "cors";

import { ENV } from "./config/env.js";
import routes from "./routes/index.js";
import { initSocket } from "./utils/socket.js";

const app = express();
const server = http.createServer(app);

/* ✅ CORS ALLOW ALL */
app.use(cors({ origin: "*", methods: "*", allowedHeaders: "*" }));

app.use(express.json());

app.get("/", (_, res) => res.send("Kai backend running 🚀"));

app.use("/api", routes);

initSocket(server);

server.listen(ENV.PORT, "0.0.0.0", () => {
  console.log(`Server running on ${ENV.PORT}`);
});