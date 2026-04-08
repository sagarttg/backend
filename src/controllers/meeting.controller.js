import { getCandidateByEmail } from "../store/candidates.store.js";
import { createTeamsMeeting } from "../services/graph.service.js";
import { createMeeting } from "../services/meeting.service.js";
import { getMeeting, getMeetingByTeamsId } from "../store/meetings.store.js";

export async function createMeetingHandler(req, res) {
  try {
    const { candidateEmail, teamsMeetingId } = req.body;

    if (!teamsMeetingId) {
      return res.status(400).json({ error: "teamsMeetingId required" });
    }

    const candidate = getCandidateByEmail(candidateEmail);
    if (!candidate)
      return res.status(404).json({ error: "Candidate not found" });

    const graphData = await createTeamsMeeting();

    const meeting = await createMeeting(candidate, graphData, teamsMeetingId);

    res.json({
      meetingId: meeting.id,
      joinUrl: meeting.joinUrl,
    });
  } catch (err) {
    console.error("MEETING ERROR:", err.message);
    res.status(500).json({ error: "Meeting failed" });
  }
}

export function getMeetingHandler(req, res) {
  const meeting = getMeeting(req.params.meetingId);

  if (!meeting) return res.status(404).json({ error: "Meeting not found" });

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
  try {
    const { teamsMeetingId } = req.body;

    if (!teamsMeetingId) {
      return res.status(400).json({ error: "teamsMeetingId required" });
    }

    const meeting = getMeetingByTeamsId(teamsMeetingId);

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json({
      meetingId: meeting.id,
      meeting,
    });
  } catch (err) {
    console.error("RESOLVE ERROR:", err.message);
    res.status(500).json({ error: "Resolve failed" });
  }
}
