import { DooraySlashCommandRequest } from "@/domain/dooray/types";
import {
  MAPS,
  MAPS_IMAGE,
  MAPS_NAMUWIKI_URL,
} from "@/domain/hots/constants/maps";
import { sampleSize } from "es-toolkit";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body: DooraySlashCommandRequest = await request.json();
  const cnt = Number.parseInt(body.text);

  const maps = Object.entries(MAPS);

  const randomMap = sampleSize(maps, cnt);

  return Response.json({
    text: `[히오스 맵 ${cnt}개 뽑기 결과]`,
    attachments: randomMap.map(([key, title]) => ({
      thumbUrl: MAPS_IMAGE[key as keyof typeof MAPS_IMAGE],
      title: title,
      titleLink: MAPS_NAMUWIKI_URL[key as keyof typeof MAPS_NAMUWIKI_URL],
    })),
    responseType: "inChannel",
  });
}
