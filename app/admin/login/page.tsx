import LoginForm from "./LoginForm";
import { isAdminPasswordConfigured, normalizeNextPath } from "@/config/admin-auth";

export const dynamic = "force-dynamic";

type PageProps = {
  readonly searchParams: Promise<{
    next?: string;
    reason?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const nextPath = normalizeNextPath(params.next);
  const isConfigured = isAdminPasswordConfigured();

  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.24),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.18),transparent_32%),linear-gradient(160deg,#07111f_0%,#0d172a_55%,#06080f_100%)]" />
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100">
                Heroes Club
              </div>
              <h2 className="max-w-2xl text-4xl font-black leading-tight text-white md:text-6xl">
                내전 전략 리포트와 경기 입력 도구를 위한 관리자 구역
              </h2>
              <p className="max-w-xl text-base leading-7 text-slate-300 md:text-lg">
                멤버 조합별 강한 맵, 시그니처 영웅, 맞상대 전적을 한 번에 보고 내전 픽/밴 준비에 바로 쓸 수 있게
                구성했습니다.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <InfoCard
                title="전략 리포트"
                description="우리 팀과 상대 팀 로스터를 넣으면 맵/영웅 기반 분석 보고서를 생성합니다."
              />
              <InfoCard
                title="경기 입력"
                description="JSON 기반 경기 등록과 밴/전적/특성 입력 페이지를 계속 사용할 수 있습니다."
              />
              <InfoCard
                title="비공개 접근"
                description="공개 네비게이션에 노출하지 않고 비밀번호 쿠키로 진입을 제어합니다."
              />
            </div>
          </section>

          <div className="flex justify-center lg:justify-end">
            <LoginForm
              defaultNextPath={nextPath}
              isConfigured={isConfigured}
              missingConfig={params.reason === "missing-config" || !isConfigured}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <p className="mb-2 text-sm font-semibold text-white">{title}</p>
      <p className="text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}
