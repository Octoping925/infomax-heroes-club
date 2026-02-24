import { describe, expect, it } from "vitest";
import {
  buildYoutubeEmbedUrl,
  buildYoutubeTimestampUrl,
  extractYoutubeVideoId,
  normalizeYoutubeUrl,
  normalizeYoutubeUrlOrNull,
} from "./youtube";

describe("youtube utils", () => {
  it("watch/youtu.be/shorts 링크를 정규화한다", () => {
    expect(normalizeYoutubeUrl("https://www.youtube.com/watch?v=abcDEF12345&feature=share")).toBe(
      "https://www.youtube.com/watch?v=abcDEF12345",
    );
    expect(normalizeYoutubeUrl("https://youtu.be/abcDEF12345?t=90")).toBe(
      "https://www.youtube.com/watch?v=abcDEF12345",
    );
    expect(normalizeYoutubeUrl("https://youtube.com/shorts/abcDEF12345?si=foo")).toBe(
      "https://www.youtube.com/watch?v=abcDEF12345",
    );
  });

  it("유튜브가 아닌 링크는 거부한다", () => {
    expect(() => normalizeYoutubeUrl("https://example.com/video/abcDEF12345")).toThrowError(
      "유튜브 링크만 등록할 수 있습니다.",
    );
  });

  it("normalizeYoutubeUrlOrNull은 빈 문자열을 null로 처리한다", () => {
    expect(normalizeYoutubeUrlOrNull("   ")).toBeNull();
    expect(normalizeYoutubeUrlOrNull(null)).toBeNull();
    expect(normalizeYoutubeUrlOrNull(undefined)).toBeNull();
    expect(normalizeYoutubeUrlOrNull("youtu.be/abcDEF12345")).toBe("https://www.youtube.com/watch?v=abcDEF12345");
  });

  it("extractYoutubeVideoId는 video id를 추출한다", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=abcDEF12345")).toBe("abcDEF12345");
    expect(extractYoutubeVideoId("https://youtu.be/abcDEF12345")).toBe("abcDEF12345");
    expect(extractYoutubeVideoId("https://example.com/watch?v=abcDEF12345")).toBeNull();
  });

  it("타임스탬프 URL과 embed URL을 생성한다", () => {
    expect(buildYoutubeTimestampUrl("https://www.youtube.com/watch?v=abcDEF12345", 84)).toBe(
      "https://www.youtube.com/watch?v=abcDEF12345&t=84",
    );

    expect(buildYoutubeEmbedUrl("https://www.youtube.com/watch?v=abcDEF12345", 84)).toBe(
      "https://www.youtube-nocookie.com/embed/abcDEF12345?rel=0&modestbranding=1&playsinline=1&start=84",
    );

    expect(buildYoutubeEmbedUrl("https://www.youtube.com/watch?v=abcDEF12345", 0)).toBe(
      "https://www.youtube-nocookie.com/embed/abcDEF12345?rel=0&modestbranding=1&playsinline=1",
    );

    expect(buildYoutubeEmbedUrl("https://example.com/watch?v=abcDEF12345", 10)).toBeNull();
  });
});
