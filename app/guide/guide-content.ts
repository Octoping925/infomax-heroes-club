export interface GuideHeading {
  id: string;
  label: string;
}

const LEVEL_TWO_HEADING = /^##\s+(.+?)\s*$/;

export function slugifyGuideHeading(heading: string): string {
  const slug = heading
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "section";
}

export function prepareGuideMarkdown(markdown: string): string {
  const seenHeadings = new Set<string>();
  const output: string[] = [];
  let skipCurrentSection = false;

  for (const line of markdown.split("\n")) {
    const match = line.match(LEVEL_TWO_HEADING);

    if (match) {
      const heading = match[1].trim();
      skipCurrentSection = seenHeadings.has(heading);

      if (!skipCurrentSection) {
        seenHeadings.add(heading);
      }
    }

    if (!skipCurrentSection) {
      output.push(line);
    }
  }

  return output.join("\n").trimEnd();
}

export function extractGuideHeadings(markdown: string): GuideHeading[] {
  const usedIds = new Set<string>();

  return markdown.split("\n").flatMap((line) => {
    const match = line.match(LEVEL_TWO_HEADING);

    if (!match) {
      return [];
    }

    const label = match[1].trim();
    const baseId = slugifyGuideHeading(label);
    let id = baseId;
    let suffix = 2;

    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(id);
    return [{ id, label }];
  });
}
