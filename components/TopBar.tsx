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
          <NavLink label="홈" href="/" isSelected={value === "home"} />
          <NavLink label="통계" href="/stats" isSelected={value === "stats"} />
          <NavLink label="단어장" href="/glossary" isSelected={value === "glossary"} />
          <NavLink label="갤러리" href="/gallery" isSelected={value === "gallery"} />
          <NavLink label="경기입력" href="/admin/match" isSelected={value === "match"} />
          <NavLink label="밴입력" href="/admin/match/bans" isSelected={value === "bans"} />
          <NavLink label="전적입력" href="/admin/match/stats" isSelected={value === "match-stats"} />

        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, label, isSelected }: { href: string; label: string, isSelected: boolean }) {
  return (
    <Link href={href} className={`px-4 py-2 rounded-lg text-sm font-medium ${isSelected ? selectedStyle : unselectedStyle}`}>
      {label}
    </Link>
  );
}
