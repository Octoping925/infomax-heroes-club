import { TopBar } from "@/components/TopBar";
import { AlbumGallery } from "@/app/gallery/components/album-gallery";
import { getAlbumImages } from "@/app/gallery/utils/get-album-images";
import type { ReactElement } from "react";

export default async function GalleryPage(): Promise<ReactElement> {
  const images = await getAlbumImages();

  return (
    <div className="min-h-screen">
      <TopBar title="🎥 갤러리" value="gallery" />
      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">사진집</h2>
          <p className="text-sm text-gray-400">
            클릭하면 크게 보기(캐러셀)로 열립니다.
          </p>
        </div>

        <AlbumGallery images={images} />
      </main>
    </div>
  );
}
