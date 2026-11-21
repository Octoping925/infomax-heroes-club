import type { DoorayBotMessage } from "@/domain/dooray/types";
import type { MatchupPreviewResponse } from "@/domain/hots/service/matchup-preview";
import { HeroRoleLabelMap } from "@/domain/hots/models";

function formatMemberList(
  roster: MatchupPreviewResponse["teamA"]["roster"],
): string {
  return roster
    .map((member) => {
      const role = member.primaryRole ? HeroRoleLabelMap[member.primaryRole] : "-";
      const leaderMark = member.isLeader ? "👑 " : "";
      return `${leaderMark}${member.playerNickname} (${role}, 최근 ${member.recentStats.winRate}%)`;
    })
    .join("\n");
}

function formatCompactNames(roster: MatchupPreviewResponse["teamA"]["roster"]): string {
  return roster.map((member) => (member.isLeader ? `👑${member.playerNickname}` : member.playerNickname)).join(", ");
}

export function formatMatchupShareText(preview: MatchupPreviewResponse, pageUrl: string): string {
  const typeLabel = preview.matchType === "LUNCH" ? "점심 내전" : "저녁 내전";
  const lines: string[] = [
    `⚔️ [연합인포맥스 히오스 ${typeLabel} 대진표 확정!]`,
    `예상 승률: A팀 ${preview.probability.teamA}% vs B팀 ${preview.probability.teamB}%`,
    "",
    `🟦 A팀 (${preview.teamA.roster.length}명): ${formatCompactNames(preview.teamA.roster)}`,
    `🟧 B팀 (${preview.teamB.roster.length}명): ${formatCompactNames(preview.teamB.roster)}`,
  ];

  if (preview.storylines.length > 0) {
    lines.push("", "📌 오늘의 관전 포인트");
    for (const story of preview.storylines.slice(0, 3)) {
      lines.push(`- [${story.badge}] ${story.title} — ${story.detail}`);
    }
  }

  lines.push("", `📊 상세 매치업 프리뷰: ${pageUrl}`);
  return lines.join("\n");
}

export function buildDoorayMatchupBotMessage(
  preview: MatchupPreviewResponse,
  pageUrl: string,
): DoorayBotMessage {
  const typeLabel = preview.matchType === "LUNCH" ? "점심 내전" : "저녁 내전";
  const storylineText =
    preview.storylines.length > 0
      ? preview.storylines
          .slice(0, 4)
          .map((story) => `• [${story.badge}] ${story.title} (${story.detail})`)
          .join("\n")
      : "새로운 조합의 맞대결입니다!";

  return {
    botName: "히오스 내전 알리미",
    text: `⚔️ **${typeLabel} 팀이 확정되었습니다!** (예상 승률 A팀 ${preview.probability.teamA}% vs B팀 ${preview.probability.teamB}%)`,
    attachments: [
      {
        fields: [
          {
            title: `🟦 A팀 (최근 평균 ${preview.teamA.averageRecentWinRate}%)`,
            value: formatMemberList(preview.teamA.roster),
            short: true,
          },
          {
            title: `🟧 B팀 (최근 평균 ${preview.teamB.averageRecentWinRate}%)`,
            value: formatMemberList(preview.teamB.roster),
            short: true,
          },
        ],
      },
      {
        title: "📌 오늘의 관전 포인트",
        text: `${storylineText}\n\n🔗 [매치업 프리뷰 열기](${pageUrl})`,
        color: "#06b6d4",
      },
    ],
  };
}
