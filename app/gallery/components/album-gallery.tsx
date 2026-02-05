"use client";

import Image from "next/image";
import { use, useEffect } from "react";

import type { AlbumImage } from "@/app/gallery/utils/get-album-images";
import { useCarousel } from "@/app/gallery/hooks/use-carousel";
import { useSwipeGesture } from "@/app/gallery/hooks/use-swipe-gesture";

interface AlbumGalleryProps {
  readonly images: Promise<AlbumImage[]>;
}

export function AlbumGallery({ images }: AlbumGalleryProps) {
  const loadedImages = use(images);
  const totalImages = loadedImages.length;

  const carousel = useCarousel(totalImages);

  const activeImage: AlbumImage | null = (() => {
    if (!carousel.isOpen) return null;
    if (totalImages <= 0) return null;

    return loadedImages[carousel.activeIndex] ?? null;
  })();

  const swipeHandlers = useSwipeGesture<HTMLDivElement>({
    isEnabled: carousel.isOpen,
    onSwipeLeft: carousel.goToNext,
    onSwipeRight: carousel.goToPrevious,
  });

  useEffect(() => {
    if (!carousel.isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [carousel.isOpen]);

  return (
    <>
      <section
        aria-label="앨범 이미지 목록"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {loadedImages.map((image, index) => (
          <button
            key={image.src}
            type="button"
            onClick={() => carousel.openAt(index)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-sm outline-none transition hover:border-white/20 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-400/70"
            aria-label={`${index + 1}번 사진 열기`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
              priority={index < 6}
            />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition group-hover:opacity-100" />
          </button>
        ))}
      </section>

      {carousel.isOpen && activeImage && (
        <dialog
          open
          aria-label="사진 크게 보기"
          className="fixed inset-0 z-60 m-0 flex h-full w-full items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"
          onCancel={(event) => {
            event.preventDefault();
            carousel.close();
          }}
        >
          <button
            type="button"
            aria-label="닫기"
            onClick={carousel.close}
            className="absolute inset-0 z-0 cursor-default"
          />
          <div className="relative z-10 w-full max-w-6xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-gray-200">
                <span className="font-semibold">{carousel.activeIndex + 1}</span>
                <span className="text-gray-400"> / {totalImages}</span>
              </div>
              <button
                type="button"
                onClick={carousel.close}
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-gray-100 transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-cyan-400/70"
              >
                닫기
              </button>
            </div>

            <div
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/30"
              onTouchStart={swipeHandlers.onTouchStart}
              onTouchMove={swipeHandlers.onTouchMove}
              onTouchEnd={swipeHandlers.onTouchEnd}
              onTouchCancel={swipeHandlers.onTouchCancel}
            >
              <div className="relative h-[72vh] w-full">
                <Image
                  src={activeImage.src}
                  alt={activeImage.alt}
                  fill
                  sizes="(max-width: 1024px) 95vw, 1024px"
                  className="object-contain"
                  priority
                />
              </div>

              <button
                type="button"
                onClick={carousel.goToPrevious}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm text-gray-100 transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                aria-label="이전 사진"
                disabled={!carousel.canGoToPrevious}
              >
                ←
              </button>
              <button
                type="button"
                onClick={carousel.goToNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm text-gray-100 transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                aria-label="다음 사진"
                disabled={!carousel.canGoToNext}
              >
                →
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-gray-300">
              키보드: ←/→ 이동, ESC 닫기. 바깥 영역 클릭으로도 닫을 수 있어요.
            </p>
          </div>
        </dialog>
      )}
    </>
  );
}
