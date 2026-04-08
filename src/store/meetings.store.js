export const meetings = {};

export function saveMeeting(id, data) {
  meetings[id] = data;
}

export function getMeeting(id) {
  return meetings[id];
}

export function getLatestMeeting() {
  const all = Object.values(meetings);
  return all[all.length - 1];
}