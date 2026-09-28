import { describe, expect, it } from "vitest";
import { parseReferenceOptions, validateJobLocation } from "./heroes-profile";

describe("validateJobLocation", () => {
  it("accepts only Heroes Profile v1 jobs", () => {
    expect(validateJobLocation("/v1/jobs/abc-123")).toBe("/jobs/abc-123");
    expect(validateJobLocation("https://www.heroesprofile.com/api/external/v1/jobs/abc-123")).toBe("/jobs/abc-123");
    expect(() => validateJobLocation("https://evil.example/jobs/abc-123")).toThrow();
    expect(() => validateJobLocation("/v1/heroes/stats")).toThrow();
  });
});

describe("parseReferenceOptions", () => {
  it("extracts unique major patches and playable map names", () => {
    expect(parseReferenceOptions(
      { patches: [{ version: "2.55.17.97771" }, { version: "2.55.16.97039" }, { version: "2.54.4.1" }] },
      { maps: [{ name: "Alterac Pass", playable: 1 }, { name: "Old Map", playable: 0 }] },
    )).toEqual({ patches: ["2.55", "2.54"], maps: ["Alterac Pass"] });
  });
});
