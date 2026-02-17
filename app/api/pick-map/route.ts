import { DooraySlashCommandRequest } from "@/domain/dooray/types";
import { MAP_CATALOG } from "@/domain/hots/constants";
import { sampleSize } from "es-toolkit";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body: DooraySlashCommandRequest = await request.json();
  const cnt = Number.parseInt(body.text);

  const maps = Object.values(MAP_CATALOG);

  const randomMap = sampleSize(maps, cnt);

  return Response.json({
    text: `[히오스 맵 ${cnt}개 뽑기 결과]`,
    attachments: randomMap.map((map) => ({
      thumbUrl: map.image,
      title: map.nameKo,
      titleLink: map.namuWikiUrl,
      text: map.description,
    })),
    responseType: "inChannel",
  });
}
