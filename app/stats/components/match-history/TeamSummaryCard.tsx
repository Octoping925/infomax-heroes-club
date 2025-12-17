interface TeamSummaryCardProps {
  title: string;
  leaderNickname: string;
  members: string[];
  accent: string;
}

export function TeamSummaryCard({
  title,
  leaderNickname,
  members,
  accent,
}: TeamSummaryCardProps) {
  return (
    <div className={`w-36 bg-white/5 rounded-xl p-4 border ${accent}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
      </div>
      {members.map((member) => (
        <p key={member} className="text-xs text-gray-300 mt-2 truncate">
          {leaderNickname === member ? `${member} - 👑` : member}
        </p>
      ))}
    </div>
  );
}
