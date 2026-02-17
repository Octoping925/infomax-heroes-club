import { mapValues } from "es-toolkit";
import { HERO_CATALOG } from "./hero-catalog";

export const HeroMap = mapValues(HERO_CATALOG, (entry) => entry.nameKo);
export const HeroImage = mapValues(HERO_CATALOG, (entry) => entry.image);
export const HeroImageLegacy = mapValues(HERO_CATALOG, (entry) => entry.legacyImage);
export const HeroPositionMap = mapValues(HERO_CATALOG, (entry) => entry.role);
