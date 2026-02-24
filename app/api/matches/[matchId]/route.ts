import { prisma } from "@/config/prisma";
import type { MatchHighlightItem } from "@/domain/hots/types/match-contract";
import { normalizeYoutubeUrlOrNull } from "@/domain/hots/utils/youtube";
import { NextRequest, NextResponse } from "next/server";

type MatchMetaResponse = {
  readonly matchId: string;
  readonly youtubeUrl: string | null;
  readonly highlights: ReadonlyArray<MatchHighlightItem>;
};

type UpdateMatchMetaRequest = {
  readonly youtubeUrl?: string | null;
};

type UpdateMatchMetaResponse = {
  readonly success: true;
  readonly matchId: string;
  readonly youtubeUrl: string | null;
};

function toHighlightItem(input: {
  id: string;
  seconds: number;
  note: string | null;
  createdAt: Date;
}): MatchHighlightItem {
  return {
    id: input.id,
    seconds: input.seconds,
    note: input.note,
    createdAt: input.createdAt.toISOString(),
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
): Promise<NextResponse<MatchMetaResponse | { error: string }>> {
  try {
    const { matchId } = await context.params;
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        youtubeUrl: true,
        highlights: {
          orderBy: [{ seconds: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            seconds: true,
            note: true,
            createdAt: true,
          },
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "존재하지 않는 내전입니다." }, { status: 404 });
    }

    return NextResponse.json(
      {
        matchId: match.id,
        youtubeUrl: match.youtubeUrl ?? null,
        highlights: match.highlights.map(toHighlightItem),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("내전 메타 조회 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
): Promise<NextResponse<UpdateMatchMetaResponse | { error: string }>> {
  try {
    const { matchId } = await context.params;
    const body: UpdateMatchMetaRequest = await request.json();

    if (!Object.hasOwn(body, "youtubeUrl")) {
      return NextResponse.json({ error: "youtubeUrl 필드를 전달해주세요." }, { status: 400 });
    }

    let normalizedYoutubeUrl: string | null;
    try {
      normalizedYoutubeUrl = normalizeYoutubeUrlOrNull(body.youtubeUrl ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "유효하지 않은 유튜브 링크입니다.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const exists = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json({ error: "존재하지 않는 내전입니다." }, { status: 404 });
    }

    await prisma.match.update({
      where: { id: matchId },
      data: {
        youtubeUrl: normalizedYoutubeUrl,
      },
    });

    return NextResponse.json(
      {
        success: true,
        matchId,
        youtubeUrl: normalizedYoutubeUrl,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("내전 메타 저장 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
