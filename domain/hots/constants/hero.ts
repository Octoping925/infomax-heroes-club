import { mapValues } from "es-toolkit";
import { HERO_CATALOG } from "./hero-catalog";

export const HeroMap = mapValues(HERO_CATALOG, (entry) => entry.nameKo);
export const HeroImage = mapValues(HERO_CATALOG, (entry) => entry.image);
