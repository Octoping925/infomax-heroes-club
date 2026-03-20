CREATE TABLE "game_team_member_talents" (
    "id" TEXT NOT NULL,
    "gameTeamMemberId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "rawCode" TEXT NOT NULL,
    "talentKey" TEXT,

    CONSTRAINT "game_team_member_talents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "game_team_member_talents_gameTeamMemberId_tier_key"
ON "game_team_member_talents"("gameTeamMemberId", "tier");

CREATE INDEX "game_team_member_talents_talentKey_idx"
ON "game_team_member_talents"("talentKey");

ALTER TABLE "game_team_member_talents"
ADD CONSTRAINT "game_team_member_talents_gameTeamMemberId_fkey"
FOREIGN KEY ("gameTeamMemberId") REFERENCES "game_team_members"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
