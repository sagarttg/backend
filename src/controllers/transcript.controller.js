import { getMeeting } from "../store/meetings.store.js";
import { getNextQuestion } from "../services/ai.service.js";
import { getIO } from "../utils/socket.js";

export async function transcriptHandler(req, res) {
  const { meetingId, speaker, text, isFinal } = req.body;

  const meeting = getMeeting(meetingId);
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });

  const chunk = { speaker, text, isFinal };
  meeting.liveTranscript.push(chunk);

  const io = getIO();
  io.to(meetingId).emit("transcript-update", chunk);

  if (isFinal) {
    meeting.answers.push(text);

    const history = meeting.questions.map((q, i) => ({
      q,
      a: meeting.answers[i] || "",
    }));

    const nextQuestion = await getNextQuestion({ answer: text, history });

    meeting.questions.push(nextQuestion);
    io.to(meetingId).emit("next-question", { nextQuestion });
  }

  res.json({ success: true });
}