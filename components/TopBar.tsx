import Link from "next/link";

interface TopBarProps {
  readonly title?: string;
  readonly description?: string;
  readonly value: string;
}

const selectedStyle = "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25";
const unselectedStyle =
  "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all";

export function TopBar({
  value = "home",
  title = "연합인포맥스 히오스 동호회",
  description = "Infomax Heroes Club",
}: TopBarProps) {
  return (
    <header className="w-full px-6 py-4 border-b border-white/10 backdrop-blur-xl sticky top-0 z-50 bg-[#0a0a12]/90">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <nav className="flex gap-2">
          <Link
            href="/"
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              value === "home" ? selectedStyle : unselectedStyle
            }`}
          >
            홈
          </Link>
          <Link
            href="/stats"
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              value === "stats" ? selectedStyle : unselectedStyle
            }`}
          >
            통계
          </Link>
          <Link
            href="/glossary"
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              value === "glossary" ? selectedStyle : unselectedStyle
            }`}
          >
            단어장
          </Link>
          <Link
            href="/gallery"
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              value === "gallery" ? selectedStyle : unselectedStyle
            }`}
          >
            갤러리
          </Link>
          <Link
            href="/admin/match"
            className={`px-4 py-2 rounded-lg text-sm font-medium max-lg:hidden ${
              value === "match" ? selectedStyle : unselectedStyle
            }`}
          >
            경기입력
          </Link>
          <Link
            href="/admin/match/bans"
            className={`px-4 py-2 rounded-lg text-sm font-medium max-lg:hidden ${
              value === "bans" ? selectedStyle : unselectedStyle
            }`}
          >
            밴입력
          </Link>
        </nav>
      </div>
    </header>
  );
}
