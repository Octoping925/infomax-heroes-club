import { DooraySlashCommandRequest } from "@/domain/dooray/types";
import { MAPS } from "@/domain/hots/constants/maps";
import { sampleSize } from "es-toolkit";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body: DooraySlashCommandRequest = await request.json();
  const cnt = parseInt(body.text);

  const maps = Object.values(MAPS);

  const randomMap = sampleSize(maps, cnt);

  const text = [
    `히오스 맵 ${cnt}개 뽑기 결과: `,
    ...randomMap.map((it) => `- ${it}`),
  ].join("\n");

  return Response.json({
    text,
    responseType: "inChannel",
  });
}
