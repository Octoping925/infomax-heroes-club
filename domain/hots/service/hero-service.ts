import { HERO_CATALOG } from "../constants";
import { Hero, HeroRole } from "../models";

export function isValidHero(hero: string): hero is Hero {
  return Object.hasOwn(HERO_CATALOG, hero);
}

export function isValidHeroRole(role: string): role is HeroRole {
  return Object.hasOwn(HeroRole, role);
}
