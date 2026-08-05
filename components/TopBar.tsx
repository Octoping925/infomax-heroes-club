import Link from "next/link";

interface TopBarProps {
  readonly title: string;
  readonly value: string;
}

const selectedStyle = "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25";
const unselectedStyle = "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all";

export function TopBar({ value = "home", title }: TopBarProps) {
  return (
    <header className="w-full px-4 md:px-6 py-3 md:py-4 border-b border-white/10 backdrop-blur-xl sticky top-0 z-50 bg-[#0a0a12]/90">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center gap-3 md:gap-4 md:justify-between">
        <h1 className="text-base sm:text-lg md:text-xl font-bold">{title}</h1>

        <nav className="-mx-1 md:mx-0 overflow-x-auto scrollbar-hide">
          <div className="flex w-max gap-2 px-1 md:px-0">
            <NavLink label="홈" href="/" isSelected={value === "home"} />
            <NavLink label="통계" href="/stats" isSelected={value === "stats"} />
            <NavLink label="단어장" href="/glossary" isSelected={value === "glossary"} />
            <NavLink label="갤러리" href="/gallery" isSelected={value === "gallery"} />
            <NavLink label="전적" href="/match-history" isSelected={value === "match-history"} />
            <NavLink label="경기입력" href="/admin/match" isSelected={value === "match"} />
            {/* <NavLink label="밴입력" href="/admin/match/bans" isSelected={value === "bans"} />
            <NavLink label="전적입력" href="/admin/match/stats" isSelected={value === "match-stats"} /> */}
          </div>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, label, isSelected }: { href: string; label: string; isSelected: boolean }) {
  return (
    <Link
      href={href}
      className={`shrink-0 whitespace-nowrap px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs sm:text-sm font-medium ${isSelected ? selectedStyle : unselectedStyle}`}
      aria-current={isSelected ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
