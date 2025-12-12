export type HeroRole =
  | "MAIN_TANK"
  | "OFFLANER"
  | "MAIN_DEALER"
  | "SUB_DEALER"
  | "HEALER";

export const HeroRoleMap = {
  MAIN_TANK: "MAIN_TANK",
  OFFLANER: "OFFLANER",
  MAIN_DEALER: "MAIN_DEALER",
  SUB_DEALER: "SUB_DEALER",
  HEALER: "HEALER",
} as const;
