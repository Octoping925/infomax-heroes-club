export type HeroRole = "TANKER" | "OFFLANER" | "MAIN_DEALER" | "SUB_DEALER" | "HEALER";

export const HeroRole = {
  TANKER: "TANKER",
  OFFLANER: "OFFLANER",
  MAIN_DEALER: "MAIN_DEALER",
  SUB_DEALER: "SUB_DEALER",
  HEALER: "HEALER",
} as const satisfies Record<HeroRole, HeroRole>;

export const HeroRoleLabelMap = {
  TANKER: "탱커",
  OFFLANER: "투사",
  MAIN_DEALER: "메인딜러",
  SUB_DEALER: "서브딜러",
  HEALER: "힐러",
} as const satisfies Record<HeroRole, string>;
