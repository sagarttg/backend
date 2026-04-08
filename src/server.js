import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";

import routes from "./routes/index.js";
import { initSocket } from "./utils/socket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (_, res) => res.send("Backend running 🚀"));

app.use("/api", routes);

initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});