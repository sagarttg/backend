// import axios from "axios";

// export async function getNextQuestion({ answer, history }) {
//   try {
//     const conversation = history
//       .map((h, i) => `Q${i + 1}: ${h.q}\nA${i + 1}: ${h.a}`)
//       .join("\n");

//   const res = await axios.post(
//   "https://api.anthropic.com/v1/messages",
//   {
//     model: "claude-3-5-sonnet-latest",
//     max_tokens: 150,
//     messages: [
//       {
//         role: "user",
//         content: [
//           {
//             type: "text",
//             text: `You are an AI interviewer.

// Conversation:
// ${conversation}

// Candidate said: "${answer}"

// Ask ONE short follow-up question.`
//           }
//         ]
//       }
//     ]
//   },
//   {
//     headers: {
//       "x-api-key": process.env.CLAUDE_API_KEY,
//       "anthropic-version": "2023-06-01",
//       "Content-Type": "application/json"
//     }
//   }
// );

//     return res.data?.content?.[0]?.text?.trim() || "Can you elaborate more?";
//   } catch (err) {
//     console.error("AI ERROR:", err.response?.data || err.message);
//     return "Can you explain that further?";
//   }
// }




export async function getNextQuestion() {
  return "Tell me more about your experience.";
}