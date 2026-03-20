import { describe, expect, it } from "vitest";
import { resolveTalentKey, resolveTalentPick } from "./talent-resolver";

describe("talent-resolver", () => {
  it("리플레이 raw code에서 파일명 suffix를 우선적으로 매칭한다", () => {
    expect(resolveTalentKey("Muradin", "MuradinMasteryDwarfTossHeavyImpact")).toBe("HeavyImpact");
  });

  it("해결된 talent key로 public/talents 경로를 만든다", () => {
    expect(
      resolveTalentPick("Muradin", {
        tier: 4,
        rawCode: "MuradinMasteryDwarfTossHeavyImpact",
      }),
    ).toEqual({
      tier: 4,
      rawCode: "MuradinMasteryDwarfTossHeavyImpact",
      talentKey: "HeavyImpact",
      imagePath: "/talents/muradin/HeavyImpact.png",
    });
  });

  it("매칭 실패 시 talentKey와 imagePath를 null로 둔다", () => {
    expect(
      resolveTalentPick("Muradin", {
        tier: 7,
        rawCode: "MuradinCompletelyUnknownTalent",
      }),
    ).toEqual({
      tier: 7,
      rawCode: "MuradinCompletelyUnknownTalent",
      talentKey: null,
      imagePath: null,
    });
  });
});
