export type HeroRole = "TANKER" | "OFFLANER" | "MAIN_DEALER" | "SUB_DEALER" | "HEALER";

export const HeroRoles = {
  TANKER: "TANKER",
  OFFLANER: "OFFLANER",
  MAIN_DEALER: "MAIN_DEALER",
  SUB_DEALER: "SUB_DEALER",
  HEALER: "HEALER",
} as const satisfies Record<HeroRole, HeroRole>;

export const HeroRoleLabelMap: Record<HeroRole, string> = {
  TANKER: "탱커",
  OFFLANER: "투사",
  MAIN_DEALER: "메인딜러",
  SUB_DEALER: "서브딜러",
  HEALER: "힐러",
};
