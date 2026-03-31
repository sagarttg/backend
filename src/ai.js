import axios from "axios";

export async function getNextQuestion(answer) {
  if (!answer || answer.trim().length === 0) {
    return "Can you tell me more about your experience?";
  }

  try {
    const res = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-5-sonnet-latest",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: `You are an AI interviewer. 
Based on this candidate answer:

"${answer}"

Ask ONE short, relevant follow-up interview question.
Return ONLY the question. No explanation.`,
          },
        ],
      },
      {
        headers: {
          "x-api-key": process.env.CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        timeout: 10000, // ⏱ prevents hanging
      },
    );

    const text = res.data?.content?.[0]?.text;

    console.log(res.data,'sagar')

    return text?.trim() || "Can you elaborate more on that?";
  } catch (err) {
    console.error("AI ERROR:", err.response?.data || err.message);

    return "Can you explain that in more detail?";
  }
}
