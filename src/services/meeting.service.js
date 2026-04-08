import { v4 as uuid } from "uuid";
import { saveMeeting } from "../store/meetings.store.js";
import { getNextQuestion } from "./ai.service.js";

export async function createMeeting(candidate, graphData, teamsMeetingId) {
  const meetingId = uuid();

  const firstQuestion = await getNextQuestion({
    answer: "Start interview",
    history: [],
  });

 const meeting = {
  id: meetingId,
  candidate,

  // 🔥 KEY FIX
  teamsMeetingId: graphData.joinWebUrl,

  graphMeetingId: graphData.id,
  joinUrl: graphData.joinWebUrl,

  questions: [firstQuestion],
  answers: [],
  liveTranscript: [],
};

  saveMeeting(meetingId, meeting);

  return meeting;
}
