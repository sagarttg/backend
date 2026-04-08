import axios from "axios";
import { ENV } from "../config/env.js";

let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  // reuse token if valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const res = await axios.post(
    `https://login.microsoftonline.com/${ENV.TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: ENV.CLIENT_ID,
      client_secret: ENV.CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  cachedToken = res.data.access_token;

  // expire slightly early (safe buffer)
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;

  return cachedToken;
}

export async function createTeamsMeeting() {
  try {
    const token = await getAccessToken();

    const start = new Date(Date.now() + 5 * 60000);
    const end = new Date(Date.now() + 35 * 60000);

    const res = await axios.post(
      `https://graph.microsoft.com/v1.0/users/${ENV.ORGANIZER_OBJECT_ID}/onlineMeetings`,
      {
        subject: "AI Interview",
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        participants: {
          organizer: {
            identity: {
              user: {
                id: ENV.ORGANIZER_OBJECT_ID,
              },
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return res.data;
  } catch (err) {
    console.error("GRAPH ERROR:", err.response?.data || err.message);
    throw err;
  }
}
