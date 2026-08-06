import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  isAdminPasswordConfigured,
  normalizeNextPath,
  verifyAdminSessionToken,
} from "@/config/admin-auth";

const ADMIN_LOGIN_PATH = "/admin/login";
const ADMIN_SESSION_API_PATH = "/api/admin/session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value);

  if (pathname === ADMIN_LOGIN_PATH) {
    if (hasSession) {
      const nextPath = normalizeNextPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
    return NextResponse.next();
  }

  if (!requiresAdminAccess(pathname, request.method)) {
    return NextResponse.next();
  }

  if (!isAdminPasswordConfigured()) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "ADMIN_ACCESS_PASSWORD 환경 변수가 설정되지 않았습니다." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", normalizeNextPath(`${pathname}${search}`));
    loginUrl.searchParams.set("reason", "missing-config");
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "관리자 로그인이 필요합니다." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
  loginUrl.searchParams.set("next", normalizeNextPath(`${pathname}${search}`));
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/matches/:path*"],
};

function requiresAdminAccess(pathname: string, method: string): boolean {
  if (pathname.startsWith("/admin")) {
    return pathname !== ADMIN_LOGIN_PATH;
  }

  if (pathname.startsWith("/api/admin")) {
    return pathname !== ADMIN_SESSION_API_PATH;
  }

  if (pathname.startsWith("/api/matches")) {
    return !["GET", "HEAD", "OPTIONS"].includes(method);
  }

  return false;
}
