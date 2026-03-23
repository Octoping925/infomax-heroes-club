"use client";

import { SubmitEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  readonly defaultNextPath: string;
  readonly isConfigured: boolean;
  readonly missingConfig: boolean;
};

export default function LoginForm({ defaultNextPath, isConfigured, missingConfig }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "로그인에 실패했습니다.");
      }

      router.replace(defaultNextPath);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "로그인에 실패했습니다.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-black/35 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
      <div className="mb-8 space-y-3">
        <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
          Admin Access
        </div>
        <h1 className="text-3xl font-bold text-white">관리자 로그인</h1>
        <p className="text-sm leading-6 text-slate-300">
          공개 네비게이션에는 노출되지 않는 관리자 영역입니다. 비밀번호 쿠키로 접근을 제어합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">비밀번호</span>
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={!isConfigured || isSubmitting}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-400/60 focus:bg-white/10"
            placeholder="관리자 비밀번호"
          />
        </label>

        {(missingConfig || error) && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {missingConfig ? "서버에 ADMIN_ACCESS_PASSWORD 환경 변수가 없어 관리자 로그인을 받을 수 없습니다." : error}
          </div>
        )}

        {!missingConfig && !error && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            로그인 후 `/admin` 하위 페이지와 관리자용 API에 접근할 수 있습니다.
          </div>
        )}

        <button
          type="submit"
          disabled={!isConfigured || isSubmitting}
          className="w-full rounded-2xl bg-linear-to-r from-cyan-400 via-sky-500 to-blue-600 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
