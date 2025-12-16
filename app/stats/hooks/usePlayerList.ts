import { PlayerListItem } from "@/app/api/players/route";
import { statsQueryKeys } from "@/config/query-keys";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

export function usePlayerList() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const {
    data: players = [],
    isPending: isLoadingPlayers,
    error: playersError,
  } = useQuery<PlayerListItem[]>({
    queryKey: statsQueryKeys.players(),
    queryFn: async () => {
      const response = await fetch("/api/players");
      if (!response.ok) {
        throw new Error("플레이어 목록을 불러오는 중 오류가 발생했습니다.");
      }
      return (await response.json()) as PlayerListItem[];
    },
  });

  const selectedPlayer = useMemo(() => {
    if (!players.length) return null;

    const hasSelected =
      selectedPlayerId &&
      players.some((player) => player.id === selectedPlayerId);

    const playerIdToUse = hasSelected
      ? selectedPlayerId
      : players[0]?.id ?? null;

    return (
      players.find((player) => player.id === playerIdToUse) ??
      players[0] ??
      null
    );
  }, [players, selectedPlayerId]);

  return {
    players,
    selectedPlayer,
    setSelectedPlayerId,
    isLoadingPlayers,
    playersError,
  };
}
