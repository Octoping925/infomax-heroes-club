import { NextRequest, NextResponse } from "next/server";

type RequestBody = {
  team1: Team;
  team2: Team;
};

type Team = {
  players: Player[];
  win: boolean;
};

type Player = {
  name: string;
  hero: string;

  kills: number;
  deaths: number;
  takedowns: number;
  damage: number;
  takenDamage: number;
};

export async function POST(request: NextRequest) {
  const body: RequestBody = await request.json();

  console.log(body);
  // TODO: DB에 게임 결과 저장

  return new NextResponse("success");
}
