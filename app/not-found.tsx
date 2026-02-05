import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white flex items-center justify-center px-6">
      <div className="text-center space-y-8 max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-9xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-orange-500 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-3xl font-bold">페이지를 찾을 수 없습니다</h2>
          <p className="text-xl text-gray-400">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 rounded-xl text-white font-medium transition-all shadow-lg shadow-cyan-500/25"
          >
            ← 홈으로 돌아가기
          </Link>
          <Link
            href="/stats"
            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all"
          >
            통계 보기
          </Link>
        </div>

        <div className="pt-8">
          <div className="w-64 h-64 mx-auto bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full flex items-center justify-center border border-white/10">
            <div className="text-8xl opacity-50">🎮</div>
          </div>
        </div>
      </div>
    </div>
  );
}
