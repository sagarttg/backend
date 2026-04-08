export const meetings = {};

export function saveMeeting(id, data) {
  meetings[id] = data;
}

export function getMeeting(id) {
  return meetings[id];
}

export function getMeetingByTeamsId(teamsMeetingId) {
  return Object.values(meetings).find(
    (m) => m.teamsMeetingId === teamsMeetingId
  );
}