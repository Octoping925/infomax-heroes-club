import { createRequire } from "node:module";
import type { ReplayArchive } from "./parser/parser";
import { ReplayParseError } from "./replay-errors";
import { MPQArchive, MpqError } from "../../../vendor/empeeku/mpyq";

export const MAX_MPQ_ARCHIVE_BYTES = 4_000_000;
export const MAX_MPQ_TABLE_ENTRIES = 1_024;
export const MAX_MPQ_MEMBER_BYTES = 16 * 1024 * 1024;
export const MAX_MPQ_TOTAL_OUTPUT_BYTES = 64 * 1024 * 1024;
export const MAX_MPQ_SECTOR_COUNT = 32_768;

export interface ReplayArchiveOptions {
  readonly maxArchiveBytes?: number;
  readonly maxTableEntries?: number;
  readonly maxMemberBytes?: number;
  readonly maxTotalOutputBytes?: number;
  readonly maxSectorCount?: number;
  readonly decodeBzip?: (input: Buffer, expectedBytes: number) => Buffer;
}

const require = createRequire(import.meta.url);

export function createReplayArchive(source: Buffer, options: ReplayArchiveOptions = {}): ReplayArchive {
  try {
    const archive = new MPQArchive(source, {
      limits: {
        maxArchiveBytes: options.maxArchiveBytes ?? MAX_MPQ_ARCHIVE_BYTES,
        maxTableEntries: options.maxTableEntries ?? MAX_MPQ_TABLE_ENTRIES,
        maxMemberBytes: options.maxMemberBytes ?? MAX_MPQ_MEMBER_BYTES,
        maxTotalOutputBytes: options.maxTotalOutputBytes ?? MAX_MPQ_TOTAL_OUTPUT_BYTES,
        maxSectorCount: options.maxSectorCount ?? MAX_MPQ_SECTOR_COUNT,
      },
      decodeBzip: options.decodeBzip ?? decodeBzip,
    });
    return {
      header: archive.header,
      readFile(filename: string): Buffer {
        try {
          return archive.readFile(filename);
        } catch (error) {
          if (error instanceof MpqError) {
            throw new ReplayParseError(error.code);
          }
          if (error instanceof ReplayParseError) {
            throw error;
          }
          throw new ReplayParseError("INVALID_MPQ");
        }
      },
    };
  } catch (error) {
    if (error instanceof MpqError) {
      throw new ReplayParseError(error.code);
    }
    throw new ReplayParseError("INVALID_MPQ");
  }
}

function decodeBzip(input: Buffer, expectedBytes: number): Buffer {
  try {
    const decoder = require("seek-bzip") as {
      decode(source: Buffer, output: { writeByte(value: number): void }): void;
    };
    const output = Buffer.allocUnsafe(expectedBytes);
    let offset = 0;
    decoder.decode(input, {
      writeByte(value: number): void {
        if (offset >= expectedBytes) {
          throw new Error("bzip output limit exceeded");
        }
        output[offset] = value;
        offset += 1;
      },
    });
    if (offset !== expectedBytes) {
      throw new Error("bzip output size mismatch");
    }
    return output;
  } catch {
    throw new ReplayParseError("MPQ_MEMBER_SIZE_MISMATCH");
  }
}
