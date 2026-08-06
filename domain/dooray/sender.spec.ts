import { afterEach, describe, expect, it, vi } from "vitest";
import { sendDoorayBotMessage } from "./sender";

describe("sendDoorayBotMessage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Dooray 메시지를 JSON POST로 전송한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal("fetch", fetchMock);
    const body = { text: "히오스 팁" };

    await sendDoorayBotMessage("https://example.com/hook", body);

    expect(fetchMock).toHaveBeenCalledWith("https://example.com/hook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  });
});
