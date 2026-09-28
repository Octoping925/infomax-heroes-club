import type { PrismaClient } from "@/generated/prisma/client";
import type { HeroMetaOptionsSnapshot, HeroMetaOptionsStore } from "../service/hero-meta-options";
import type { FilterOptions } from "../service/hero-meta-filters";

function parseOptions(raw: unknown): FilterOptions {
  if (typeof raw !== "object" || raw === null || !("patches" in raw) || !("maps" in raw) ||
    !Array.isArray(raw.patches) || !Array.isArray(raw.maps) ||
    !raw.patches.every((value) => typeof value === "string") || !raw.maps.every((value) => typeof value === "string")) {
    throw new Error("저장된 Heroes Profile 옵션이 손상되었습니다.");
  }
  return { patches: raw.patches, maps: raw.maps };
}

export function createHeroMetaOptionsStore(client: Pick<PrismaClient, "heroMetaReference">): HeroMetaOptionsStore {
  const model = client.heroMetaReference;
  return {
    async get(): Promise<HeroMetaOptionsSnapshot | null> {
      const row = await model.findUnique({ where: { key: "default" } });
      return row ? { options: parseOptions(row.options), fetchedAt: row.fetchedAt } : null;
    },
    async save(options, fetchedAt) {
      await model.upsert({
        where: { key: "default" },
        create: { key: "default", options: options as unknown as object, fetchedAt },
        update: { options: options as unknown as object, fetchedAt },
      });
    },
  };
}
