import { TalentTier } from "./talent-tier";

export type Talent = {
  tier: TalentTier;
  rawCode: string;
  talentKey: string | null;
  imagePath: string | null;
};
