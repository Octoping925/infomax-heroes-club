import { describe, expect, it } from "vitest";
import { MatchServiceError } from "./errors";

describe("MatchServiceError", () => {
  it("기본 상태코드는 400이다", () => {
    const error = new MatchServiceError("오류");
    expect(error.name).toBe("MatchServiceError");
    expect(error.message).toBe("오류");
    expect(error.status).toBe(400);
  });

  it("상태코드를 명시적으로 지정할 수 있다", () => {
    const error = new MatchServiceError("오류", 422);
    expect(error.status).toBe(422);
  });
});
