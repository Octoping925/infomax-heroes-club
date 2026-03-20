import fs from "node:fs";
import path from "node:path";
import { HERO_CATALOG } from "@/domain/hots/constants";
import { isTalentTier, type Hero, type TalentTier } from "@/domain/hots/models";

export type TalentPickInput = {
  readonly tier: number;
  readonly rawCode: string;
  readonly talentKey?: string | null;
};

export type ResolvedTalentPick = {
  readonly tier: TalentTier;
  readonly rawCode: string;
  readonly talentKey: string | null;
  readonly imagePath: string | null;
};

const talentFileNameCache = new Map<string, ReadonlyArray<string>>();

export function resolveTalentPick(hero: Hero, input: TalentPickInput): ResolvedTalentPick {
  if (!isTalentTier(input.tier)) {
    throw new Error(`Unsupported talent tier: ${input.tier}`);
  }

  const folder = HERO_CATALOG[hero].icyVeinKey;
  const talentKey = input.talentKey?.trim() || resolveTalentKey(hero, input.rawCode);
  const imagePath = talentKey ? buildTalentImagePath(folder, talentKey) : null;

  return {
    tier: input.tier,
    rawCode: input.rawCode,
    talentKey,
    imagePath,
  };
}

export function resolveTalentPicks(hero: Hero, inputs: ReadonlyArray<TalentPickInput>): ReadonlyArray<ResolvedTalentPick> {
  return inputs
    .filter((input): input is TalentPickInput & { tier: TalentTier } => isTalentTier(input.tier))
    .map((input) => resolveTalentPick(hero, input))
    .toSorted((a, b) => a.tier - b.tier);
}

export function resolveTalentKey(hero: Hero, rawCode: string): string | null {
  const normalizedRaw = normalizeTalentToken(rawCode);
  if (!normalizedRaw) {
    return null;
  }

  const candidates = getTalentFileNames(HERO_CATALOG[hero].icyVeinKey)
    .map((fileName) => ({
      fileName,
      normalized: normalizeTalentToken(fileName),
    }))
    .filter((candidate) => candidate.normalized.length > 0 && normalizedRaw.includes(candidate.normalized));

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    const aEndsWith = normalizedRaw.endsWith(a.normalized) ? 1 : 0;
    const bEndsWith = normalizedRaw.endsWith(b.normalized) ? 1 : 0;

    if (aEndsWith !== bEndsWith) {
      return bEndsWith - aEndsWith;
    }

    if (a.normalized.length !== b.normalized.length) {
      return b.normalized.length - a.normalized.length;
    }

    return a.fileName.localeCompare(b.fileName);
  });

  return candidates[0]?.fileName ?? null;
}

function getTalentFileNames(heroFolder: string): ReadonlyArray<string> {
  const cached = talentFileNameCache.get(heroFolder);
  if (cached) {
    return cached;
  }

  const absoluteDir = path.join(process.cwd(), "public", "talents", heroFolder);

  let files: ReadonlyArray<string> = [];

  try {
    files = fs
      .readdirSync(absoluteDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".png"))
      .map((entry) => entry.name.replace(/\.png$/i, ""));
  } catch {
    files = [];
  }

  talentFileNameCache.set(heroFolder, files);
  return files;
}

function buildTalentImagePath(heroFolder: string, talentKey: string): string | null {
  const fileNames = getTalentFileNames(heroFolder);
  if (!fileNames.includes(talentKey)) {
    return null;
  }

  return `/talents/${heroFolder}/${talentKey}.png`;
}

function normalizeTalentToken(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}
