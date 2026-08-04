import { TIPS } from "@/app/api/hots-tip/tips";
import { INFOMAX_HOTS_CLUB_MESSAGE_ROOM } from "@/domain/dooray/room";
import { sendDoorayBotMessage } from "@/domain/dooray/sender";
import { sampleSize } from "es-toolkit";
import { NextResponse } from "next/server";

const BOT_TARGET_ROOM = INFOMAX_HOTS_CLUB_MESSAGE_ROOM; // MYC_TEST_MESSAGE_ROOM;

const BOT_ICON_IMAGE = "https://infomax.dooray.com/messenger/v1/api/apps/4058807707438101450/icon/4168246310654965318";

export async function GET() {
  const tips = sampleSize(TIPS, 4);

  await sendDoorayBotMessage(BOT_TARGET_ROOM, {
    botName: "히오스 팁 봇",
    botIconImage: BOT_ICON_IMAGE,
    text: ["[오늘의 히오스 팁]", ...tips.map((tip) => `- ${tip}`)].join("\n"),
  });

  return new NextResponse("success");
}
