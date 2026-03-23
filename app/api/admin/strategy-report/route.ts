import { NextRequest, NextResponse } from "next/server";
import type { StrategyReportRequest, StrategyReportResponse } from "@/app/admin/strategy/types";
import { prisma } from "@/config/prisma";
import { buildStrategyReport, StrategyReportError } from "@/domain/hots/service/strategy-report";

export async function POST(
  request: NextRequest,
): Promise<NextResponse<StrategyReportResponse | { error: string }>> {
  try {
    const body = (await request.json().catch(() => null)) as StrategyReportRequest | null;
    if (!body) {
      return NextResponse.json({ error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
    }

    const report = await buildStrategyReport(prisma, body);
    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof StrategyReportError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("전략 리포트 생성 오류:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
