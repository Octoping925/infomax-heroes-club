"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import dayjs from "dayjs";
import type { MatchupPreviewResponse } from "@/domain/hots/service/matchup-preview";
import { HeroRoleLabelMap } from "@/domain/hots/models";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

interface Props {
  readonly preview: MatchupPreviewResponse;
}

export function MatchupPosterGenerator({ preview }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPending, startTransition] = useTransition();
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    startTransition(() => {
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      drawMatchupPoster(ctx, preview);
    });
  }, [preview]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">대진표 포스터 미리보기</h3>
          <p className="text-xs text-gray-400">두레이·카톡에 바로 올릴 수 있는 1200×630 PNG 카드입니다.</p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            try {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const dataUrl = canvas.toDataURL("image/png");
              const link = document.createElement("a");
              link.href = dataUrl;
              link.download = `matchup-${dayjs().format("YYYYMMDD")}.png`;
              link.click();
              setDownloadError(null);
            } catch (err) {
              setDownloadError(err instanceof Error ? err.message : "PNG 저장에 실패했습니다.");
            }
          }}
          className="min-h-11 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50"
        >
          PNG 다운로드
        </button>
      </div>

      {downloadError && <p className="text-sm text-rose-200">{downloadError}</p>}

      <div className="overflow-hidden rounded-[14px] border border-white/10 bg-black/40">
        <canvas ref={canvasRef} className="h-auto w-full" />
      </div>
    </div>
  );
}

function drawMatchupPoster(ctx: CanvasRenderingContext2D, preview: MatchupPreviewResponse) {
  ctx.fillStyle = "#0a0a12";
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Subtle top bar hairline
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  ctx.fillRect(0, 0, CARD_WIDTH, 118);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 118);
  ctx.lineTo(CARD_WIDTH, 118);
  ctx.stroke();

  const typeLabel = preview.matchType === "LUNCH" ? "점심 내전" : "저녁 내전";

  ctx.fillStyle = "#22d3ee";
  ctx.font = "600 18px sans-serif";
  ctx.fillText("INFOMAX HEROES CLUB · MATCHUP PREVIEW", 56, 48);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 36px sans-serif";
  ctx.fillText(`${typeLabel} 대진표`, 56, 94);

  ctx.fillStyle = "#9ca3af";
  ctx.font = "500 18px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(dayjs().format("YYYY.MM.DD"), CARD_WIDTH - 56, 90);
  ctx.textAlign = "left";

  // Win probability bar
  const barX = 56;
  const barY = 144;
  const barW = CARD_WIDTH - 112;
  const barH = 38;
  const splitW = Math.round((barW * preview.probability.teamA) / 100);

  drawRoundedRect(ctx, barX, barY, barW, barH, 10, "rgba(255, 255, 255, 0.08)");
  drawRoundedRect(ctx, barX, barY, Math.max(splitW, 16), barH, 10, "#06b6d4");

  ctx.fillStyle = "#000000";
  ctx.font = "700 19px sans-serif";
  ctx.fillText(`TEAM A  ${preview.probability.teamA}%`, barX + 18, barY + 26);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "right";
  ctx.fillText(`${preview.probability.teamB}%  TEAM B`, barX + barW - 18, barY + 26);
  ctx.textAlign = "left";

  // Two team panels
  const colY = 204;
  const colW = 528;
  const colH = 264;
  drawTeamBox(ctx, barX, colY, colW, colH, "TEAM A", "#22d3ee", preview.teamA);
  drawTeamBox(ctx, barX + colW + 32, colY, colW, colH, "TEAM B", "#f5b971", preview.teamB);

  // Storylines footer panel
  const storyY = 488;
  const storyH = 108;
  drawRoundedRect(ctx, barX, storyY, barW, storyH, 14, "rgba(255, 255, 255, 0.03)");
  strokeRoundedRect(ctx, barX, storyY, barW, storyH, 14, "rgba(255, 255, 255, 0.1)");

  ctx.fillStyle = "#9ca3af";
  ctx.font = "600 15px sans-serif";
  ctx.fillText("오늘의 관전 포인트", barX + 22, storyY + 28);

  const stories = preview.storylines.slice(0, 2);
  if (stories.length === 0) {
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "500 18px sans-serif";
    ctx.fillText("새로운 조합의 맞대결! 오늘 점심 승자는 어느 팀일까요?", barX + 22, storyY + 66);
  } else {
    stories.forEach((story, index) => {
      const y = storyY + 58 + index * 32;
      ctx.fillStyle = "#67e8f9";
      ctx.font = "700 16px sans-serif";
      ctx.fillText(`[${story.badge}]`, barX + 22, y);

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 17px sans-serif";
      const line = `${story.title} — ${story.detail}`;
      ctx.fillText(truncateText(ctx, line, barW - 150), barX + 128, y);
    });
  }
}

function drawTeamBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  accent: string,
  team: MatchupPreviewResponse["teamA"],
) {
  drawRoundedRect(ctx, x, y, w, h, 14, "rgba(255, 255, 255, 0.03)");
  strokeRoundedRect(ctx, x, y, w, h, 14, "rgba(255, 255, 255, 0.1)");

  // Left accent rail
  ctx.fillStyle = accent;
  ctx.fillRect(x, y + 16, 5, h - 32);

  ctx.fillStyle = accent;
  ctx.font = "700 20px sans-serif";
  ctx.fillText(title, x + 22, y + 36);

  ctx.fillStyle = "#9ca3af";
  ctx.font = "500 15px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`최근 평균 ${team.averageRecentWinRate}% · 통산 ${team.averageOverallWinRate}%`, x + w - 20, y + 35);
  ctx.textAlign = "left";

  team.roster.forEach((member, idx) => {
    const rowY = y + 72 + idx * 38;
    if (idx > 0) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.beginPath();
      ctx.moveTo(x + 22, rowY - 24);
      ctx.lineTo(x + w - 20, rowY - 24);
      ctx.stroke();
    }

    const role = member.primaryRole ? HeroRoleLabelMap[member.primaryRole] : "-";
    const prefix = member.isLeader ? "★ " : "";
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 19px sans-serif";
    ctx.fillText(`${prefix}${member.playerNickname}`, x + 22, rowY);

    ctx.fillStyle = "#9ca3af";
    ctx.font = "500 15px sans-serif";
    ctx.fillText(role, x + 240, rowY);

    ctx.fillStyle = member.recentStats.winRate >= 50 ? "#a7f3d0" : "#fecdd3";
    ctx.font = "600 16px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`최근 ${member.recentStats.winRate}%`, x + w - 20, rowY);
    ctx.textAlign = "left";
  });
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 0 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  ctx.save();
  ctx.fillStyle = fill;
  roundedPath(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  stroke: string,
) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  roundedPath(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
