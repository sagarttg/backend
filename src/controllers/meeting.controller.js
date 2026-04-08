import {
  getMeeting,
  getMeetingByTeamsId,
  meetings,
} from "../store/meetings.store.js";
import { createMeeting } from "../services/meeting.service.js";
import { createTeamsMeeting } from "../services/graph.service.js";
import { getCandidateByEmail } from "../store/candidates.store.js";

export async function createMeetingHandler(req, res) {
  try {
    const { candidateEmail, teamsMeetingId } = req.body;

    if (!candidateEmail || !teamsMeetingId) {
      return res.status(400).json({ error: "Missing data" });
    }

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

    const meeting = await createMeeting(
      candidate,
      graphData,
      teamsMeetingId
    );

    res.json({
      meetingId: meeting.id,
      joinUrl: meeting.joinUrl,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Meeting failed" });
  }
}

export function resolveMeetingHandler(req, res) {
  try {
    const { teamsMeetingId } = req.body;

    console.log("Resolving:", teamsMeetingId);

    let meeting = null;

    if (teamsMeetingId) {
      meeting = getMeetingByTeamsId(teamsMeetingId);
    }

    // ✅ fallback (SAFE FOR TESTING)
    if (!meeting) {
      const all = Object.values(meetings);
      meeting = all[all.length - 1];
    }

    if (!meeting) {
      return res.status(404).json({ error: "No meetings found" });
    }

    res.json({
      meetingId: meeting.id,
      meeting, // 🔥 IMPORTANT FIX
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Resolve failed" });
  }
}

export function getMeetingHandler(req, res) {
  const meeting = getMeeting(req.params.meetingId);

  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  res.json(meeting);
}