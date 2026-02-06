export class MatchServiceError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "MatchServiceError";
    this.status = status;
  }
}
