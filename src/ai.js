import axios from "axios";

export async function getNextQuestion(answer) {
  const res = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-3-sonnet-20240229",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Candidate answered: "${answer}". Suggest next interview question.`
        }
      ]
    },
    {
      headers: {
        "x-api-key": process.env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      }
    }
  );

  return res.data.content[0].text;
}