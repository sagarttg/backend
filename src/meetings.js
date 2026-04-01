import { getNextQuestion } from "./ai.js";

export const meetings = {};

function extractJoinKey(joinUrl) {
  try {
    const url = new URL(joinUrl);
    return url.pathname;
  } catch {
    return joinUrl;
  }
}

export async function createMeetingRecord(meetingId, payload) {
  const firstQuestion = await getNextQuestion({
    answer: "Start interview",
    history: []
  });

  meetings[meetingId] = {
    id: meetingId,

    candidate: payload.candidate,

    graphEventId: payload.graphEventId,
    joinUrl: payload.joinUrl,
    joinKey: extractJoinKey(payload.joinUrl),

    answers: [],
    questions: [firstQuestion]
  };
}

export function getMeeting(meetingId) {
  return meetings[meetingId];
}