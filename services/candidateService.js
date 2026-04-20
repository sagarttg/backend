const { v4: uuidv4 } = require("uuid");

const candidates = {};

// CREATE CANDIDATE
function createCandidate(data) {
  const id = uuidv4();

  candidates[id] = {
    id,
    name: data.name,
    email: data.email,
    password: data.password,
    questionBank: data.questionBank || [],
    resumeData: data.resumeData || {},

    meetingId: data.meetingId, // ✅ ONLY SOURCE OF TRUTH
    transcript: [],
  };

  return candidates[id];
}

// FIND BY MEETING / THREAD ID (SAME THING)
function getCandidateByMeetingId(threadId) {
  return Object.values(candidates).find(
    (c) =>
      c.meetingId === threadId ||
      threadId.includes(c.meetingId) ||
      c.meetingId.includes(threadId)
  );
}

// ADD TRANSCRIPT
function addTranscript(meetingId, text) {
  const candidate = getCandidateByMeetingId(meetingId);
  if (!candidate) return null;

  candidate.transcript.push(text);
  return candidate;
}

module.exports = {
  createCandidate,
  getCandidateByMeetingId,
  addTranscript,
};