import { v4 as uuid } from "uuid";
import axios from "axios";
import { saveMeeting } from "../store/meetings.store.js";
import { getNextQuestion } from "./ai.service.js";
import { ENV } from "../config/env.js";

export async function createMeeting(candidate, graphData) {
  const meetingId = uuid();

  const firstQuestion = await getNextQuestion({
    answer: "Start interview",
    history: [],
  });

  const meeting = {
    id: meetingId,
    candidate,
    graphMeetingId: graphData.id,
    joinUrl: graphData.joinWebUrl,
    questions: [firstQuestion],
    answers: [],
    liveTranscript: [],
  };

  saveMeeting(meetingId, meeting);

  // // trigger bot join
  // try {
  //   await axios.post(ENV.BOT_JOIN_URL, {
  //     meetingId,
  //     joinUrl: meeting.joinUrl
  //   });
  // } catch (err) {
  //   console.error("BOT JOIN FAILED:", err.message);
  // }

  return meeting;
}
