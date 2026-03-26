"use client";

import { createContext, useCallback, useContext, useEffect, useEffectEvent, useState } from "react";

type StatsYearContextValue = {
  readonly availableYears: ReadonlyArray<number>;
  readonly selectedYear: number | null;
  readonly setSelectedYear: (year: number) => void;
};

export const StatsYearContext = createContext<StatsYearContextValue | null>(null);

function parseSearchYear(input: string | null): number | null {
  if (input === null || !/^\d{4}$/.test(input)) {
    return null;
  }

  const parsed = Number(input);
  return Number.isInteger(parsed) ? parsed : null;
}

function replaceYearInCurrentUrl(nextYear: number | null) {
  if (globalThis.window === undefined) {
    return;
  }

  const url = new URL(globalThis.window.location.href);

  if (nextYear === null) {
    url.searchParams.delete("year");
  } else {
    url.searchParams.set("year", String(nextYear));
  }

  globalThis.window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function useStatsYearFilter(availableYears: ReadonlyArray<number>): StatsYearContextValue {
  const defaultYear = availableYears[0] ?? null;
  const [selectedYear, setSelectedYearState] = useState<number | null>(defaultYear);

  const syncYearFromUrl = useEffectEvent(() => {
    if (globalThis.window === undefined) {
      setSelectedYearState(defaultYear);
      return;
    }

    const url = new URL(globalThis.window.location.href);
    const requestedYear = parseSearchYear(url.searchParams.get("year"));
    const normalizedYear =
      requestedYear !== null && availableYears.includes(requestedYear) ? requestedYear : defaultYear;

    setSelectedYearState(normalizedYear);

    if (requestedYear !== normalizedYear) {
      replaceYearInCurrentUrl(normalizedYear);
    }
  });

  useEffect(() => {
    if (globalThis.window === undefined) {
      return;
    }

    syncYearFromUrl();
    globalThis.window.addEventListener("popstate", syncYearFromUrl);

    return () => {
      globalThis.window.removeEventListener("popstate", syncYearFromUrl);
    };
  }, [availableYears, defaultYear]);

  const setSelectedYear = useCallback(
    (year: number) => {
      if (!availableYears.includes(year)) {
        return;
      }

      setSelectedYearState(year);
      replaceYearInCurrentUrl(year);
    },
    [availableYears],
  );

  return {
    availableYears,
    selectedYear,
    setSelectedYear,
  };
}

export function useStatsYear(): StatsYearContextValue {
  const context = useContext(StatsYearContext);

  if (context === null) {
    throw new Error("StatsYearContext is not available.");
  }

  return context;
}

export function formatStatsYear(year: number | null): string {
  return year === null ? "선택한 연도" : `${year}년`;
}
