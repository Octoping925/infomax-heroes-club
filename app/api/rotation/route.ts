import { DoorayBotMessageSender } from "@/domain/dooray/sender";
import { DooraySlashCommandRequest } from "@/domain/dooray/types";
import { NextRequest, NextResponse } from "next/server";

type ApiResponse = {
  RotationHero: { Heroes: { Name: string; ImageURL: string }[] };
};

export async function POST(request: NextRequest) {
  const data = (await fetch(`https://nexuscompendium.com/api/currently`).then(
    (res) => res.json()
  )) as ApiResponse;

  const rotations = data.RotationHero.Heroes.map((it) => ({
    name: it.Name,
    imageURL: it.ImageURL,
  }));

  try {
    const body: DooraySlashCommandRequest = await request.json();

    const response = await DoorayBotMessageSender.url(body.responseUrl)
      .token(body.cmdToken)
      .body({
        text: rotations.map((it) => `- ${it.name}`).join("\n"),
        attachments: rotations.map((it) => ({
          image_url: it.imageURL,
          title: it.name,
          text: it.name,
        })),
        responseType: "inChannel",
        deleteOriginal: "true",
      })
      .send()
      .then((res) => res.text());

    console.log(response);

    return new NextResponse("success");
  } catch (error) {
    console.error(error);
    return new NextResponse("error", { status: 500 });
  }
}
