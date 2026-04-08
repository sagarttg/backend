import { v4 as uuid } from "uuid";

export const candidates = {};

export function createCandidate(data) {
  const id = uuid();

  candidates[id] = {
    id,
    ...data,
    createdAt: new Date(),
  };

  return candidates[id];
}

export function getCandidateByEmail(email) {
  return Object.values(candidates).find((c) => c.email === email);
}