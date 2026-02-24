import { prisma } from "@/config/prisma";
import type { MatchHighlightItem } from "@/domain/hots/types/match-contract";
import { buildYoutubeTimestampUrl } from "@/domain/hots/utils/youtube";
import { NextRequest, NextResponse } from "next/server";

const MAX_HIGHLIGHT_SECONDS = 8 * 60 * 60;

type MatchHighlightsResponse = {
  readonly matchId: string;
  readonly youtubeUrl: string | null;
  readonly highlights: ReadonlyArray<MatchHighlightItem>;
};

type CreateMatchHighlightRequest = {
  readonly seconds?: number;
  readonly note?: string | null;
};

type CreateMatchHighlightResponse = {
  readonly success: true;
  readonly highlight: MatchHighlightItem;
  readonly youtubeTimestampUrl: string | null;
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

function normalizeNote(input: string | null | undefined): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateSeconds(input: number | undefined): number | null {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return null;
  }

  const normalized = Math.floor(input);
  if (normalized < 0 || normalized > MAX_HIGHLIGHT_SECONDS) {
    return null;
  }

  return normalized;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
): Promise<NextResponse<MatchHighlightsResponse | { error: string }>> {
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
    console.error("내전 하이라이트 조회 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
): Promise<NextResponse<CreateMatchHighlightResponse | { error: string }>> {
  try {
    const { matchId } = await context.params;
    const body: CreateMatchHighlightRequest = await request.json();
    const seconds = validateSeconds(body.seconds);

    if (seconds === null) {
      return NextResponse.json(
        { error: `seconds는 0 이상 ${MAX_HIGHLIGHT_SECONDS} 이하의 정수여야 합니다.` },
        { status: 400 },
      );
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        youtubeUrl: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: "존재하지 않는 내전입니다." }, { status: 404 });
    }

    const created = await prisma.matchHighlight.create({
      data: {
        matchId,
        seconds,
        note: normalizeNote(body.note),
      },
      select: {
        id: true,
        seconds: true,
        note: true,
        createdAt: true,
      },
    });

    const highlight = toHighlightItem(created);
    const youtubeTimestampUrl =
      match.youtubeUrl && match.youtubeUrl.length > 0
        ? buildYoutubeTimestampUrl(match.youtubeUrl, highlight.seconds)
        : null;

    return NextResponse.json(
      {
        success: true,
        highlight,
        youtubeTimestampUrl,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("내전 하이라이트 저장 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
