import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/prisma";
import { buildDoorayMatchupBotMessage } from "@/domain/dooray/matchup-message";
import { INFOMAX_HOTS_CLUB_MESSAGE_ROOM, MYC_TEST_MESSAGE_ROOM } from "@/domain/dooray/room";
import { sendDoorayBotMessage } from "@/domain/dooray/sender";
import { buildMatchupPreview, MatchupPreviewError } from "@/domain/hots/service/matchup-preview";
import type { MatchType } from "@/generated/prisma/client";

type AnnounceRoomKey = "club" | "test";

interface MatchupAnnounceRequest {
  readonly teamANicknames: ReadonlyArray<string>;
  readonly teamBNicknames: ReadonlyArray<string>;
  readonly matchType?: MatchType;
  readonly leaderANickname?: string | null;
  readonly leaderBNickname?: string | null;
  readonly room?: AnnounceRoomKey;
}

const ROOM_URLS: Record<AnnounceRoomKey, string> = {
  club: INFOMAX_HOTS_CLUB_MESSAGE_ROOM,
  test: MYC_TEST_MESSAGE_ROOM,
};

/**
 * 관리자 전용 두레이 매치업 대진표 공지 발송
 * POST /api/admin/matchup-announce
 */
export async function POST(request: NextRequest): Promise<NextResponse<{ ok: true; room: AnnounceRoomKey } | { error: string }>> {
  try {
    const body = (await request.json().catch(() => null)) as MatchupAnnounceRequest | null;
    if (!body) {
      return NextResponse.json({ error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
    }

    const room: AnnounceRoomKey = body.room === "club" ? "club" : "test";
    const matchType: MatchType = body.matchType === "DINNER" ? "DINNER" : "LUNCH";

    const preview = await buildMatchupPreview(prisma, {
      teamANicknames: body.teamANicknames ?? [],
      teamBNicknames: body.teamBNicknames ?? [],
      matchType,
      leaderANickname: body.leaderANickname ?? null,
      leaderBNickname: body.leaderBNickname ?? null,
    });

    const previewUrl = new URL("/matchup", request.url);
    previewUrl.searchParams.set("a", preview.teamA.roster.map((p) => p.playerNickname).join(","));
    previewUrl.searchParams.set("b", preview.teamB.roster.map((p) => p.playerNickname).join(","));
    previewUrl.searchParams.set("type", preview.matchType);
    if (body.leaderANickname) previewUrl.searchParams.set("leaderA", body.leaderANickname);
    if (body.leaderBNickname) previewUrl.searchParams.set("leaderB", body.leaderBNickname);

    const botMessage = buildDoorayMatchupBotMessage(preview, previewUrl.toString());
    const response = await sendDoorayBotMessage(ROOM_URLS[room], botMessage);

    if (!response.ok) {
      return NextResponse.json(
        { error: `두레이 전송에 실패했습니다. (HTTP ${response.status})` },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { ok: true, room },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    if (err instanceof MatchupPreviewError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("두레이 매치업 공지 전송 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
