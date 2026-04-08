import { getNextQuestion } from "./ai.js";

export const meetings = {};

export async function createMeetingRecord(meetingId, payload) {
  const firstQuestion = await getNextQuestion({
    answer: "Start interview",
    history: []
  });

  meetings[meetingId] = {
    id: meetingId,
    candidate: payload.candidate,
    graphMeetingId: payload.graphMeetingId,
    joinUrl: payload.joinUrl,
    organizerId: payload.organizerId,
    answers: [],
    questions: [firstQuestion],
    liveTranscript: []
  };
}

export function getMeeting(meetingId) {
  return meetings[meetingId];
}