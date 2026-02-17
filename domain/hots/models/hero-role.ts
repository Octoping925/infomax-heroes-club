export type HeroRole = "TANKER" | "OFFLANER" | "MAIN_DEALER" | "SUB_DEALER" | "HEALER";

export const HeroRoles = {
  TANKER: "TANKER",
  OFFLANER: "OFFLANER",
  MAIN_DEALER: "MAIN_DEALER",
  SUB_DEALER: "SUB_DEALER",
  HEALER: "HEALER",
} as const satisfies Record<HeroRole, HeroRole>;
