import { readdir } from "node:fs/promises";
import path from "node:path";

export interface AlbumImage {
  readonly src: string;
  readonly alt: string;
}

const ALLOWED_EXTENSIONS = new Set<string>([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function isAllowedImageExtension(fileName: string): boolean {
  const extension = path.extname(fileName).toLowerCase();
  return ALLOWED_EXTENSIONS.has(extension);
}

function convertFileNameToAltText(fileName: string): string {
  const baseName = fileName.replace(path.extname(fileName), "");
  return baseName.replace(/[-_]+/g, " ").trim() || "album image";
}

/**
 * `public/album` 폴더의 이미지 목록을 읽어 갤러리에서 사용할 형태로 반환합니다.
 * 서버 컴포넌트(또는 Route Handler)에서만 호출하세요.
 */
export async function getAlbumImages(): Promise<AlbumImage[]> {
  const albumDirectoryPath = path.join(process.cwd(), "public", "album");

  try {
    const directoryEntries = await readdir(albumDirectoryPath);

    return directoryEntries
      .filter((fileName) => isAllowedImageExtension(fileName))
      .toSorted((a, b) => a.localeCompare(b, "kr"))
      .map(
        (fileName): AlbumImage => ({
          src: `/album/${encodeURIComponent(fileName)}`,
          alt: convertFileNameToAltText(fileName),
        }),
      );
  } catch {
    return [];
  }
}
