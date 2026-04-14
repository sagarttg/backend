const axios = require("axios");
const { getAccessToken } = require("../config/auth");

const createMeeting = async () => {
  try {
    const token = await getAccessToken();

    const organizer = process.env.ORGANIZER_OBJECT_ID;

    const url = `https://graph.microsoft.com/v1.0/users/${organizer}/onlineMeetings`;

    const body = {
      subject: "AI Interview Session",
      startDateTime: new Date().toISOString(),
      endDateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    const res = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return res.data;

  } catch (err) {
    console.error(err.response?.data || err.message);
    throw err;
  }
};
module.exports = { createMeeting };