import { gzipSync } from "node:zlib";

const FILE_EXISTS = 0x80000000;
const FILE_COMPRESS = 0x00000200;
const FILE_SINGLE_UNIT = 0x01000000;

type SyntheticMember = {
  readonly name: string;
  readonly content: Buffer;
  readonly declaredSize?: number;
  readonly compression?: "none" | "zlib" | "bzip" | "unsupported";
  readonly flags?: number;
};

export function createSyntheticMpq(
  members: ReadonlyArray<SyntheticMember>,
  options: {
    readonly userData?: Buffer;
    readonly hashTableEntries?: number;
    readonly blockTableEntries?: number;
  } = {},
): Buffer {
  const userData = options.userData ?? Buffer.from("synthetic-header");
  const mpqOffset = 16 + userData.length;
  const hashEntries = options.hashTableEntries ?? members.length;
  const blockEntries = options.blockTableEntries ?? members.length;
  const hashOffset = 32;
  const blockOffset = hashOffset + hashEntries * 16;

  const archivedMembers = members.map((member) => encodeMember(member));
  let memberOffset = blockOffset + blockEntries * 16;
  const blockRows = archivedMembers.map((member, index) => {
    const row = {
      offset: memberOffset,
      archivedSize: member.data.length,
      size: members[index]?.declaredSize ?? member.outputSize,
      flags: members[index]?.flags ?? member.flags,
    };
    memberOffset += member.data.length;
    return row;
  });

  const archive = Buffer.alloc(memberOffset);
  archive.write("MPQ\x1a", 0, "binary");
  archive.writeUInt32LE(32, 4);
  archive.writeUInt32LE(archive.length, 8);
  archive.writeUInt16LE(0, 12);
  archive.writeUInt16LE(3, 14);
  archive.writeUInt32LE(hashOffset, 16);
  archive.writeUInt32LE(blockOffset, 20);
  archive.writeUInt32LE(hashEntries, 24);
  archive.writeUInt32LE(blockEntries, 28);

  const hashTable = Buffer.alloc(hashEntries * 16, 0xff);
  members.forEach((member, index) => {
    hashTable.writeUInt32BE(mpqHash(member.name, 1), index * 16);
    hashTable.writeUInt32BE(mpqHash(member.name, 2), index * 16 + 4);
    hashTable.writeUInt16BE(0, index * 16 + 8);
    hashTable.writeUInt16BE(0, index * 16 + 10);
    hashTable.writeUInt32BE(index, index * 16 + 12);
  });
  encryptTable(hashTable, mpqHash("(hash table)", 3)).copy(archive, hashOffset);

  const blockTable = Buffer.alloc(blockEntries * 16);
  blockRows.forEach((row, index) => {
    blockTable.writeUInt32BE(row.offset, index * 16);
    blockTable.writeUInt32BE(row.archivedSize, index * 16 + 4);
    blockTable.writeUInt32BE(row.size, index * 16 + 8);
    blockTable.writeUInt32BE(row.flags >>> 0, index * 16 + 12);
  });
  encryptTable(blockTable, mpqHash("(block table)", 3)).copy(archive, blockOffset);

  archivedMembers.forEach((member, index) => {
    member.data.copy(archive, blockRows[index]!.offset);
  });

  const result = Buffer.alloc(mpqOffset + archive.length);
  result.write("MPQ\x1b", 0, "binary");
  result.writeUInt32LE(userData.length, 4);
  result.writeUInt32LE(mpqOffset, 8);
  result.writeUInt32LE(userData.length, 12);
  userData.copy(result, 16);
  archive.copy(result, mpqOffset);
  return result;
}

function encodeMember(member: SyntheticMember): {
  readonly data: Buffer;
  readonly outputSize: number;
  readonly flags: number;
} {
  switch (member.compression ?? "none") {
    case "none":
      return {
        data: member.content,
        outputSize: member.content.length,
        flags: FILE_EXISTS | FILE_SINGLE_UNIT,
      };
    case "zlib":
      return {
        data: Buffer.concat([Buffer.from([2]), gzipSync(member.content)]),
        outputSize: member.content.length,
        flags: FILE_EXISTS | FILE_SINGLE_UNIT | FILE_COMPRESS,
      };
    case "bzip":
      return {
        data: Buffer.concat([Buffer.from([16]), member.content]),
        outputSize: member.declaredSize ?? member.content.length,
        flags: FILE_EXISTS | FILE_SINGLE_UNIT | FILE_COMPRESS,
      };
    case "unsupported":
      return {
        data: Buffer.concat([Buffer.from([64]), member.content]),
        outputSize: member.content.length + 2,
        flags: FILE_EXISTS | FILE_SINGLE_UNIT | FILE_COMPRESS,
      };
  }
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
    const tableValue = encryptionTable[(type << 8) + code]!;
    seed1 = (tableValue ^ ((seed1 + seed2) >>> 0)) >>> 0;
    seed2 = (seed1 + seed2 + code + ((seed2 << 5) >>> 0) + 3) >>> 0;
  }
  return seed1;
}

function encryptTable(plain: Buffer, key: number): Buffer {
  const encrypted = Buffer.alloc(plain.length);
  let seed1 = key >>> 0;
  let seed2 = 0xeeeeeeee;
  for (let offset = 0; offset < plain.length; offset += 4) {
    seed2 = (seed2 + encryptionTable[0x400 + (seed1 & 0xff)]!) >>> 0;
    const value = plain.readUInt32BE(offset);
    encrypted.writeUInt32LE((value ^ ((seed1 + seed2) >>> 0)) >>> 0, offset);
    seed1 = ((((~seed1 << 21) >>> 0) + 0x11111111) | (seed1 >>> 11)) >>> 0;
    seed2 = (value + seed2 + ((seed2 << 5) >>> 0) + 3) >>> 0;
  }
  return encrypted;
}
