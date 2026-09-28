import type { FilterOptions } from "./hero-meta-filters";

export interface HeroMetaOptionsSnapshot {
  readonly options: FilterOptions;
  readonly fetchedAt: Date;
}

export interface HeroMetaOptionsStore {
  get(): Promise<HeroMetaOptionsSnapshot | null>;
  save(options: FilterOptions, fetchedAt: Date): Promise<void>;
}

export async function loadHeroMetaOptions(deps: {
  readonly store: HeroMetaOptionsStore;
  readonly fetchOptions: () => Promise<FilterOptions>;
  readonly now: Date;
}): Promise<FilterOptions> {
  const cached = await deps.store.get();
  if (cached && deps.now.getTime() - cached.fetchedAt.getTime() < 86_400_000) return cached.options;
  try {
    const options = await deps.fetchOptions();
    await deps.store.save(options, deps.now);
    return options;
  } catch (error) {
    if (cached) return cached.options;
    throw error;
  }
}
