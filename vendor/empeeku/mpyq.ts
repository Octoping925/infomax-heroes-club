import { unzipSync } from "node:zlib";

const MPQ_FILE_IMPLODE = 0x00000100;
const MPQ_FILE_COMPRESS = 0x00000200;
const MPQ_FILE_ENCRYPTED = 0x00010000;
const MPQ_FILE_FIX_KEY = 0x00020000;
const MPQ_FILE_SINGLE_UNIT = 0x01000000;
const MPQ_FILE_DELETE_MARKER = 0x02000000;
const MPQ_FILE_SECTOR_CRC = 0x04000000;
const MPQ_FILE_EXISTS = 0x80000000;

export type MpqErrorCode =
  | "INVALID_MPQ"
  | "MPQ_LIMIT_EXCEEDED"
  | "MPQ_MISSING_MEMBER"
  | "MPQ_ENCRYPTED_MEMBER"
  | "MPQ_UNSUPPORTED_COMPRESSION"
  | "MPQ_MEMBER_SIZE_MISMATCH";

export class MpqError extends Error {
  readonly code: MpqErrorCode;

  constructor(code: MpqErrorCode) {
    super(code);
    this.name = "MpqError";
    this.code = code;
  }
}

export interface MpqLimits {
  readonly maxArchiveBytes: number;
  readonly maxTableEntries: number;
  readonly maxMemberBytes: number;
  readonly maxTotalOutputBytes: number;
  readonly maxSectorCount: number;
}

export interface MpqArchiveOptions {
  readonly limits: MpqLimits;
  readonly decodeBzip: (input: Buffer, expectedBytes: number) => Buffer;
}

interface UserDataHeader {
  readonly content: Buffer;
  readonly mpqHeaderOffset: number;
}

interface ArchiveHeader {
  readonly offset: number;
  readonly archiveSize: number;
  readonly sectorSizeShift: number;
  readonly hashTableOffset: number;
  readonly blockTableOffset: number;
  readonly hashTableEntries: number;
  readonly blockTableEntries: number;
  readonly userDataHeader: UserDataHeader;
}

interface HashEntry {
  readonly hashA: number;
  readonly hashB: number;
  readonly blockTableIndex: number;
}

interface BlockEntry {
  readonly offset: number;
  readonly archivedSize: number;
  readonly size: number;
  readonly flags: number;
}

/**
 * Security-patched runtime subset of empeeku 1.0.2. It intentionally accepts
 * only a request Buffer and exposes no filesystem or extraction helpers.
 */
export class MPQArchive {
  readonly header: ArchiveHeader;
  private readonly source: Buffer;
  private readonly hashTable: ReadonlyArray<HashEntry>;
  private readonly blockTable: ReadonlyArray<BlockEntry>;
  private readonly options: MpqArchiveOptions;
  private readonly outputCache = new Map<string, Buffer>();
  private totalOutputBytes = 0;

  constructor(source: Buffer, options: MpqArchiveOptions) {
    this.source = Buffer.from(source);
    this.options = options;
    if (this.source.length > options.limits.maxArchiveBytes) {
      throw new MpqError("MPQ_LIMIT_EXCEEDED");
    }
    this.header = readHeader(this.source, options.limits);
    this.hashTable = this.readHashTable();
    this.blockTable = this.readBlockTable();
  }

