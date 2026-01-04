import { TopBar } from "@/components/TopBar";
import { AlbumGallery } from "@/app/gallery/components/album-gallery";
import { getAlbumImages } from "@/app/gallery/utils/get-album-images";
import { Suspense, type ReactElement } from "react";
import { Metadata } from "next";
import { Loading } from "@/components/Loading";

export const metadata: Metadata = {
  title: "갤러리",
  description: "연합인포맥스 히오스 동호회 갤러리",
};

export default async function GalleryPage(): Promise<ReactElement> {
  const images = getAlbumImages();

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
        <Suspense fallback={<Loading />}>
          <AlbumGallery images={images} />
        </Suspense>
      </main>
    </div>
  );
}
