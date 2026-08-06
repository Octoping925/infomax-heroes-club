export type ReplayErrorCode =
  | "INVALID_MPQ"
  | "MPQ_LIMIT_EXCEEDED"
  | "MPQ_MISSING_MEMBER"
  | "MPQ_ENCRYPTED_MEMBER"
  | "MPQ_UNSUPPORTED_COMPRESSION"
  | "MPQ_MEMBER_SIZE_MISMATCH"
  | "INVALID_REPLAY"
  | "UNSUPPORTED_BUILD"
  | "UNSUPPORTED_MAP"
  | "UNSUPPORTED_HERO"
  | "INCOMPLETE_REPLAY"
  | "WINNER_NOT_FOUND"
  | "INVALID_TEAM_SIZE"
  | "DUPLICATE_PLAYER";

const KOREAN_MESSAGES: Readonly<Record<ReplayErrorCode, string>> = {
  INVALID_MPQ: "올바른 히어로즈 리플레이 파일이 아닙니다.",
  MPQ_LIMIT_EXCEEDED: "리플레이 내부 데이터가 허용된 크기 또는 개수를 초과했습니다.",
  MPQ_MISSING_MEMBER: "리플레이에 필요한 데이터가 없습니다.",
  MPQ_ENCRYPTED_MEMBER: "암호화된 리플레이 데이터는 지원하지 않습니다.",
  MPQ_UNSUPPORTED_COMPRESSION: "지원하지 않는 리플레이 압축 형식입니다.",
  MPQ_MEMBER_SIZE_MISMATCH: "리플레이 내부 데이터 크기가 올바르지 않습니다.",
  INVALID_REPLAY: "리플레이를 해석할 수 없습니다.",
  UNSUPPORTED_BUILD: "지원하지 않는 게임 빌드입니다.",
  UNSUPPORTED_MAP: "지원하지 않는 전장입니다.",
  UNSUPPORTED_HERO: "지원하지 않는 영웅이 포함되어 있습니다.",
  INCOMPLETE_REPLAY: "완료되지 않은 경기는 등록할 수 없습니다.",
  WINNER_NOT_FOUND: "승리 팀을 확인할 수 없습니다.",
  INVALID_TEAM_SIZE: "각 팀은 정확히 5명이어야 합니다.",
  DUPLICATE_PLAYER: "한 경기 안에 중복된 선수가 있습니다.",
};

export class ReplayParseError extends Error {
  readonly code: ReplayErrorCode;
  readonly details?: Readonly<Record<string, string | number>>;

  constructor(code: ReplayErrorCode, details?: Readonly<Record<string, string | number>>) {
    super(`${code}: ${KOREAN_MESSAGES[code]}`);
    this.name = "ReplayParseError";
    this.code = code;
    this.details = details;
  }

  get userMessage(): string {
    return KOREAN_MESSAGES[this.code];
  }
}