  readFile(filename: string): Buffer {
    const cached = this.outputCache.get(filename);
    if (cached) {
      return Buffer.from(cached);
    }

    const hashA = mpqHash(filename, 1);
    const hashB = mpqHash(filename, 2);
    const hashEntry = this.hashTable.find((entry) => entry.hashA === hashA && entry.hashB === hashB);
    if (!hashEntry || hashEntry.blockTableIndex >= this.blockTable.length) {
      throw new MpqError("MPQ_MISSING_MEMBER");
    }

    const block = this.blockTable[hashEntry.blockTableIndex]!;
    this.validateBlock(block);
    const start = safeAdd(this.header.offset, block.offset);
    const end = safeAdd(start, block.archivedSize);
    if (end > safeAdd(this.header.offset, this.header.archiveSize)) {
      throw new MpqError("INVALID_MPQ");
    }
    assertRange(this.source, start, end);
    const archived = this.source.subarray(start, end);
    const output =
      (block.flags & MPQ_FILE_SINGLE_UNIT) !== 0
        ? this.readSingleUnit(archived, block)
        : this.readSectors(archived, block);

    if (output.length !== block.size) {
      throw new MpqError("MPQ_MEMBER_SIZE_MISMATCH");
    }
    if (this.totalOutputBytes + output.length > this.options.limits.maxTotalOutputBytes) {
      throw new MpqError("MPQ_LIMIT_EXCEEDED");
    }
    this.totalOutputBytes += output.length;
    this.outputCache.set(filename, Buffer.from(output));
    return Buffer.from(output);
  }

  private validateBlock(block: BlockEntry): void {
    if ((block.flags & MPQ_FILE_EXISTS) === 0 || block.archivedSize === 0) {
      throw new MpqError("MPQ_MISSING_MEMBER");
    }
    if ((block.flags & (MPQ_FILE_ENCRYPTED | MPQ_FILE_FIX_KEY)) !== 0) {
      throw new MpqError("MPQ_ENCRYPTED_MEMBER");
    }
    if ((block.flags & (MPQ_FILE_IMPLODE | MPQ_FILE_DELETE_MARKER)) !== 0) {
      throw new MpqError("MPQ_UNSUPPORTED_COMPRESSION");
    }
    if (block.size > this.options.limits.maxMemberBytes) {
      throw new MpqError("MPQ_LIMIT_EXCEEDED");
    }
    if (this.totalOutputBytes + block.size > this.options.limits.maxTotalOutputBytes) {
      throw new MpqError("MPQ_LIMIT_EXCEEDED");
    }
  }

  private readSingleUnit(archived: Buffer, block: BlockEntry): Buffer {
    if ((block.flags & MPQ_FILE_COMPRESS) === 0 || block.size === block.archivedSize) {
      return Buffer.from(archived);
    }
    return this.decompress(archived, block.size);
  }

  private readSectors(archived: Buffer, block: BlockEntry): Buffer {
    const sectorSize = 512 * 2 ** this.header.sectorSizeShift;
    if (!Number.isSafeInteger(sectorSize) || sectorSize <= 0) {
      throw new MpqError("INVALID_MPQ");
    }
    const dataSectorCount = Math.ceil(block.size / sectorSize);
    const hasCrc = (block.flags & MPQ_FILE_SECTOR_CRC) !== 0;
    const positionCount = dataSectorCount + 1 + (hasCrc ? 1 : 0);
    if (dataSectorCount > this.options.limits.maxSectorCount || positionCount * 4 > archived.length) {
      throw new MpqError("MPQ_LIMIT_EXCEEDED");
    }

    const positions = Array.from({ length: positionCount }, (_, index) => archived.readUInt32LE(index * 4));
    const dataEndIndex = hasCrc ? positions.length - 1 : positions.length;
    const chunks: Buffer[] = [];
    let outputBytes = 0;
    for (let index = 0; index < dataEndIndex - 1; index += 1) {
      const start = positions[index]!;
      const end = positions[index + 1]!;
      if (start > end || end > archived.length || start < positionCount * 4) {
        throw new MpqError("INVALID_MPQ");
      }
      const expected = Math.min(sectorSize, block.size - outputBytes);
      const sector = archived.subarray(start, end);
      const decoded =
        (block.flags & MPQ_FILE_COMPRESS) !== 0 && sector.length < expected
          ? this.decompress(sector, expected)
          : Buffer.from(sector);
      if (decoded.length !== expected || outputBytes + decoded.length > block.size) {
        throw new MpqError("MPQ_MEMBER_SIZE_MISMATCH");
      }
      chunks.push(decoded);
      outputBytes += decoded.length;
    }
    return Buffer.concat(chunks, outputBytes);
  }

