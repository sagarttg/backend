import { Server } from "socket.io";

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    socket.on("join-meeting-room", ({ meetingId }) => {
      if (meetingId) socket.join(meetingId);
    });
  });

  return io;
}

export function getIO() {
  return io;
}