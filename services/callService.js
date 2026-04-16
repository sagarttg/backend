const axios = require("axios");
const { getAccessToken } = require("../config/auth");

async function joinMeetingWithBot({ threadId, organizerId, tenantId, callbackUri }) {
  if (!threadId) throw new Error("threadId is required");
  if (!organizerId) throw new Error("organizerId is required");
  if (!tenantId) throw new Error("tenantId is required");
  if (!callbackUri) throw new Error("callbackUri is required");

  const token = await getAccessToken();

  const url = "https://graph.microsoft.com/v1.0/communications/calls";

  const body = {
    "@odata.type": "#microsoft.graph.call",
    callbackUri,
    requestedModalities: ["audio"],
    mediaConfig: {
      "@odata.type": "#microsoft.graph.serviceHostedMediaConfig",
    },
    chatInfo: {
      "@odata.type": "#microsoft.graph.chatInfo",
      threadId,
      messageId: "0",
    },
    meetingInfo: {
      "@odata.type": "#microsoft.graph.organizerMeetingInfo",
      organizer: {
        "@odata.type": "#microsoft.graph.identitySet",
        user: {
          "@odata.type": "#microsoft.graph.identity",
          id: organizerId,
        },
      },
    },
    tenantId,
  };

  const response = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  console.log("Bot join request sent. Call ID:", response.data.id);

  return response.data;
}

module.exports = { joinMeetingWithBot };