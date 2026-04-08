import { v4 as uuid } from "uuid";
import { saveMeeting } from "../store/meetings.store.js";
import { getNextQuestion } from "./ai.service.js";

export async function createMeeting(candidate, graphData) {
  const meetingId = uuid();

  const firstQuestion = await getNextQuestion({
    answer: "Start interview",
    history: [],
  });

  const meeting = {
    id: meetingId,
    candidate,
    joinUrl: graphData?.joinWebUrl || "LOCAL_LINK",
    questions: [firstQuestion],
    answers: [],
    liveTranscript: [],
  };

  saveMeeting(meetingId, meeting);

  return meeting;
}