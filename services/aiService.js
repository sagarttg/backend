const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const generateNextQuestion = async (question, answer) => {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
You are a technical interviewer.

Rules:
- Ask ONE short question
- Follow up based on answer
- No explanation
        `,
      },
      {
        role: "user",
        content: `
Q: ${question}
A: ${answer}
Next:
        `,
      },
    ],
  });

  return res.choices[0].message.content.trim();
};

module.exports = { generateNextQuestion };