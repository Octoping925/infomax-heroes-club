export type HeroRole = "TANKER" | "OFFLANER" | "MAIN_DEALER" | "SUB_DEALER" | "HEALER";

export const HeroRoleMap = {
  TANKER: "TANKER",
  OFFLANER: "OFFLANER",
  MAIN_DEALER: "MAIN_DEALER",
  SUB_DEALER: "SUB_DEALER",
  HEALER: "HEALER",
} as const;
