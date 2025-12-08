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

  const body = await request.json();
  console.log(body);

  try {
    await fetch(body.responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: body.cmdToken,
      },
      body: JSON.stringify({
        text: rotations.map((it) => `- ${it.name}`).join("\n"),
        attachments: rotations.map((it) => ({
          image_url: it.imageURL,
          title: it.name,
          text: it.name,
        })),
        // channelId: body.channelId,
        responseType: "inChannel",
        deleteOriginal: "true",
      }),
    }).then((res) => res.json());

    return new NextResponse("success");
  } catch (error) {
    console.error(error);
    return new NextResponse("error", { status: 500 });
  }
}
