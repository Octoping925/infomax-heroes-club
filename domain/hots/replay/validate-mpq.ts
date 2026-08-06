import { createRequire } from "node:module";
import {
  REPLAY_FILE_MAX_BYTES,
  REPLAY_MPQ_MAX_MEMBER_BYTES,
  REPLAY_MPQ_MAX_SECTOR_COUNT,
  REPLAY_MPQ_MAX_TABLE_ENTRIES,
  REPLAY_MPQ_MAX_TOTAL_OUTPUT_BYTES,
} from "@/config/replay-import";
import type { ReplayArchive } from "./parser/parser";
import { ReplayParseError } from "./replay-errors";
import { MPQArchive, MpqError } from "../../../vendor/empeeku/mpyq";

export const MAX_MPQ_ARCHIVE_BYTES = REPLAY_FILE_MAX_BYTES;
export const MAX_MPQ_TABLE_ENTRIES = REPLAY_MPQ_MAX_TABLE_ENTRIES;
export const MAX_MPQ_MEMBER_BYTES = REPLAY_MPQ_MAX_MEMBER_BYTES;
export const MAX_MPQ_TOTAL_OUTPUT_BYTES = REPLAY_MPQ_MAX_TOTAL_OUTPUT_BYTES;
export const MAX_MPQ_SECTOR_COUNT = REPLAY_MPQ_MAX_SECTOR_COUNT;

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
