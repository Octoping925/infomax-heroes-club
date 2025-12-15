"use client";

import { useState } from "react";
import Link from "next/link";

type GameInput = {
  statsText: string;
  winnerTeamNumber: number | null;
};

type MatchType = "LUNCH" | "DINNER";

/**
 * 내전 경기 입력 페이지
 */
export default function MatchInputPage() {
  const [playedAt, setPlayedAt] = useState<string>("");
  const [matchType, setMatchType] = useState<MatchType>("LUNCH");
  const [team1Leader, setTeam1Leader] = useState<string>("");
  const [team2Leader, setTeam2Leader] = useState<string>("");
  const [games, setGames] = useState<GameInput[]>([
    { statsText: "", winnerTeamNumber: null },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleAddGame = () => {
    setGames([...games, { statsText: "", winnerTeamNumber: null }]);
  };

  const handleRemoveGame = (index: number) => {
    if (games.length > 1) {
      setGames(games.filter((_, i) => i !== index));
    }
  };

  const handleGameChange = (
    index: number,
    field: keyof GameInput,
    value: string | number | null
  ) => {
    const newGames = [...games];
    if (field === "winnerTeamNumber") {
      newGames[index].winnerTeamNumber =
        value === "draw" ? null : Number(value);
    } else {
      newGames[index][field] = value as string;
    }
    setGames(newGames);
  };

  const handleSubmit = async () => {
    if (!playedAt) {
      setResult({ success: false, message: "날짜를 입력해주세요." });
      return;
    }

    if (!team1Leader.trim() || !team2Leader.trim()) {
      setResult({
        success: false,
        message: "팀 리더의 닉네임을 입력해주세요.",
      });
      return;
    }

    if (games.some((g) => !g.statsText.trim())) {
      setResult({
        success: false,
        message: "모든 게임의 스탯을 입력해주세요.",
      });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playedAt,
          type: matchType,
          games,
          team1Leader,
          team2Leader,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `내전이 성공적으로 저장되었습니다! (${data.gamesCreated}경기)`,
        });
        // 폼 초기화
        setPlayedAt("");
        setTeam1Leader("");
        setTeam2Leader("");
        setGames([{ statsText: "", winnerTeamNumber: null }]);
      } else {
        setResult({
          success: false,
          message: data.error || "저장에 실패했습니다.",
        });
      }
    } catch {
      setResult({
        success: false,
        message: "네트워크 오류가 발생했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      {/* 헤더 */}
      <header className="w-full px-6 py-4 border-b border-white/10 backdrop-blur-xl sticky top-0 z-50 bg-[#0a0a12]/90">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-orange-500 bg-clip-text text-transparent">
            📝 내전 경기 입력
          </h1>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all"
          >
            ← 홈으로
          </Link>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="w-full px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 기본 정보 카드 */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-bold mb-6">기본 정보</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">
                  내전 날짜
                </label>
                <input
                  type="text"
                  value={playedAt}
                  onChange={(e) => setPlayedAt(e.target.value)}
                  placeholder="20251212"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
                <p className="text-xs text-gray-500">
                  yyyyMMdd 형식 (예: 20251212)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">
                  내전 종류
                </label>
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value as MatchType)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                >
                  <option value="LUNCH" className="bg-[#1a1a2e]">
                    점심 내전
                  </option>
                  <option value="DINNER" className="bg-[#1a1a2e]">
                    저녁 내전
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">
                  팀 1 리더
                </label>
                <input
                  type="text"
                  value={team1Leader}
                  onChange={(e) => setTeam1Leader(e.target.value)}
                  placeholder="리더 닉네임 입력"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">
                  팀 2 리더
                </label>
                <input
                  type="text"
                  value={team2Leader}
                  onChange={(e) => setTeam2Leader(e.target.value)}
                  placeholder="리더 닉네임 입력"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* 경기 입력 카드들 */}
          {games.map((game, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">{index + 1}번째 경기</h3>
                    <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm">
                      Game {index + 1}
                    </span>
                  </div>

                  {games.length > 1 && (
                    <button
                      onClick={() => handleRemoveGame(index)}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm font-medium text-red-400 transition-all"
                    >
                      삭제
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">
                    승리 팀
                  </label>
                  <select
                    value={
                      game.winnerTeamNumber === null
                        ? "draw"
                        : String(game.winnerTeamNumber)
                    }
                    onChange={(e) =>
                      handleGameChange(
                        index,
                        "winnerTeamNumber",
                        e.target.value
                      )
                    }
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  >
                    <option value="1" className="bg-[#1a1a2e]">
                      1팀 승리
                    </option>
                    <option value="2" className="bg-[#1a1a2e]">
                      2팀 승리
                    </option>
                    <option value="draw" className="bg-[#1a1a2e]">
                      무승부
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">
                    게임 스탯
                  </label>
                  <textarea
                    value={game.statsText}
                    onChange={(e) =>
                      handleGameChange(index, "statsText", e.target.value)
                    }
                    placeholder={`[영원의 전쟁터]
<Team 1: Level 19>
[닉네임 (영웅)]
Kill: 0 / Death: 0 / Takedown: 0
가한 데미지: 0 / 공성 데미지: 0 / 받은 데미지: 0
...

<Team 2: Level 20>
...`}
                    className="w-full h-64 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-mono text-sm resize-y"
                  />
                  <p className="text-xs text-gray-500">
                    게임 결과 화면의 스탯을 복사하여 붙여넣기 해주세요
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* 경기 추가 버튼 */}
          <button
            onClick={handleAddGame}
            className="w-full px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-white font-medium transition-all"
          >
            + 경기 추가
          </button>

          {/* 결과 메시지 */}
          {result && (
            <div
              className={`p-4 rounded-xl border ${
                result.success
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              <p className="font-medium">
                {result.success ? "✅ " : "❌ "}
                {result.message}
              </p>
            </div>
          )}

          {/* 저장 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full px-6 py-4 rounded-xl text-white font-bold text-lg transition-all shadow-lg ${
              isSubmitting
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 shadow-cyan-500/25"
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                저장 중...
              </span>
            ) : (
              "내전 저장하기"
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
