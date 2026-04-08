import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

export async function getNextQuestion({ answer, history }) {
  const transcript = history
    .map((h, i) => `Q${i + 1}: ${h.q}\nA${i + 1}: ${h.a}`)
    .join("\n");

  const prompt = `
Conversation:
${transcript || "None"}

Candidate said:
"${answer}"

Ask ONE short question.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 50,
  });

  return res.choices[0].message.content.trim();
}