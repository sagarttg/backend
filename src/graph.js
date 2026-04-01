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

export async function createTeamsMeeting(candidateEmail) {
  const token = await getAccessToken();

  // ✅ STEP 1: Create Teams meeting (same as before)
  const res = await axios.post(
    `https://graph.microsoft.com/v1.0/users/${process.env.ORGANIZER_EMAIL}/events`,
    {
      subject: "AI Interview",
      start: {
        dateTime: new Date(Date.now() + 5 * 60000).toISOString(),
        timeZone: "UTC"
      },
      end: {
        dateTime: new Date(Date.now() + 35 * 60000).toISOString(),
        timeZone: "UTC"
      },
      attendees: [
        {
          emailAddress: { address: candidateEmail },
          type: "required"
        }
      ],
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness"
    },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const joinUrl = res.data.onlineMeeting?.joinUrl;

  // ✅ STEP 2: SEND EMAIL MANUALLY (THIS FIXES YOUR ISSUE)
  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${process.env.ORGANIZER_EMAIL}/sendMail`,
    {
      message: {
        subject: "Your AI Interview Meeting Link",
        body: {
          contentType: "HTML",
          content: `
            <p>Your interview has been scheduled.</p>
            <p><b>Join here:</b></p>
            <a href="${joinUrl}">${joinUrl}</a>
          `
        },
        toRecipients: [
          {
            emailAddress: {
              address: candidateEmail
            }
          }
        ]
      }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return res.data;
}