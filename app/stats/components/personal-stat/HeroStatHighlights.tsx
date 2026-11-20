import type { HeroWinRateResponse } from "@/app/api/stats/types";
import { HERO_CATALOG } from "@/domain/hots/constants";
import type { Hero } from "@/domain/hots/models";
import Image from "next/image";
import { getPersonalHeroStatHighlights, MIN_HERO_HIGHLIGHT_GAMES } from "./personal-hero-stat-highlights";

interface Props {
  readonly stats: readonly HeroWinRateResponse[];
  readonly onViewRecord: (hero: Hero) => void;
}

export default function HeroStatHighlights({ stats, onViewRecord }: Props) {
  const { strong, weak, mostPlayed, mostPlayedIsTied } = getPersonalHeroStatHighlights(stats);
  const mostPlayedLabel = mostPlayedIsTied ? "공동 최다 픽" : "최다 픽";
  const standaloneMostPlayed = mostPlayed && mostPlayed !== strong && mostPlayed !== weak ? mostPlayed : undefined;
  const highlights = [
    { stat: strong, kind: "strong", title: "믿고 꺼낸 픽", numberStyle: "text-4xl text-emerald-200" },
    { stat: weak, kind: "weak", title: "고전한 픽", numberStyle: "text-3xl text-rose-200" },
    {
      stat: standaloneMostPlayed,
      kind: "frequent",
      title: mostPlayedIsTied ? mostPlayedLabel : "가장 자주 꺼낸 픽",
      numberStyle: "text-3xl text-white",
    },
  ];

  if (!strong && !weak && !mostPlayed) return null;

  return (
    <section aria-label="영웅 하이라이트" className="space-y-2">
      <div className="grid gap-3 md:auto-cols-fr md:grid-flow-col">
        {highlights.map(({ stat, kind, title, numberStyle }) => {
          if (!stat) return null;
          const { nameKo, image } = HERO_CATALOG[stat.hero];
          const winRate = `${stat.winRate.toFixed(1)}%`;
          const games = `${stat.totalGames}경기`;
          const primary = kind === "strong";
          const frequent = kind === "frequent";

          return (
            <article
              key={kind}
              className="flex min-w-0 flex-col rounded-xl border border-white/10 bg-white/3 p-4"
            >
              <h4 className="text-sm font-semibold text-gray-300">{title}</h4>
              <div className="my-3 flex min-h-[64px] items-center gap-3">
                <Image
                  src={image}
                  alt=""
                  width={primary ? 64 : 52}
                  height={primary ? 64 : 52}
                  className="shrink-0 rounded-lg border border-white/10"
                />
                <div className="min-w-0">
                  <p className="break-keep text-base leading-tight font-semibold text-white">{nameKo}</p>
                  <p className={`mt-1 leading-none font-bold tracking-tight tabular-nums ${numberStyle}`}>
                    {frequent ? (
                      <>
                        {stat.totalGames}<span className="ml-1 text-sm font-medium text-gray-300">경기</span>
                      </>
                    ) : winRate}
                  </p>
                </div>
              </div>
              <div className="mt-auto border-t border-white/10 pt-2">
                <p className="text-xs leading-relaxed text-gray-300 tabular-nums">
                  {frequent ? `승률 ${winRate}` : games} · {stat.wins}승 {stat.draws > 0 && `${stat.draws}무 `}{stat.losses}패
                  {!frequent && stat === mostPlayed && ` · ${mostPlayedLabel}`}
                </p>
                <button
                  type="button"
                  onClick={() => onViewRecord(stat.hero)}
                  aria-label={`${nameKo} 전적 보기`}
                  className="min-h-11 self-start rounded-sm text-xs font-semibold text-cyan-200 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  전적 보기 <span aria-hidden="true">↓</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <details className="text-xs text-gray-400">
        <summary className="w-fit cursor-pointer rounded-sm py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
          카드 선정 기준
        </summary>
        <p className="pb-1 leading-relaxed">
          {MIN_HERO_HIGHLIGHT_GAMES}경기 이상 플레이한 영웅을 살펴봅니다. 승률과 패율은 50% 전적 15경기를 더해 계산하고,
          경기 수가 적을수록 점수를 더 보수적으로 매깁니다. 무승부는 0.5승과 0.5패로 반영합니다.
          승률과 패율 카드는 보정 점수가 50을 넘긴 영웅 중 점수가 가장 높은 영웅을 보여줍니다.
        </p>
      </details>
    </section>
  );
}
