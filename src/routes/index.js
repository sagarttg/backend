import express from "express";
import multer from "multer";

import { createCandidateHandler } from "../controllers/candidate.controller.js";
import {
  createMeetingHandler,
  getMeetingHandler,
  resolveMeetingHandler,
} from "../controllers/meeting.controller.js";
import { transcriptHandler } from "../controllers/transcript.controller.js";
import { audioHandler } from "../controllers/audio.controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/candidate", createCandidateHandler);
router.post("/create-meeting", createMeetingHandler);
router.post("/transcript-chunk", transcriptHandler);

router.post("/resolve-meeting", resolveMeetingHandler);
router.get("/meeting/:meetingId", getMeetingHandler);

/* 🔥 AUDIO */
router.post("/audio", upload.single("audio"), audioHandler);

export default router;