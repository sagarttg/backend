import OpenAI from "openai";
import { ENV } from "../config/env.js";

const openai = new OpenAI({
  apiKey: ENV.OPENAI_KEY
});

export async function getNextQuestion({ answer, history }) {
  try {
    const transcript = history
      .map((h, i) => `Q${i + 1}: ${h.q}\nA${i + 1}: ${h.a}`)
      .join("\n");

    const prompt = `
You are an AI interviewer.

Conversation:
${transcript || "None"}

Candidate said:
"${answer}"

Ask ONE short follow-up question.
`;

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 50,
      messages: [{ role: "user", content: prompt }]
    });

    return res.choices[0].message.content.trim();
  } catch (err) {
    console.error("AI ERROR:", err.message);
    return "Can you elaborate more?";
  }
}