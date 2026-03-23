import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  getAdminSessionCookieOptions,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from "@/config/admin-auth";

type LoginRequestBody = {
  readonly password?: string;
};

export async function POST(request: NextRequest): Promise<NextResponse<{ success: true } | { error: string }>> {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json({ error: "ADMIN_ACCESS_PASSWORD 환경 변수가 설정되지 않았습니다." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as LoginRequestBody | null;
  const password = body?.password;

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true as const });
  response.cookies.set(getAdminSessionCookieOptions());
  return response;
}

export async function DELETE(): Promise<NextResponse<{ success: true }>> {
  const response = NextResponse.json({ success: true as const });
  response.cookies.delete(ADMIN_SESSION_COOKIE_NAME);
  return response;
}
