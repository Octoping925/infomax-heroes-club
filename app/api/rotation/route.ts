type ApiResponse = {
  RotationHero: { Heroes: { Name: string; ImageURL: string }[] };
};

export async function POST() {
  const data = (await fetch(`https://nexuscompendium.com/api/currently`).then(
    (res) => res.json()
  )) as ApiResponse;

  return Response.json({
    text: "히오스 로테이션",
    attachments: data.RotationHero.Heroes.map((it) => ({
      thumbUrl: it.ImageURL,
      title: it.Name,
    })),
    responseType: "inChannel",
  });
}
