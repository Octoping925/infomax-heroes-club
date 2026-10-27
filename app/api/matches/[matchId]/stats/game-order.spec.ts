import { describe, expect, it } from "vitest";
import { validateGameOrder } from "./game-order";

describe("validateGameOrder", () => {
  it("accepts a permutation of all games", () => {
    expect(validateGameOrder(["b", "a"], ["a", "b"])).toBe(true);
  });
  it("rejects missing, duplicate, and foreign games", () => {
    expect(validateGameOrder(["a"], ["a", "b"])).toBe(false);
    expect(validateGameOrder(["a", "a"], ["a", "b"])).toBe(false);
    expect(validateGameOrder(["a", "c"], ["a", "b"])).toBe(false);
  });
});

