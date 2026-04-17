const { v4: uuidv4 } = require("uuid");

const candidates = {};

function createCandidate(data) {
  const id = uuidv4();

  candidates[id] = {
    id,
    name: data.name,
    email: data.email,
    password: data.password,

    // ✅ structured question bank
    questionBank: data.questionBank || [],

    // ✅ structured resume
    resumeData: data.resumeData || {},

    meetingId: null,
    transcript: [],
  };

  return candidates[id];
}

function attachMeeting(candidateId, meetingId) {
  if (candidates[candidateId]) {
    candidates[candidateId].meetingId = meetingId;
  }
}

function getCandidateByMeetingId(meetingId) {
  return Object.values(candidates).find(
    (c) => c.meetingId === meetingId
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