import { describe, expect, it } from "vitest";
import { groupBy } from "./groupBy";

describe("groupBy", () => {
  it("키 선택자 기준으로 맵을 만들고 마지막 값으로 덮어쓴다", () => {
    const rows = [
      { id: "a", value: 1 },
      { id: "a", value: 2 },
      { id: "b", value: 3 },
    ];

    const result = groupBy(
      rows,
      (row) => row.id,
      (row) => row.value,
    );

    expect(result.get("a")).toBe(2);
    expect(result.get("b")).toBe(3);
    expect(result.size).toBe(2);
  });
});