  private decompress(input: Buffer, expectedBytes: number): Buffer {
    if (input.length < 1 || expectedBytes > this.options.limits.maxMemberBytes) {
      throw new MpqError("INVALID_MPQ");
    }
    const compression = input.readUInt8(0);
    const compressed = input.subarray(1);
    try {
      if (compression === 0) {
        return Buffer.from(input);
      }
      if (compression === 2) {
        return unzipSync(compressed, { maxOutputLength: expectedBytes });
      }
      if (compression === 16) {
        const decoded = Buffer.from(this.options.decodeBzip(compressed, expectedBytes));
        if (decoded.length !== expectedBytes) {
          throw new MpqError("MPQ_MEMBER_SIZE_MISMATCH");
        }
        return decoded;
      }
    } catch (error) {
      if (error instanceof MpqError) {
        throw error;
      }
      throw new MpqError("MPQ_MEMBER_SIZE_MISMATCH");
    }
    throw new MpqError("MPQ_UNSUPPORTED_COMPRESSION");
  }

  private readHashTable(): ReadonlyArray<HashEntry> {
    const data = this.readTable("hash");
    return Array.from({ length: this.header.hashTableEntries }, (_, index) => {
      const offset = index * 16;
      return {
        hashA: data.readUInt32BE(offset),
        hashB: data.readUInt32BE(offset + 4),
        blockTableIndex: data.readUInt32BE(offset + 12),
      };
    });
  }

  private readBlockTable(): ReadonlyArray<BlockEntry> {
    const data = this.readTable("block");
    return Array.from({ length: this.header.blockTableEntries }, (_, index) => {
      const offset = index * 16;
      return {
        offset: data.readUInt32BE(offset),
        archivedSize: data.readUInt32BE(offset + 4),
        size: data.readUInt32BE(offset + 8),
        flags: data.readUInt32BE(offset + 12),
      };
    });
  }

  private readTable(table: "hash" | "block"): Buffer {
    const offset = table === "hash" ? this.header.hashTableOffset : this.header.blockTableOffset;
    const entries = table === "hash" ? this.header.hashTableEntries : this.header.blockTableEntries;
    const start = safeAdd(this.header.offset, offset);
    const end = safeAdd(start, entries * 16);
    assertRange(this.source, start, end);
    return decryptTable(this.source.subarray(start, end), mpqHash(`(${table} table)`, 3));
  }
}

function readHeader(source: Buffer, limits: MpqLimits): ArchiveHeader {
  if (source.length < 16) {
    throw new MpqError("INVALID_MPQ");
  }

  const magic = source.toString("binary", 0, 4);
  let offset = 0;
  let userDataHeader: UserDataHeader = { content: Buffer.alloc(0), mpqHeaderOffset: 0 };
  if (magic === "MPQ\x1b") {
    const userDataSize = source.readUInt32LE(4);
    offset = source.readUInt32LE(8);
    const userDataHeaderSize = source.readUInt32LE(12);
    if (userDataHeaderSize > userDataSize || offset < 16 || offset > source.length) {
      throw new MpqError("INVALID_MPQ");
    }
    assertRange(source, 16, safeAdd(16, userDataHeaderSize));
    userDataHeader = {
      content: Buffer.from(source.subarray(16, 16 + userDataHeaderSize)),
      mpqHeaderOffset: offset,
    };
  } else if (magic !== "MPQ\x1a") {
    throw new MpqError("INVALID_MPQ");
  }

  assertRange(source, offset, safeAdd(offset, 32));
  if (source.toString("binary", offset, offset + 4) !== "MPQ\x1a") {
    throw new MpqError("INVALID_MPQ");
  }
  const headerSize = source.readUInt32LE(offset + 4);
  const archiveSize = source.readUInt32LE(offset + 8);
  const formatVersion = source.readUInt16LE(offset + 12);
  const sectorSizeShift = source.readUInt16LE(offset + 14);
  const hashTableOffset = source.readUInt32LE(offset + 16);
  const blockTableOffset = source.readUInt32LE(offset + 20);
  const hashTableEntries = source.readUInt32LE(offset + 24);
  const blockTableEntries = source.readUInt32LE(offset + 28);
  const archiveEnd = safeAdd(offset, archiveSize);
  if (
    headerSize < 32 ||
    formatVersion > 3 ||
    sectorSizeShift > 16 ||
    archiveSize < headerSize ||
    archiveEnd > source.length
  ) {
    throw new MpqError("INVALID_MPQ");
  }
  if (
    hashTableEntries === 0 ||
    blockTableEntries === 0 ||
    hashTableEntries > limits.maxTableEntries ||
    blockTableEntries > limits.maxTableEntries
  ) {
    throw new MpqError(
      hashTableEntries > limits.maxTableEntries || blockTableEntries > limits.maxTableEntries
        ? "MPQ_LIMIT_EXCEEDED"
        : "INVALID_MPQ",
    );
  }
  const hashTableStart = safeAdd(offset, hashTableOffset);
  const hashTableEnd = safeAdd(hashTableStart, hashTableEntries * 16);
  const blockTableStart = safeAdd(offset, blockTableOffset);
  const blockTableEnd = safeAdd(blockTableStart, blockTableEntries * 16);
  if (hashTableEnd > archiveEnd || blockTableEnd > archiveEnd) {
    throw new MpqError("INVALID_MPQ");
  }
  assertRange(source, hashTableStart, hashTableEnd);
  assertRange(source, blockTableStart, blockTableEnd);

  return {
    offset,
    archiveSize,
    sectorSizeShift,
    hashTableOffset,
    blockTableOffset,
    hashTableEntries,
    blockTableEntries,
    userDataHeader,
  };
}

