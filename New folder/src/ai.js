import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

export async function getNextQuestion({ answer, history }) {
  try {
    const transcript = history
      .map((h, i) => `Q${i + 1}: ${h.q}\nA${i + 1}: ${h.a}`)
      .join("\n");

    const prompt = `
You are an expert interviewer.
Based on the previous interview context and the latest candidate response, ask exactly one short, relevant follow-up interview question.

Previous conversation:
${transcript || "None"}

Latest candidate answer:
${answer}

Rules:
- Ask only one question
- Keep it short
- Make it specific
- No explanations
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 60,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return response.choices?.[0]?.message?.content?.trim() || "Can you elaborate on that?";
  } catch (err) {
    console.error("OPENAI ERROR:", err?.message || err);
    return "Can you elaborate on that?";
  }
}