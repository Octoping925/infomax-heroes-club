# Player Teammate Frequency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/stats` tab that shows how often the selected player shared a match team with every other encountered player.

**Architecture:** Reuse the existing year-aware team-composer query because it already returns every pair's encounter count, same-team count, and percentage. Add one pure row selector with a focused test, then render its output in a small tab component using the existing player and year contexts.

**Tech Stack:** Next.js App Router, React 19, TypeScript, TanStack Query, Tailwind CSS, Vitest

## Global Constraints

- Count one `Match` as one encounter; ignore individual games and in-match team changes.
- Calculate `sameTeamMatches / encounterMatches × 100` using the existing team-composer API result.
- Apply the existing Korean-year filter.
- Sort by same-team rate descending, then same-team count descending, then nickname ascending.
- Reuse existing dependencies and add no database migration.
- Preserve unrelated working-tree changes.

---

### Task 1: Select and sort teammate rows

**Files:**
- Create: `app/stats/components/teammate-frequency.ts`
- Test: `app/stats/components/teammate-frequency.spec.ts`

**Interfaces:**
- Consumes: `TeamingPairStatResponse` and player identity fields from `TeamingPlayerProfileResponse`.
- Produces: `buildTeammateRows(selectedPlayerId, players, pairs): TeammateRow[]`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildTeammateRows } from "./teammate-frequency";

