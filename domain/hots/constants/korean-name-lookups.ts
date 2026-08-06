import type { Hero } from "../models/hero";
import type { GameMap } from "../models/map";
import { HERO_CATALOG } from "./hero-catalog";
import { MAP_CATALOG } from "./maps";

export const HERO_BY_KOREAN_NAME: ReadonlyMap<string, Hero> = new Map(
  Object.entries(HERO_CATALOG).map(([hero, entry]) => [entry.nameKo, hero as Hero]),
);

export const MAP_BY_KOREAN_NAME: ReadonlyMap<string, GameMap> = new Map(
  Object.entries(MAP_CATALOG).map(([map, entry]) => [entry.nameKo, map as GameMap]),
);
