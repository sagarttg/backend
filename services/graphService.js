const axios = require("axios");
const { getAccessToken } = require("../config/auth");

async function createMeeting() {
  const organizerId = process.env.ORGANIZER_OBJECT_ID;
  const token = await getAccessToken();

  if (!organizerId) {
    throw new Error("Missing ORGANIZER_OBJECT_ID");
  }

  const start = new Date();
  const end = new Date(Date.now() + 60 * 60 * 1000);

  const body = {
    subject: "AI Interview Session",
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
  };

  const response = await axios.post(
    `https://graph.microsoft.com/v1.0/users/${organizerId}/onlineMeetings`,
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

module.exports = { createMeeting };