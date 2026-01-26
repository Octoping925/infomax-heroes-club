"use client";

import { useMemo, useState, type ChangeEvent, type ReactElement } from "react";
import {
  GLOSSARY_ENTRIES,
  GLOSSARY_TAGS,
  type GlossaryEntry,
  type GlossaryTag,
} from "../glossary-data";

const ALL_TAG = "전체" as const;
type TagFilter = GlossaryTag | typeof ALL_TAG;

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function getEntrySearchText(entry: GlossaryEntry): string {
  return normalizeText(
    [
      entry.term,
      ...entry.aliases,
      entry.description,
      entry.details ?? "",
      entry.tags.join(" "),
      ...(entry.exampleCalls ?? []),
    ].join(" ")
  );
}

function getTagBadgeStyle(tag: GlossaryTag): string {
  const styles: Record<GlossaryTag, string> = {
    기본: "bg-white/5 text-gray-200 border-white/10",
    역할: "bg-purple-500/15 text-purple-200 border-purple-500/25",
    전투: "bg-red-500/15 text-red-200 border-red-500/25",
    운영: "bg-cyan-500/15 text-cyan-200 border-cyan-500/25",
    맵: "bg-amber-500/15 text-amber-200 border-amber-500/25",
    캠프: "bg-green-500/15 text-green-200 border-green-500/25",
    오브젝트: "bg-blue-500/15 text-blue-200 border-blue-500/25",
    콜: "bg-pink-500/15 text-pink-200 border-pink-500/25",
  };
  return styles[tag];
}

export default function GlossaryClient(): ReactElement {
  const [query, setQuery] = useState<string>("");
  const [tag, setTag] = useState<TagFilter>(ALL_TAG);

  const normalizedQuery = useMemo<string>(() => normalizeText(query), [query]);

  const filteredEntries = useMemo<readonly GlossaryEntry[]>(() => {
    const entriesByTag =
      tag === ALL_TAG
        ? GLOSSARY_ENTRIES
        : GLOSSARY_ENTRIES.filter((entry) => entry.tags.includes(tag));

    if (!normalizedQuery) {
      return [...entriesByTag].sort((a, b) => a.term.localeCompare(b.term, "ko"));
    }

    return entriesByTag
      .filter((entry) => getEntrySearchText(entry).includes(normalizedQuery))
      .sort((a, b) => a.term.localeCompare(b.term, "ko"));
  }, [normalizedQuery, tag]);

  const handleQueryChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setQuery(e.target.value);
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">히오스 초보 단어장</h2>
          <p className="text-sm text-gray-400">
            게임 중 자주 나오는 용어/콜을 빠르게 찾아보세요.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex-1">
              <label className="sr-only" htmlFor="glossary-search">
                용어 검색
              </label>
              <input
                id="glossary-search"
                value={query}
                onChange={handleQueryChange}
                placeholder="예) 로테, 소크, 오브, CC, 필…"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
            </div>

            <div className="text-sm text-gray-400">
              {filteredEntries.length}개 표시
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTag(ALL_TAG)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                tag === ALL_TAG
                  ? "bg-cyan-500 text-white border-cyan-500/40 shadow-lg shadow-cyan-500/20"
                  : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              전체
            </button>
            {GLOSSARY_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  tag === t
                    ? "bg-cyan-500 text-white border-cyan-500/40 shadow-lg shadow-cyan-500/20"
                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEntries.map((entry) => (
          <article
            key={entry.id}
            className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all"
          >
            <header className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold">{entry.term}</h3>
                  {entry.aliases.length > 0 && (
                    <p className="text-xs text-gray-400">
                      별칭: {entry.aliases.join(", ")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    className={`px-2 py-1 rounded-full text-[11px] font-medium border ${getTagBadgeStyle(
                      t
                    )}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </header>

            <div className="mt-4 space-y-3">
              <p className="text-gray-200 leading-relaxed">{entry.description}</p>

              {entry.details && (
                <p className="text-sm text-gray-400 leading-relaxed">
                  {entry.details}
                </p>
              )}

              {entry.exampleCalls && entry.exampleCalls.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
                    예시 콜
                  </div>
                  <ul className="space-y-1">
                    {entry.exampleCalls.map((call) => (
                      <li
                        key={call}
                        className="text-sm text-gray-300 bg-white/5 border border-white/10 rounded-xl px-3 py-2"
                      >
                        {call}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </article>
        ))}

        {filteredEntries.length === 0 && (
          <div className="md:col-span-2 bg-white/5 backdrop-blur-xl rounded-2xl p-10 border border-white/10 text-center">
            <p className="text-gray-300 font-medium">검색 결과가 없어요.</p>
            <p className="text-sm text-gray-500 mt-2">
              다른 키워드로 검색하거나 태그를 바꿔보세요.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
