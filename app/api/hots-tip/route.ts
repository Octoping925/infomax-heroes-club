import { TIPS } from "@/app/api/hots-tip/tips";
import { NextResponse } from "next/server";

/**
 * 암호학적으로 안전한 난수를 생성하여 0부터 max-1 사이의 정수를 반환합니다.
 */
function getSecureRandomInt(max: number): number {
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);
  return randomBuffer[0] % max;
}

/**
 * Fisher-Yates 셔플 알고리즘을 사용하여 랜덤한 팁을 선택합니다.
 */
function getRandomTips(count: number) {
  const tipsCopy = [...TIPS];

  // Fisher–Yates shuffle을 살짝만 이용: 뒤에서 count개만 랜덤 섞기
  for (let i = tipsCopy.length - 1; i > tipsCopy.length - count - 1; i--) {
    const j = getSecureRandomInt(i + 1);
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
