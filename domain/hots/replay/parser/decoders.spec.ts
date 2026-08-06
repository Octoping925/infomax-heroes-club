import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { BitPackedBuffer } = require("../../../../vendor/heroprotocol/lib/decoders.js") as {
  readonly BitPackedBuffer: new (contents: Buffer) => { toString(): string };
};

describe("vendored heroprotocol decoder", () => {
  it("does not log replay bytes when formatting a buffer", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(new BitPackedBuffer(Buffer.from([0xde])).toString()).toContain("buffer(");
    expect(log).not.toHaveBeenCalled();

    log.mockRestore();
  });
});
