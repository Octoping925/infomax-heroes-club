"use client";

import Image from "next/image";
import Link from "next/link";
import { useLandingMotion } from "@/app/hooks/useLandingMotion";

type NavigationItem = {
  href: string;
  label: string;
};

type HeroFact = {
  value: string;
  label: string;
};

type RhythmItem = {
  eyebrow: string;
  title: string;
  description: string;
};

type StoryLine = {
  cadence: string;
  title: string;
  description: string;
  href: string;
  action: string;
};

type FeaturedHero = {
  src: string;
  name: string;
  role: string;
};

type VisualMoment = {
  src: string;
  alt: string;
  label: string;
  caption: string;
};

type DestinationLink = {
  href: string;
  title: string;
  description: string;
};

const navigationItems: NavigationItem[] = [
  { href: "/", label: "홈" },
  { href: "/stats", label: "통계" },
  { href: "/glossary", label: "단어장" },
  { href: "/gallery", label: "갤러리" },
  { href: "/match-history", label: "전적" },
];

const heroFacts: HeroFact[] = [
  { value: "13+", label: "활동 멤버" },
  { value: "월 2회", label: "점심 내전" },
  { value: "상시", label: "전적 아카이브" },
];

const rhythmItems: RhythmItem[] = [
  {
    eyebrow: "Play",
    title: "짧고 집중된 점심 내전",
    description: "업무 흐름을 크게 깨지 않으면서도 팀 합과 픽 감각을 꾸준히 유지합니다.",
  },
  {
    eyebrow: "Review",
    title: "경기 뒤엔 바로 데이터 확인",
    description: "승률, 조합, 상대 전적, 개인 폼까지 사이트 안에서 다시 복기합니다.",
  },
  {
    eyebrow: "Offline",
    title: "오프라인 모임까지 이어지는 흐름",
    description: "플레이가 끝난 뒤에도 사람과 분위기가 이어져 다음 경기가 더 편해집니다.",
  },
];

const storyLines: StoryLine[] = [
  {
    cadence: "격주",
    title: "점심 내전",
    description: "가장 자주 모이는 기본 리듬입니다. 새 조합을 시험하고, 익숙한 호흡을 다시 맞춥니다.",
    href: "/match-history",
    action: "최근 경기 보기",
  },
  {
    cadence: "상시",
    title: "전적 복기",
    description: "경기가 끝나면 체감으로 끝내지 않습니다. 숫자와 기록으로 다시 확인합니다.",
    href: "/stats",
    action: "통계 열기",
  },
  {
    cadence: "필요할 때",
    title: "초보 온보딩",
    description: "새로 들어온 사람도 바로 맥락을 잡을 수 있게 용어와 분위기를 같이 정리합니다.",
    href: "/glossary",
    action: "단어장 보기",
  },
  {
    cadence: "매월",
    title: "오프라인 모임",
    description: "저녁 식사와 사진 기록까지 이어지기 때문에 팀이 더 빠르게 가까워집니다.",
    href: "/gallery",
    action: "갤러리 보기",
  },
];

const featuredHeroes: FeaturedHero[] = [
  {
    src: "/heroes/Varian.png",
    name: "Varian",
    role: "Frontline",
  },
  {
    src: "/heroes/Chromie.png",
    name: "Chromie",
    role: "Burst",
  },
  {
    src: "/heroes/Mei.png",
    name: "Mei",
    role: "Control",
  },
  {
    src: "/heroes/Alarak.png",
    name: "Alarak",
    role: "Pick",
  },
];

const visualMoments: VisualMoment[] = [
  {
    src: "/maps/BattlefieldOfEternity.jpg",
    alt: "Battlefield of Eternity 전장 아트",
    label: "Battlefield",
    caption: "오브젝트 한타와 전면 충돌의 긴장을 가장 또렷하게 보여주는 전장입니다.",
  },
  {
    src: "/maps/SkyTemple.jpg",
    alt: "Sky Temple 전장 아트",
    label: "Sky Temple",
    caption: "장악 타이밍과 로테이션 감각이 그대로 드러나는 전장입니다.",
  },
  {
    src: "/maps/InfernalShrines.jpg",
    alt: "Infernal Shrines 전장 아트",
    label: "Infernal Shrines",
    caption: "한 번의 진입 각도와 궁 연계가 분위기를 뒤집는 전장입니다.",
  },
];

