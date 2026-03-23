import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE_NAME = "ihc-admin-session";

const DEFAULT_ADMIN_HOME = "/admin/strategy";

export function getAdminAccessPassword(): string {
  return process.env.ADMIN_ACCESS_PASSWORD ?? "";
}

export function isAdminPasswordConfigured(): boolean {
  return getAdminAccessPassword().length > 0;
}

export function verifyAdminPassword(input: string): boolean {
  const configured = getAdminAccessPassword();
  if (!configured) {
    return false;
  }
  return safeCompare(input, configured);
}

export function createAdminSessionToken(): string {
  return hashValue(`infomax-heroes-club:admin:${getAdminAccessPassword()}`);
}

export function verifyAdminSessionToken(token: string | null | undefined): boolean {
  if (!token || !isAdminPasswordConfigured()) {
    return false;
  }
  return safeCompare(token, createAdminSessionToken());
}

export function normalizeNextPath(input: string | null | undefined): string {
  if (!input || !input.startsWith("/") || input.startsWith("//")) {
    return DEFAULT_ADMIN_HOME;
  }
  return input;
}

export function getAdminSessionCookieOptions() {
  return {
    name: ADMIN_SESSION_COOKIE_NAME,
    value: createAdminSessionToken(),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
