import { PlayerListItem } from "@/app/api/players/route";

interface Props {
  readonly players: PlayerListItem[];
  readonly setSelectedPlayerId: (playerId: string) => void;
  readonly selectedPlayer: PlayerListItem | null;
}

export function PlayerSidebar({ players, setSelectedPlayerId, selectedPlayer }: Props) {
  return (
    <aside className="w-64 max-lg:w-full shrink-0">
      <div className="sticky top-24 bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">플레이어 목록</h3>

        <div className="flex lg:flex-col gap-2 space-y-1 max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-hide">
          {players.map((player) => (
            <button
              key={player.id}
              onClick={() => setSelectedPlayerId(player.id)}
              className={`w-ful min-w-32 text-left px-3 py-2 rounded-lg text-sm transition-all ${
                selectedPlayer?.id === player.id
                  ? "bg-cyan-500 text-white"
                  : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="font-medium">{player.name}</div>
              <div className="text-xs opacity-75">{player.nickname}</div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