const destinationLinks: DestinationLink[] = [
  {
    href: "/stats",
    title: "통계",
    description: "승률, 조합, 플레이어 폼과 상대 전적까지 한 번에 확인합니다.",
  },
  {
    href: "/match-history",
    title: "전적",
    description: "최근 경기 결과와 하이라이트 기록을 흐름대로 다시 봅니다.",
  },
  {
    href: "/gallery",
    title: "갤러리",
    description: "모임 사진과 순간들을 넘기며 동호회의 분위기를 바로 파악합니다.",
  },
  {
    href: "/glossary",
    title: "단어장",
    description: "처음 들어온 사람도 바로 대화에 합류할 수 있게 용어를 정리했습니다.",
  },
];

const heroArtwork = {
  src: "/maps/BattlefieldOfEternity.jpg",
  alt: "Battlefield of Eternity 전장 일러스트",
};

const supportArtwork = {
  src: "/maps/SkyTemple.jpg",
  alt: "Sky Temple 전장 일러스트",
};

export default function Home() {
  useLandingMotion();

  return (
    <main className="home-landing min-h-screen overflow-x-hidden bg-[#05070b] text-white">
      <section
        id="landing-hero"
        className="relative isolate min-h-svh overflow-hidden [--pointer-x:52%] [--pointer-y:38%]"
      >
        <Image
          fill
          priority
          src={heroArtwork.src}
          alt={heroArtwork.alt}
          className="landing-hero-media object-cover object-center"
          sizes="100vw"
        />
        <div className="landing-hero-shadow absolute inset-0" aria-hidden="true" />
        <div className="landing-hero-glow absolute inset-0" aria-hidden="true" />
        <div className="landing-grid absolute inset-0 opacity-40" aria-hidden="true" />
        <div
          className="landing-orb landing-orb-cyan absolute -left-28 top-24 h-72 w-72 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div
          className="landing-orb landing-orb-amber absolute -right-24 top-16 h-80 w-80 rounded-full blur-3xl"
          aria-hidden="true"
        />

        <header className="absolute inset-x-0 top-0 z-30">
          <div className="mx-auto flex max-w-[1520px] flex-col gap-4 px-5 pt-5 md:px-8 lg:px-12 xl:px-16">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.5em] text-white/55">YONHAP INFOMAX</p>
                <p className="mt-1 text-sm font-medium text-white/92 sm:text-base">히어로즈 오브 더 스톰 동호회</p>
              </Link>
            </div>

            <nav className="-mx-2 overflow-x-auto px-2 scrollbar-hide">
              <div className="inline-flex min-w-full gap-2 border border-white/12 bg-black/18 p-2 backdrop-blur-xl sm:min-w-max sm:rounded-full">
                {navigationItems.map((item) => {
                  const isCurrentPage = item.href === "/";

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isCurrentPage ? "page" : undefined}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium tracking-[0.18em] uppercase transition duration-300 sm:text-[11px] ${
                        isCurrentPage ? "bg-white text-[#090b10]" : "text-white/72 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </header>

        <div className="relative z-10 flex min-h-svh items-end px-5 pb-12 pt-32 md:px-8 md:pb-14 lg:px-12 xl:px-16">
          <div className="mx-auto grid w-full max-w-[1520px] gap-10 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,0.74fr)] lg:items-end">
            <div className="max-w-152">
              <p
                className="landing-sequence text-[11px] uppercase tracking-[0.55em] text-[#f5b971]"
                style={{ animationDelay: "120ms" }}
              >
                Heroes Club
              </p>
              <h1
                className="landing-sequence mt-4 text-[clamp(3.6rem,13vw,8.5rem)] leading-[0.9] tracking-[-0.05em] text-white"
                style={{ animationDelay: "220ms", fontFamily: "var(--font-display)" }}
              >
                히오스
                <br />
                동호회
              </h1>
              <p
                className="landing-sequence mt-6 max-w-xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8"
                style={{ animationDelay: "340ms" }}
              >
                점심 내전부터 저녁 모임까지, 같은 게임을 오래 즐기기 위해 모였습니다. 플레이가 끝난 뒤에도 전적과
                기록으로 다시 돌아오는 사내 히오스 동호회입니다.
              </p>

              <div className="landing-sequence mt-8 flex flex-wrap gap-3" style={{ animationDelay: "460ms" }}>
                <Link
                  href="/stats"
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#090b10] transition hover:bg-[#f1f3f8]"
                >
                  전적 보러 가기
                </Link>
                <Link
                  href="/gallery"
                  className="rounded-full border border-white/18 bg-black/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  사진 둘러보기
                </Link>
              </div>

              <div
                className="landing-sequence mt-10 grid gap-4 border-t border-white/18 pt-5 text-sm text-white/72 sm:grid-cols-3"
                style={{ animationDelay: "560ms" }}
              >
                {heroFacts.map((fact) => (
                  <div key={fact.label}>
                    <p className="text-[1.7rem] font-semibold tracking-[-0.04em] text-white">{fact.value}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/48">{fact.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-sequence hidden lg:block lg:justify-self-end" style={{ animationDelay: "520ms" }}>
              <div className="w-full max-w-120">
                <p className="text-[11px] uppercase tracking-[0.5em] text-white/42">Featured Pool</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {featuredHeroes.map((hero) => (
                    <div
                      key={hero.name}
                      className="flex items-center gap-3 rounded-[1.35rem] border border-white/12 bg-black/18 px-4 py-3 backdrop-blur-xl"
                    >
                      <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/15 bg-white/5">
                        <Image
                          fill
                          src={hero.src}
                          alt={hero.name}
                          className="object-cover object-center"
                          sizes="48px"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{hero.name}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-white/40">{hero.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/10 px-5 py-16 md:px-8 md:py-20 lg:px-12 xl:px-16">
        <div className="mx-auto grid max-w-[1520px] gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-end">
          <div data-reveal className="landing-reveal space-y-6">
            <p className="text-[11px] uppercase tracking-[0.5em] text-[#f5b971]">Club Rhythm</p>
            <h2
              className="max-w-lg text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.95] tracking-[-0.05em] text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              플레이는 짧게, 기록은 길게 남깁니다.
            </h2>
            <p className="max-w-xl text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
              이 페이지는 단순한 소개가 아니라 동호회가 움직이는 방식의 입구입니다. 경기가 끝나면 통계로 돌아보고,
              전장과 영웅 풀의 흐름을 다시 확인한 뒤 다음 판의 리듬으로 이어집니다.
            </p>
          </div>

          <div data-reveal className="landing-reveal">
            <div className="relative aspect-5/4 overflow-hidden rounded-4xl border border-white/10 bg-[#090b10]">
              <Image
                fill
                src={supportArtwork.src}
                alt={supportArtwork.alt}
                className="object-cover object-center"
                sizes="(min-width: 1024px) 52vw, 100vw"
              />
              <div
                className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,11,0.08),rgba(5,7,11,0.82))]"
                aria-hidden="true"
              />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.5em] text-white/42">Current Pool</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {featuredHeroes.map((hero) => (
                    <div key={hero.name} className="flex items-center gap-3 border-t border-white/12 pt-3">
                      <div className="relative h-11 w-11 overflow-hidden rounded-full border border-white/15 bg-white/5">
                        <Image
                          fill
                          src={hero.src}
                          alt={hero.name}
                          className="object-cover object-center"
                          sizes="44px"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{hero.name}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/42">{hero.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-[1520px] border-t border-white/10">
          <div className="grid md:grid-cols-3">
            {rhythmItems.map((item) => (
              <article
                key={item.title}
                data-reveal
                className="landing-reveal border-b border-white/10 py-7 md:border-b-0 md:px-6 md:py-8 md:not-last:border-r md:first:pl-0 md:last:pr-0"
              >
                <p className="text-[11px] uppercase tracking-[0.4em] text-white/38">{item.eyebrow}</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{item.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-7 text-white/66">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/10 px-5 py-20 md:px-8 md:py-24 lg:px-12 xl:px-16">
        <div className="mx-auto grid max-w-[1520px] gap-12 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
          <div data-reveal className="landing-reveal lg:sticky lg:top-24 lg:h-fit">
            <p className="text-[11px] uppercase tracking-[0.5em] text-[#7de3f2]">How We Gather</p>
            <h2
              className="mt-4 max-w-md text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.95] tracking-[-0.05em] text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              한 번 놀고 끝나는 모임이 아니라, 계속 다시 열리는 루틴.
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-white/68">
              내전, 복기, 온보딩, 오프라인 모임이 분리되지 않고 이어집니다.
            </p>
          </div>

          <div className="space-y-10">
            {storyLines.map((storyLine) => (
              <article key={storyLine.title} data-reveal className="landing-reveal border-t border-white/10 pt-6">
                <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-start">
                  <p className="text-md uppercase tracking-[0.35em] text-white/38">{storyLine.cadence}</p>
                  <div>
                    <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">{storyLine.title}</h3>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-white/66">{storyLine.description}</p>
                  </div>
                  <Link
                    href={storyLine.href}
                    className="group inline-flex items-center gap-2 text-sm font-medium text-white/74 transition hover:text-white"
                  >
                    <span>{storyLine.action}</span>
                    <span className="transition duration-300 group-hover:translate-x-1">↗</span>
                  </Link>
                </div>
              </article>
            ))}

            <div data-reveal className="landing-reveal overflow-x-auto scrollbar-hide">
              <div className="flex min-w-max gap-4 pb-2">
                {visualMoments.map((visualMoment) => (
                  <figure key={visualMoment.src} className="group w-68 shrink-0 space-y-4 sm:w-[20rem] lg:w-84">
                    <div className="relative aspect-6/5 overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/5">
                      <Image
                        fill
                        src={visualMoment.src}
                        alt={visualMoment.alt}
                        className="object-cover object-center transition duration-700 group-hover:scale-[1.04]"
                        sizes="(min-width: 1024px) 22rem, 18rem"
                      />
                      <div
                        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,11,0.04),rgba(5,7,11,0.58))] transition duration-500 group-hover:bg-[linear-gradient(180deg,rgba(5,7,11,0.04),rgba(5,7,11,0.42))]"
                        aria-hidden="true"
                      />
                    </div>
                    <figcaption>
                      <p className="text-[11px] uppercase tracking-[0.45em] text-white/38">{visualMoment.label}</p>
                      <p className="mt-2 max-w-xs text-sm leading-6 text-white/68">{visualMoment.caption}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/10 px-5 py-20 md:px-8 md:py-24 lg:px-12 xl:px-16">
        <div
          className="absolute inset-0 bg-[linear-gradient(135deg,rgba(245,185,113,0.12),rgba(5,7,11,0.02)_40%,rgba(125,227,242,0.12))]"
          aria-hidden="true"
        />
        <div className="landing-grid absolute inset-0 opacity-25" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-[1520px] gap-12 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:items-start">
          <div data-reveal className="landing-reveal">
            <p className="text-[11px] uppercase tracking-[0.5em] text-[#f5b971]">Explore</p>
            <h2
              className="mt-4 max-w-lg text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] tracking-[-0.05em] text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              다음 접속 전에, 지난 판을 먼저 훑어보세요.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
              동호회의 분위기는 갤러리에서 보이고, 경기력의 방향은 전적에서 드러납니다. 처음 온 사람이라면 단어장부터,
              익숙한 멤버라면 바로 통계부터 들어가면 됩니다.
            </p>
            <blockquote className="mt-10 max-w-md border-t border-white/12 pt-5">
              <p className="text-2xl leading-tight tracking-[-0.04em] text-white sm:text-[2rem]">
                &quot;승리에 우연은 없습니다.&quot;
              </p>
              <footer className="mt-3 text-md uppercase tracking-[0.4em] text-white/42">채수관</footer>
            </blockquote>
          </div>

          <div className="border-t border-white/10">
            {destinationLinks.map((destinationLink) => (
              <Link
                key={destinationLink.href}
                href={destinationLink.href}
                data-reveal
                className="landing-reveal group flex items-start justify-between gap-6 border-b border-white/10 py-6 transition hover:border-white/22"
              >
                <div>
                  <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{destinationLink.title}</p>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-white/64">{destinationLink.description}</p>
                </div>
                <span className="mt-1 text-xl text-white/54 transition duration-300 group-hover:translate-x-1 group-hover:text-white">
                  ↗
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
