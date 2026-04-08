import fs from "fs";
import { transcriptHandler } from "./transcript.controller.js";

export async function audioHandler(req, res) {
  const { meetingId } = req.body;

  await transcriptHandler(
    {
      body: {
        meetingId,
        speaker: "candidate",
        text: "Candidate speaking...",
        isFinal: true,
      },
    },
    { json: () => {} }
  );

  fs.unlinkSync(req.file.path);

  res.json({ success: true });
}