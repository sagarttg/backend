import { createCandidate } from "../store/candidates.store.js";

export function createCandidateHandler(req, res) {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email required" });
  }

  const candidate = createCandidate(req.body);
  res.json(candidate);
}