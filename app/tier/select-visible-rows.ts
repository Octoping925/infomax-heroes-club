import type { HeroMetaRow } from "@/domain/hots/service/hero-meta-tier";
import type { HeroRole } from "@/domain/hots/models";
import { HERO_CATALOG } from "@/domain/hots/constants";

export interface VisibleRowsSelection {
  readonly role: "ALL" | HeroRole;
  readonly search: string;
  readonly sort: "tier" | "win" | "pick";
}

export function selectVisibleRows(rows: ReadonlyArray<HeroMetaRow>, selection: VisibleRowsSelection): HeroMetaRow[] {
  const search = selection.search.trim().toLocaleLowerCase();
  return rows
    .filter((row) => selection.role === "ALL" || row.role === selection.role)
    .filter((row) => !search || row.hero.toLocaleLowerCase().includes(search) || HERO_CATALOG[row.hero].nameKo.includes(search))
    .sort((a, b) => {
      const left = selection.sort === "win" ? a.winRate : selection.sort === "pick" ? a.pickRate : (a.tierScore ?? -1);
      const right = selection.sort === "win" ? b.winRate : selection.sort === "pick" ? b.pickRate : (b.tierScore ?? -1);
      return right - left || a.hero.localeCompare(b.hero);
    });
}
