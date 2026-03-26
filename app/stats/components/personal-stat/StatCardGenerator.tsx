"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useOverallWinRate } from "../../hooks/useOverallWinRate";
import { usePlayerAverageStats } from "../../hooks/usePlayerAverageStats";
import { usePlayerHeroWinRate } from "../../hooks/usePlayerHeroWinRate";
import { commarize } from "@/utils/commarize";
import { HERO_CATALOG, HeroCatalogEntry } from "@/domain/hots/constants";
import dayjs from "dayjs";
import { round } from "es-toolkit";
import { formatStatsYear, useStatsYear } from "../../hooks/useStatsYearFilter";

type Props = {
  readonly playerId: string;
  readonly playerName: string;
  readonly playerNickname: string;
};

type CardData = {
  readonly playerName: string;
  readonly playerNickname: string;
  readonly yearLabel: string;
  readonly winRate: number;
  readonly totalGames: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly averageKills: number;
  readonly averageDeaths: number;
  readonly averageTakedowns: number;
  readonly averageHeroDamage: number;
  readonly topHeroes: ReadonlyArray<{
    hero: HeroCatalogEntry;
    totalGames: number;
  }>;
};

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

export function StatCardGenerator({ playerId, playerName, playerNickname }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPending, startTransition] = useTransition();
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { selectedYear } = useStatsYear();
  const yearLabel = formatStatsYear(selectedYear);
  const { data: overallData, error: overallError } = useOverallWinRate();
  const { data: kdaData, error: kdaError } = usePlayerAverageStats();
  const { data: heroData, error: heroError } = usePlayerHeroWinRate(playerNickname);

  const cardData: CardData | null = (() => {
    const stat = overallData.find((stat) => stat.playerId === playerId);
    const kda = kdaData.find((stat) => stat.playerId === playerId);

    if (!stat || !kda) {
      return null;
    }

    const topHeroes = heroData.heroStats
      .toSorted((a, b) => b.totalGames - a.totalGames)
      .slice(0, 3)
      .map((stat) => ({
        hero: HERO_CATALOG[stat.hero],
        totalGames: stat.totalGames,
      }));

    return {
      playerName,
      playerNickname,
      yearLabel,
      winRate: stat.matchStats.winRate,
      totalGames: stat.matchStats.totalGames,
      wins: stat.matchStats.wins,
      losses: stat.matchStats.losses,
      draws: stat.matchStats.draws,
      averageKills: kda.averageKills,
      averageDeaths: kda.averageDeaths,
      averageTakedowns: kda.averageTakedowns,
      averageHeroDamage: kda.averageHeroDamage,
      topHeroes,
    };
  })();

  useEffect(() => {
    if (!cardData) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    startTransition(async () => {
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;

      await drawStatCard(ctx, cardData);
    });
  }, [cardData]);

  if (overallError || kdaError || heroError) {
    return (
      <div className="flex justify-center py-6">
        <p className="text-red-400">❌ 전적 카드 데이터를 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="flex justify-center py-6">
        <p className="text-gray-400">{yearLabel} 전적 카드 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">전적 카드 미리보기</h3>
          <p className="text-sm text-gray-400">카드가 로드된 뒤 다운로드를 눌러주세요.</p>
        </div>
        <button
          onClick={() => {
            try {
              downloadCanvas(canvasRef.current, cardData.playerNickname);
              setDownloadError(null);
            } catch (error) {
              setDownloadError(error instanceof Error ? error.message : "다운로드에 실패했습니다.");
            }
          }}
          disabled={isPending}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            isPending ? "bg-white/10 text-gray-400 cursor-not-allowed" : "bg-cyan-500 text-white hover:bg-cyan-400"
          }`}
        >
          PNG 다운로드
        </button>
      </div>
      {downloadError && <p className="text-sm text-red-400">{downloadError}</p>}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
        <canvas ref={canvasRef} className="w-full h-auto" />
      </div>
    </div>
  );
}

async function drawStatCard(ctx: CanvasRenderingContext2D, data: CardData) {
  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, "#0b0f1c");
  gradient.addColorStop(1, "#141a2f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  drawGlow(ctx, 940, 120, 190, "rgba(34, 197, 94, 0.18)");
  drawGlow(ctx, 250, 540, 220, "rgba(59, 130, 246, 0.16)");

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 26px sans-serif";
  ctx.fillText("INFOMAX HEROES CLUB", 70, 70);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 54px sans-serif";
  ctx.fillText(`${data.playerName} (${data.playerNickname})`, 70, 145);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "600 24px sans-serif";
  ctx.fillText("내전 개인 전적 카드", 70, 190);

  const winRateText = `${data.winRate}%`;
  const recordText = `${data.wins}승 ${data.losses}패 ${data.draws}무`;
  const kdaText = `${round(data.averageKills, 1)} / ${round(data.averageDeaths, 1)} / ${round(data.averageTakedowns, 1)}`;
  const damageText = commarize(Math.floor(data.averageHeroDamage));

  const leftX = 70;
  const rightX = 620;
  const topY = 220;
  const blockWidth = 510;
  const blockHeight = 120;
  const blockGap = 24;

  drawStatBlock(ctx, {
    x: leftX,
    y: topY,
    width: blockWidth,
    height: blockHeight,
    label: "내전 승률",
    value: winRateText,
    accent: "#22c55e",
    subText: `${data.totalGames}경기`,
  });

  drawStatBlock(ctx, {
    x: rightX,
    y: topY,
    width: blockWidth,
    height: blockHeight,
    label: "전적",
    value: recordText,
    accent: "#38bdf8",
    subText: "승/패/무",
  });

  drawStatBlock(ctx, {
    x: leftX,
    y: topY + blockHeight + blockGap,
    width: blockWidth,
    height: blockHeight,
    label: "평균 K/D/T",
    value: kdaText,
    accent: "#a855f7",
    subText: "K / D / T",
  });

  drawStatBlock(ctx, {
    x: rightX,
    y: topY + blockHeight + blockGap,
    width: blockWidth,
    height: blockHeight,
    label: "평균 딜량",
    value: damageText,
    accent: "#f97316",
    subText: "Hero Damage",
  });

  drawTopHeroesBlock(ctx, {
    x: leftX,
    y: 500,
    width: blockWidth * 2 + 40,
    height: 90,
    heroes: data.topHeroes,
    heroImages: await Promise.all(data.topHeroes.map(({ hero }) => loadImage(hero.image))),
  });

  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 18px sans-serif";
  ctx.fillText(`기준: ${data.yearLabel} 내전 경기 / stats.infomax-heroes`, 70, CARD_HEIGHT - 28);

  ctx.fillStyle = "#64748b";
  ctx.font = "500 16px sans-serif";
  ctx.fillText(`생성일: ${dayjs().format("YYYY.MM.DD")}`, 70, CARD_HEIGHT - 8);
}

function drawStatBlock(
  ctx: CanvasRenderingContext2D,
  {
    x,
    y,
    width,
    height,
    label,
    value,
    accent,
    subText,
  }: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly label: string;
    readonly value: string;
    readonly accent: string;
    readonly subText: string;
  },
) {
  drawRoundedRect(ctx, x, y, width, height, 22, "rgba(255, 255, 255, 0.06)");

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  drawRoundedRectPath(ctx, x, y, width, height, 22);
  ctx.stroke();

  ctx.fillStyle = "#cbd5f5";
  ctx.font = "600 20px sans-serif";
  ctx.fillText(label, x + 24, y + 36);

  ctx.fillStyle = accent;
  ctx.font = "700 40px sans-serif";
  ctx.fillText(value, x + 24, y + 90);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 18px sans-serif";
  ctx.fillText(subText, x + 24, y + 120);
}

function drawTopHeroesBlock(
  ctx: CanvasRenderingContext2D,
  {
    x,
    y,
    width,
    height,
    heroes,
    heroImages,
  }: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly heroes: ReadonlyArray<{
      hero: HeroCatalogEntry;
      totalGames: number;
    }>;
    readonly heroImages: ReadonlyArray<HTMLImageElement | null>;
  },
) {
  drawRoundedRect(ctx, x, y, width, height, 22, "rgba(255, 255, 255, 0.06)");

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  drawRoundedRectPath(ctx, x, y, width, height, 22);
  ctx.stroke();

  ctx.fillStyle = "#cbd5f5";
  ctx.font = "600 20px sans-serif";
  ctx.fillText("자주 쓰는 영웅 TOP 3", x + 24, y + 32);

  if (heroes.length === 0) {
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 22px sans-serif";
    ctx.fillText("데이터 없음", x + 24, y + 64);
    return;
  }

  const startX = x + 24;
  const startY = y + 46;
  const imageSize = 44;
  const cardGap = 24;

  heroes.forEach((hero, index) => {
    const blockX = startX + index * (imageSize + 140);
    const blockY = startY;
    const imageX = blockX;
    const imageY = blockY + 6;
    const image = heroImages[index];

    drawRoundedRect(ctx, imageX, imageY, imageSize, imageSize, 12, "rgba(15, 23, 42, 0.6)");

    if (image) {
      drawRoundedImage(ctx, image, imageX, imageY, imageSize, 12);
    } else {
      ctx.fillStyle = "#cbd5f5";
      ctx.font = "700 16px sans-serif";
      ctx.fillText(hero.hero.nameKo.slice(0, 2), imageX + 8, imageY + 28);
    }

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 20px sans-serif";
    ctx.fillText(hero.hero.nameKo, imageX + imageSize + 24, imageY + 20);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 16px sans-serif";
    ctx.fillText(`${hero.totalGames}경기`, imageX + imageSize + 24, imageY + 42);

    if (index < heroes.length - 1) {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
      ctx.beginPath();
      ctx.moveTo(imageX + imageSize + 120 + cardGap / 2, imageY + 8);
      ctx.lineTo(imageX + imageSize + 120 + cardGap / 2, imageY + imageSize - 8);
      ctx.stroke();
    }
  });
}

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
) {
  ctx.save();
  ctx.fillStyle = fillStyle;
  drawRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.restore();
}

function drawRoundedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  radius: number,
) {
  ctx.save();
  drawRoundedRectPath(ctx, x, y, size, size, radius);
  ctx.clip();
  ctx.drawImage(image, x, y, size, size);
  ctx.restore();
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const clampedRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + clampedRadius, y);
  ctx.lineTo(x + width - clampedRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + clampedRadius);
  ctx.lineTo(x + width, y + height - clampedRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height);
  ctx.lineTo(x + clampedRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - clampedRadius);
  ctx.lineTo(x, y + clampedRadius);
  ctx.quadraticCurveTo(x, y, x + clampedRadius, y);
  ctx.closePath();
}

function downloadCanvas(canvas: HTMLCanvasElement | null, nickname: string) {
  if (!canvas) {
    return;
  }

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${nickname}-stat-card.png`;
  link.click();
}
