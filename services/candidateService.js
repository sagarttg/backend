const { v4: uuidv4 } = require("uuid");

const candidates = {};

function createCandidate(data) {
  const id = uuidv4();

  candidates[id] = {
    id,
    name: data.name,
    email: data.email,
    password: data.password,
    questionBank: data.questionBank || [],
    resumeData: data.resumeData || {},

    threadId: data.threadId || null, // ✅ store threadId
    transcript: [],
  };

  return candidates[id];
}
function attachMeeting(candidateId, threadId) {
  if (candidates[candidateId]) {
    candidates[candidateId].threadId = threadId;
  }
}

function getCandidateByMeetingId(threadId) {
  return Object.values(candidates).find(
    (c) => c.threadId === threadId
  );
}

function addTranscript(meetingId, text) {
  const candidate = getCandidateByMeetingId(meetingId);
  if (!candidate) return null;

  candidate.transcript.push(text);
  return candidate;
}

module.exports = {
  createCandidate,
  attachMeeting,
  getCandidateByMeetingId,
  addTranscript,
};