import { describe, expect, it } from "vitest";
import { parseHeroMetaFilters } from "./hero-meta-filters";

const options = { patches: ["2.55", "2.54"], maps: ["Alterac Pass", "Cursed Hollow"] };

describe("parseHeroMetaFilters", () => {
  it("uses public page defaults", () => {
    expect(parseHeroMetaFilters(new URLSearchParams(), options)).toEqual({
      mode: "sl", region: "ALL", patch: "2.55", map: null, leagueTier: null,
    });
  });

  it("accepts simultaneous map and league filters", () => {
    expect(parseHeroMetaFilters(new URLSearchParams("mode=qm&region=KR&patch=2.54&map=Alterac+Pass&leagueTier=5"), options)).toMatchObject({
      mode: "qm", region: "KR", map: "Alterac Pass", leagueTier: "5",
    });
  });

  it.each(["mode=bad", "region=US", "patch=2.53", "map=Unknown", "leagueTier=9"])("rejects invalid %s", (query) => {
    expect(() => parseHeroMetaFilters(new URLSearchParams(query), options)).toThrow();
  });
});
