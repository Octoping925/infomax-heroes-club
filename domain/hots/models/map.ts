export type GameMap =
  | "SkyTemple"
  | "TowersOfDoom"
  | "HauntedMines"
  | "BattlefieldOfEternity"
  | "BlackheartsBay"
  | "CursedHollow"
  | "DragonShire"
  | "HauntedWoods"
  | "InfernalShrines"
  | "TombOfTheSpiderQueen"
  | "VolskayaFoundry"
  | "WarheadJunction"
  | "BraxisHoldout"
  | "Hanamura"
  | "AlteracPass";

export const GameMap = {
  SkyTemple: "SkyTemple",
  TowersOfDoom: "TowersOfDoom",
  HauntedMines: "HauntedMines",
  BattlefieldOfEternity: "BattlefieldOfEternity",
  BlackheartsBay: "BlackheartsBay",
  CursedHollow: "CursedHollow",
  DragonShire: "DragonShire",
  HauntedWoods: "HauntedWoods",
  InfernalShrines: "InfernalShrines",
  TombOfTheSpiderQueen: "TombOfTheSpiderQueen",
  VolskayaFoundry: "VolskayaFoundry",
  WarheadJunction: "WarheadJunction",
  BraxisHoldout: "BraxisHoldout",
  Hanamura: "Hanamura",
  AlteracPass: "AlteracPass",
} as const satisfies Record<GameMap, GameMap>;
