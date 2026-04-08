import axios from "axios";

export async function getAccessToken() {
  const res = await axios.post(
    `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials"
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  );

  return res.data.access_token;
}

export async function createTeamsMeeting() {
  const token = await getAccessToken();

  const start = new Date(Date.now() + 5 * 60 * 1000);
  const end = new Date(Date.now() + 35 * 60 * 1000);

  const res = await axios.post(
    `https://graph.microsoft.com/v1.0/users/${process.env.ORGANIZER_EMAIL}/onlineMeetings`,
    {
      subject: "AI Interview",
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString()
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );

  return res.data;
}