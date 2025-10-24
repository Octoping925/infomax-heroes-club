import { TIPS } from "@/app/api/hots-tip/tips";
import { NextResponse } from "next/server";

function getRandomTips(count: number) {
  const tipsCopy = [...TIPS];

  // Fisher–Yates shuffle을 살짝만 이용: 앞 count개만 랜덤 섞기
  for (let i = tipsCopy.length - 1; i > tipsCopy.length - 3; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tipsCopy[i], tipsCopy[j]] = [tipsCopy[j], tipsCopy[i]];
  }
  return tipsCopy.slice(-count);
}

export async function GET() {
  const tips = getRandomTips(2);

  await fetch(
    "https://infomax.dooray.com/services/3262462484277387103/4185584489094269528/I_-dFyZQSgOvidZnTBXvHg",
    // "https://infomax.dooray.com/services/3262462484277387103/4145159950514557822/6ZFFERWdTD2W2Epx4ouIDA",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        botName: "히오스 팁 봇",
        botIconImage:
          "https://infomax.dooray.com/messenger/v1/api/apps/4058807707438101450/icon/4168246310654965318",
        text: ["[오늘의 히오스 팁]", ...tips.map((tip) => `- ${tip}`)].join(
          "\n"
        ),
      }),
    }
  );

  return new NextResponse("success");
}
