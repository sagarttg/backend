import { getCandidateByEmail } from "../store/candidates.store.js";
import { createTeamsMeeting } from "../services/graph.service.js";
import { createMeeting } from "../services/meeting.service.js";
import { getMeeting, getMeetingByJoinUrl } from "../store/meetings.store.js";

export async function createMeetingHandler(req, res) {
  try {
    const { candidateEmail } = req.body;

    const candidate = getCandidateByEmail(candidateEmail);
    if (!candidate)
      return res.status(404).json({ error: "Candidate not found" });

    const graphData = await createTeamsMeeting();
    const meeting = await createMeeting(candidate, graphData);

    res.json({
      meetingId: meeting.id,
      joinUrl: meeting.joinUrl,
    });
  } catch (err) {
    console.error("MEETING ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "Meeting failed" });
  }
}

export function getMeetingHandler(req, res) {
  const meeting = getMeeting(req.params.meetingId);

  if (!meeting)
    return res.status(404).json({ error: "Meeting not found" });

  res.json({
    id: meeting.id,
    joinUrl: meeting.joinUrl,
    candidate: meeting.candidate,
    questions: meeting.questions,
    answers: meeting.answers,
    transcript: meeting.liveTranscript,
  });
}

export function resolveMeetingHandler(req, res) {
  const { joinUrl, teamsMeetingId, chatId } = req.body;

  let meeting = null;

  // 1. Try joinUrl
  if (joinUrl) {
    meeting = getMeetingByJoinUrl(joinUrl);
  }

  // 2. Try Teams meeting ID
  if (!meeting && teamsMeetingId) {
    meeting = Object.values(meetings).find(
      (m) => m.graphMeetingId === teamsMeetingId
    );
  }

  // 3. Last fallback (dev only)
  if (!meeting && chatId) {
    meeting = Object.values(meetings)[0];
  }

  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  res.json({
    meetingId: meeting.id,
    meeting,
  });
}