function assertRange(source: Buffer, start: number, end: number): void {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > source.length) {
    throw new MpqError("INVALID_MPQ");
  }
}

function safeAdd(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new MpqError("INVALID_MPQ");
  }
  return result;
}

const encryptionTable = createEncryptionTable();

function createEncryptionTable(): Uint32Array {
  const table = new Uint32Array(0x500);
  let seed = 0x00100001;
  for (let index = 0; index < 0x100; index += 1) {
    let target = index;
    for (let round = 0; round < 5; round += 1) {
      seed = (Math.imul(seed, 125) + 3) % 0x2aaaab;
      const high = (seed & 0xffff) << 16;
      seed = (Math.imul(seed, 125) + 3) % 0x2aaaab;
      table[target] = (high | (seed & 0xffff)) >>> 0;
      target += 0x100;
    }
  }
  return table;
}

function mpqHash(value: string, type: number): number {
  let seed1 = 0x7fed7fed;
  let seed2 = 0xeeeeeeee;
  for (const character of value.toUpperCase()) {
    const code = character.codePointAt(0)!;
    const tableValue = encryptionTable[(type << 8) + code];
    if (tableValue === undefined) {
      throw new MpqError("INVALID_MPQ");
    }
    seed1 = (tableValue ^ ((seed1 + seed2) >>> 0)) >>> 0;
    seed2 = (seed1 + seed2 + code + ((seed2 << 5) >>> 0) + 3) >>> 0;
  }
  return seed1;
}

function decryptTable(encrypted: Buffer, key: number): Buffer {
  if (encrypted.length % 4 !== 0) {
    throw new MpqError("INVALID_MPQ");
  }
  const plain = Buffer.alloc(encrypted.length);
  let seed1 = key >>> 0;
  let seed2 = 0xeeeeeeee;
  for (let offset = 0; offset < encrypted.length; offset += 4) {
    seed2 = (seed2 + encryptionTable[0x400 + (seed1 & 0xff)]!) >>> 0;
    const value = (encrypted.readUInt32LE(offset) ^ ((seed1 + seed2) >>> 0)) >>> 0;
    plain.writeUInt32BE(value, offset);
    seed1 = ((((~seed1 << 21) >>> 0) + 0x11111111) | (seed1 >>> 11)) >>> 0;
    seed2 = (value + seed2 + ((seed2 << 5) >>> 0) + 3) >>> 0;
  }
  return plain;
}
