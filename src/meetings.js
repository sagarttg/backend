// export const meetings = {};

// export function createMeetingRecord(meetingId, candidateEmail) {
//   meetings[meetingId] = {
//     candidateEmail,
//     answers: [],
//     questions: [
//       "Tell me about yourself",
//       "Explain your recent project",
//       "What are your strengths?"
//     ]
//   };
// }

// export function getMeeting(meetingId) {
//   return meetings[meetingId];
// }

export const meetings = {};

function extractJoinKey(joinUrl) {
  try {
    const url = new URL(joinUrl);
    return url.pathname;
  } catch {
    return joinUrl;
  }
}

export function createMeetingRecord(meetingId, payload) {
  meetings[meetingId] = {
    id: meetingId,
    candidateEmail: payload.candidateEmail,
    candidateName: payload.candidateEmail.split("@")[0], // simple name

    graphEventId: payload.graphEventId,
    joinUrl: payload.joinUrl,
    joinKey: extractJoinKey(payload.joinUrl),

    answers: [],
    questions: [
      "Tell me about yourself",
      "Explain your recent project",
      "What are your strengths?"
    ]
  };
}
export function getMeeting(meetingId) {
  return meetings[meetingId];
}