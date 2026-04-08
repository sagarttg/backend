import fs from "fs";
import { transcriptHandler } from "./transcript.controller.js";

export async function audioHandler(req, res) {
  try {
    const { meetingId } = req.body;

    if (!meetingId || !req.file) {
      return res.status(400).json({ error: "Missing audio" });
    }

    const text = "Candidate speaking..."; // fake for now

    await transcriptHandler(
      {
        body: {
          meetingId,
          speaker: "candidate",
          text,
          isFinal: true,
        },
      },
      {
        json: () => {},
        status: () => ({ json: () => {} }),
      }
    );

    fs.unlinkSync(req.file.path); // cleanup

    res.json({ success: true });
  } catch (err) {
    console.error("AUDIO ERROR:", err.message);
    res.status(500).json({ error: "Audio failed" });
  }
}