describe("buildTeammateRows", () => {
  it("선택 플레이어의 동팀 빈도를 비율과 횟수 순으로 정렬한다", () => {
    const players = [
      { playerId: "p1", playerName: "일", playerNickname: "하나" },
      { playerId: "p2", playerName: "이", playerNickname: "둘" },
      { playerId: "p3", playerName: "삼", playerNickname: "셋" },
      { playerId: "p4", playerName: "사", playerNickname: "넷" },
    ];
    const pairs = [
      { playerAId: "p1", playerBId: "p2", allTime: { encounterMatches: 10, sameTeamMatches: 6, sameTeamRate: 60 }, recent6: { encounterMatches: 0, sameTeamMatches: 0, sameTeamRate: 0 } },
      { playerAId: "p3", playerBId: "p1", allTime: { encounterMatches: 5, sameTeamMatches: 3, sameTeamRate: 60 }, recent6: { encounterMatches: 0, sameTeamMatches: 0, sameTeamRate: 0 } },
      { playerAId: "p2", playerBId: "p3", allTime: { encounterMatches: 4, sameTeamMatches: 4, sameTeamRate: 100 }, recent6: { encounterMatches: 0, sameTeamMatches: 0, sameTeamRate: 0 } },
    ];

    expect(buildTeammateRows("p1", players, pairs)).toEqual([
      { player: players[1], encounterMatches: 10, sameTeamMatches: 6, sameTeamRate: 60 },
      { player: players[2], encounterMatches: 5, sameTeamMatches: 3, sameTeamRate: 60 },
    ]);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- app/stats/components/teammate-frequency.spec.ts`

Expected: FAIL because `./teammate-frequency` does not exist.

- [ ] **Step 3: Add the minimal row selector**

```ts
import type { TeamingPairStatResponse, TeamingPlayerProfileResponse } from "@/app/api/stats/types";

type TeammatePlayer = Pick<TeamingPlayerProfileResponse, "playerId" | "playerName" | "playerNickname">;

export type TeammateRow = {
  readonly player: TeammatePlayer;
  readonly encounterMatches: number;
  readonly sameTeamMatches: number;
  readonly sameTeamRate: number;
};

export function buildTeammateRows(
  selectedPlayerId: string,
  players: ReadonlyArray<TeammatePlayer>,
  pairs: ReadonlyArray<TeamingPairStatResponse>,
): TeammateRow[] {
  const playerById = new Map(players.map((player) => [player.playerId, player]));

  return pairs
    .flatMap((pair) => {
      const otherPlayerId =
        pair.playerAId === selectedPlayerId
          ? pair.playerBId
          : pair.playerBId === selectedPlayerId
            ? pair.playerAId
            : null;
      const player = otherPlayerId ? playerById.get(otherPlayerId) : undefined;
      return player ? [{ player, ...pair.allTime }] : [];
    })
    .toSorted(
      (left, right) =>
        right.sameTeamRate - left.sameTeamRate ||
        right.sameTeamMatches - left.sameTeamMatches ||
        left.player.playerNickname.localeCompare(right.player.playerNickname),
    );
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- app/stats/components/teammate-frequency.spec.ts`

Expected: one passing test.

- [ ] **Step 5: Commit the tested selector**

```bash
git add app/stats/components/teammate-frequency.ts app/stats/components/teammate-frequency.spec.ts
git commit -m "feat: calculate player teammate frequency rows"
```

### Task 2: Add the teammate frequency tab

**Files:**
- Create: `app/stats/components/teammate-frequency-tab.tsx`
- Modify: `app/stats/components/StatsPage.tsx`

**Interfaces:**
- Consumes: `SelectedPlayerContext`, `useTeamComposerData()`, and `buildTeammateRows()`.
- Produces: `TeammateFrequencyTab` rendered for the `teammateFrequency` hash tab.

- [ ] **Step 1: Add the tab component**

```tsx
"use client";

import { useContext } from "react";
import { SelectedPlayerContext } from "./StatsPage";
import { useTeamComposerData } from "../hooks/useTeamComposerData";
import { buildTeammateRows } from "./teammate-frequency";

export function TeammateFrequencyTab() {
  const selectedPlayer = useContext(SelectedPlayerContext);
  const { data, error } = useTeamComposerData();
  const rows = selectedPlayer ? buildTeammateRows(selectedPlayer.id, data.players, data.pairs) : [];

  if (error) return <p className="py-12 text-center text-red-400">❌ {error.message}</p>;
  if (!selectedPlayer || rows.length === 0) {
    return <p className="py-12 text-center text-gray-500">함께 참가한 멤버 데이터가 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">두 사람이 함께 참가한 매치 중 같은 팀이었던 비율입니다.</p>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-white/5 text-gray-300">
            <tr>
              <th className="px-4 py-3 text-left">다른 멤버</th>
              <th className="px-4 py-3 text-right">같은 팀</th>
              <th className="px-4 py-3 text-right">함께 참가</th>
              <th className="px-4 py-3 text-right">같은 팀 비율</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.player.playerId} className="border-t border-white/10 hover:bg-white/[0.06]">
                <td className="px-4 py-3 text-white"><span className="font-medium">{row.player.playerName}</span><span className="ml-2 text-xs text-gray-400">{row.player.playerNickname}</span></td>
                <td className="px-4 py-3 text-right text-gray-200">{row.sameTeamMatches}</td>
                <td className="px-4 py-3 text-right text-gray-200">{row.encounterMatches}</td>
                <td className="px-4 py-3 text-right font-medium text-cyan-300">{row.sameTeamRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register and render the tab**

Add `teammateFrequency` to `TabType`, add `{ id: "teammateFrequency", label: "팀 동료", mobileLabel: "팀 동료", icon: "👥" }` to `TABS`, include it in `SHOW_PLAYER_SIDEBAR_TABS`, and render `<TeammateFrequencyTab />` for the active tab.

- [ ] **Step 3: Run focused and static verification**

Run: `npm test -- app/stats/components/teammate-frequency.spec.ts`

Expected: one passing test.

Run: `npm run lint -- app/stats/components/teammate-frequency.ts app/stats/components/teammate-frequency.spec.ts app/stats/components/teammate-frequency-tab.tsx app/stats/components/StatsPage.tsx`

Expected: zero lint errors.

Run: `npm run ts:check`

Expected: exit code 0.

- [ ] **Step 4: Verify the production build**

Run: `npm run build`

Expected: Next.js production build exits with code 0.

- [ ] **Step 5: Commit the tab**

```bash
git add app/stats/components/teammate-frequency-tab.tsx app/stats/components/StatsPage.tsx
git commit -m "feat: add teammate frequency stats tab"
```

### Task 3: Review and publish

**Files:**
- Review only the files listed in Tasks 1 and 2 plus this plan and its design document.

**Interfaces:**
- Consumes: the verified feature commits.
- Produces: a reviewed branch pushed to its configured remote.

- [ ] **Step 1: Review the scoped diff**

Run the repository code-review workflow against the feature commits, fix actionable findings, and repeat focused verification for any changed file.

- [ ] **Step 2: Confirm repository state and commit documentation**

Run `git status --short`, stage only the plan and design document if still modified, then commit them with `docs: plan teammate frequency stats`.

- [ ] **Step 3: Push the current branch**

Run `git push` and confirm the remote accepts all feature commits.
