import { getCandidateByEmail } from "../store/candidates.store.js";
import { createMeeting } from "../services/meeting.service.js";
import { getMeeting, getLatestMeeting } from "../store/meetings.store.js";
import { createTeamsMeeting } from "../services/graph.service.js";

export async function createMeetingHandler(req, res) {
  try {
    const { candidateEmail } = req.body;

    const candidate = getCandidateByEmail(candidateEmail);
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    let graphData = {};
    try {
      graphData = await createTeamsMeeting();
    } catch {
      console.warn("Graph skipped");
    }

    const meeting = await createMeeting(candidate, graphData);

    res.json({
      meetingId: meeting.id,
      joinUrl: meeting.joinUrl,
    });
  } catch (err) {
    res.status(500).json({ error: "Meeting failed" });
  }
}

export function resolveMeetingHandler(req, res) {
  const meeting = getLatestMeeting();

  if (!meeting) {
    return res.status(404).json({ error: "No meetings found" });
  }

  res.json({
    meetingId: meeting.id,
    meeting,
  });
}

export function getMeetingHandler(req, res) {
  const meeting = getMeeting(req.params.meetingId);

  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  res.json(meeting);
}
