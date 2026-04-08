export const meetings = {};

export function saveMeeting(id, data) {
  meetings[id] = data;
}

export function getMeeting(id) {
  return meetings[id];
}

export function getMeetingByJoinUrl(joinUrl) {
  return Object.values(meetings).find((m) => m.joinUrl === joinUrl);
}