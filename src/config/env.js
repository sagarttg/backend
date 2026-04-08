import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  OPENAI_KEY: process.env.OPENAI_KEY,

  TENANT_ID: process.env.TENANT_ID,
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  ORGANIZER_OBJECT_ID: process.env.ORGANIZER_OBJECT_ID,

  BOT_JOIN_URL: process.env.BOT_JOIN_URL,
};