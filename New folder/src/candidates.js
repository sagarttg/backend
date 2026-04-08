import crypto from "crypto";

export const candidates = {};

export function createCandidate(data) {
  const id = crypto.randomUUID();

  candidates[id] = {
    id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    age: data.age,
    address: data.address,
    createdAt: new Date()
  };

  return candidates[id];
}

export function getCandidateByEmail(email) {
  return Object.values(candidates).find(c => c.email === email);
}