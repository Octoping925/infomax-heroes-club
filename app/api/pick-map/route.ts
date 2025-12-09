import { DoorayBotMessageSender } from "@/domain/dooray/sender";
import { DooraySlashCommandRequest } from "@/domain/dooray/types";
import { MAPS } from "@/domain/hots/constants/maps";
import { sampleSize } from "es-toolkit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body: DooraySlashCommandRequest = await request.json();
  const cnt = parseInt(body.text);

  const maps = Object.values(MAPS);

  const randomMap = sampleSize(maps, cnt);

  const text = [
    `히오스 맵 ${cnt}개 뽑기 결과: `,
    ...randomMap.map((it) => `- ${it}`),
  ].join("\n");

  const response = await DoorayBotMessageSender.url(body.responseUrl)
    .token(body.cmdToken)
    .body({
      text: text,
      responseType: "ephemeral",
      deleteOriginal: "true",
    })
    .send()
    .then((res) => res.text());

  console.log(text, response);

  return new NextResponse("success");
}
