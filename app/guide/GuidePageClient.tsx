"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import type { GuideHeading } from "./guide-content";
import { slugifyGuideHeading } from "./guide-content";
import styles from "./guide.module.css";

interface GuidePageClientProps {
  readonly markdown: string;
  readonly headings: GuideHeading[];
}

const navigationItems = [
  { href: "/", label: "홈" },
  { href: "/guide", label: "가이드" },
  { href: "/stats", label: "통계" },
  { href: "/glossary", label: "단어장" },
  { href: "/gallery", label: "갤러리" },
  { href: "/match-history", label: "전적" },
];

const fieldRoster = [
  { name: "레이너", role: "메인 딜러", src: "/heroes/Raynor.png" },
  { name: "무라딘", role: "탱커", src: "/heroes/Muradin.png" },
  { name: "소냐", role: "투사", src: "/heroes/Sonya.png" },
  { name: "태사다르", role: "서브 딜러", src: "/heroes/Tassadar.png" },
  { name: "리 리", role: "힐러", src: "/heroes/LiLi.png" },
];

function getText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(getText).join("");
  }

  if (children && typeof children === "object" && "props" in children) {
    return getText((children as { props: { children?: ReactNode } }).props.children);
  }

  return "";
}

export default function GuidePageClient({
  markdown,
  headings,
}: GuidePageClientProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");
  const [progress, setProgress] = useState(0);
  const quickStartId =
    headings.find(({ label }) => label.includes("빠른 시작"))?.id ?? headings[0]?.id;

  useEffect(() => {
    const updateProgress = () => {
      const root = document.documentElement;
      const distance = root.scrollHeight - window.innerHeight;
      setProgress(distance > 0 ? Math.min((window.scrollY / distance) * 100, 100) : 0);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  useEffect(() => {
    const sectionElements = headings
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-18% 0px -70% 0px", threshold: 0 },
    );

    sectionElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [headings]);

  const markdownComponents = useMemo<Components>(
    () => ({
      h1: () => null,
      h2: ({ children }) => {
        const label = getText(children);
        const id = slugifyGuideHeading(label);

        return (
          <h2 id={id} data-guide-section className={styles.sectionHeading}>
            <span aria-hidden="true">◆</span>
            {children}
          </h2>
        );
      },
      h3: ({ children }) => (
        <h3 id={slugifyGuideHeading(getText(children))}>{children}</h3>
      ),
      a: ({ href = "", children }) => {
        const isInternal = href.startsWith("/") || href.startsWith("#");

        return isInternal ? (
          <Link href={href}>{children}</Link>
        ) : (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        );
      },
      table: ({ children }) => (
        <div className={styles.tableFrame} tabIndex={0} aria-label="가이드 비교표">
          <table>{children}</table>
        </div>
      ),
      blockquote: ({ children }) => (
        <blockquote>
          <span className={styles.quoteMark} aria-hidden="true">
            “
          </span>
          <div>{children}</div>
        </blockquote>
      ),
    }),
    [],
  );

  return (
    <main className={styles.page}>
      <div className={styles.progressTrack} aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <section className={styles.hero}>
        <Image
          src="/maps/CursedHollow.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroShade} />

        <header className={styles.siteHeader}>
          <Link href="/" className={styles.brand} aria-label="인포맥스 히오스 동호회 홈">
            <span>IM</span>
            <span>
              INFOMAX
              <small>HEROES CLUB</small>
            </span>
          </Link>
          <nav aria-label="주요 메뉴">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.href === "/guide" ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className={styles.heroContent}>
          <p className={styles.kicker}>FIELD MANUAL · NEW RECRUIT 01</p>
          <h1>
            롤은 해봤고,
            <br />
            히오스는 처음이라면
          </h1>
          <p className={styles.heroLead}>
            개인 캐리의 감각을 잠시 내려놓고, 다섯 명이 같은 타이밍에 강해지는 법부터
            익혀봅시다. 첫 내전에서 필요한 내용은 이 한 페이지에 모두 담았습니다.
          </p>
          <div className={styles.heroActions}>
            <a href={`#${quickStartId}`} className={styles.primaryAction}>
              첫 내전 체크리스트
              <span aria-hidden="true">↓</span>
            </a>
            <a href={`#${headings[0]?.id}`} className={styles.secondaryAction}>
              처음부터 읽기
            </a>
          </div>
        </div>

        <div className={styles.heroMeta}>
          <span>5 VS 5</span>
          <span>TEAM LEVEL</span>
          <span>13 CHAPTERS</span>
          <span>2026.08 EDITION</span>
        </div>
      </section>

      <section className={styles.roster} aria-label="초보 추천 영웅">
        <div className={styles.rosterIntro}>
          <span>STARTING ROSTER</span>
          <strong>역할은 달라도 원칙은 하나</strong>
          <p>혼자 빛나기보다, 팀이 싸울 수 있는 자리를 만듭니다.</p>
        </div>
        <div className={styles.rosterList}>
          {fieldRoster.map((hero) => (
            <div key={hero.name} className={styles.rosterHero}>
              <Image src={hero.src} alt="" width={64} height={64} />
              <span>
                <strong>{hero.name}</strong>
                <small>{hero.role}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.guideShell}>
        <aside className={styles.chapterNav} aria-label="가이드 목차">
          <div className={styles.chapterNavInner}>
            <p>MISSION INDEX</p>
            <ol>
              {headings.map((heading, index) => (
                <li key={heading.id}>
                  <a
                    href={`#${heading.id}`}
                    className={activeId === heading.id ? styles.activeChapter : undefined}
                    aria-current={activeId === heading.id ? "location" : undefined}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {heading.label.replace(/^\d+\.\s*/, "")}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <article className={styles.article}>
          <div className={styles.articleHeader}>
            <p>WELCOME TO THE NEXUS</p>
            <span>읽는 시간 약 25분</span>
          </div>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {markdown}
          </ReactMarkdown>

          <footer className={styles.articleFooter}>
            <p>준비됐나요?</p>
            <h2>이제 첫 내전에서 같이 부딪혀봅시다.</h2>
            <div>
              <Link href="/glossary">초보 단어장 열기</Link>
              <Link href="/match-history">최근 내전 구경하기</Link>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}
