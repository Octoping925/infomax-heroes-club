export const HOTS_TALENT_TIERS = [1, 4, 7, 10, 13, 16, 20] as const;

export type TalentTier = (typeof HOTS_TALENT_TIERS)[number];

export function isTalentTier(value: number): value is TalentTier {
  return HOTS_TALENT_TIERS.includes(value as TalentTier);
}
