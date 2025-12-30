"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement, SyntheticEvent } from "react";

import type { AlbumImage } from "@/app/gallery/utils/get-album-images";
import { useSwipeGesture } from "@/app/gallery/hooks/use-swipe-gesture";

interface AlbumGalleryProps {
  readonly images: readonly AlbumImage[];
}

interface CarouselState {
  readonly isOpen: boolean;
  readonly activeIndex: number;
}

function getWrappedIndex(nextIndex: number, total: number): number {
  if (total <= 0) return 0;
  return ((nextIndex % total) + total) % total;
}

export function AlbumGallery({ images }: AlbumGalleryProps): ReactElement {
  const totalImages: number = images.length;

  const [carouselState, setCarouselState] = useState<CarouselState>({
    isOpen: false,
    activeIndex: 0,
  });

  const activeImage: AlbumImage | null = useMemo(() => {
    if (!carouselState.isOpen) return null;
    if (totalImages <= 0) return null;

    return images[getWrappedIndex(carouselState.activeIndex, totalImages)];
  }, [carouselState.activeIndex, carouselState.isOpen, images, totalImages]);

  const openCarousel = useCallback((index: number): void => {
    setCarouselState({ isOpen: true, activeIndex: index });
  }, []);

  const closeCarousel = useCallback((): void => {
    setCarouselState((prev: CarouselState) => ({ ...prev, isOpen: false }));
  }, []);

  const moveToPrevious = useCallback((): void => {
    setCarouselState((prev: CarouselState) => ({
      ...prev,
      activeIndex: Math.max(0, prev.activeIndex - 1),
    }));
  }, []);

  const moveToNext = useCallback((): void => {
    setCarouselState((prev: CarouselState) => ({
      ...prev,
      activeIndex: Math.min(totalImages - 1, prev.activeIndex + 1),
    }));
  }, [totalImages]);

  const swipeHandlers = useSwipeGesture<HTMLDivElement>({
    isEnabled: carouselState.isOpen,
    onSwipeLeft: moveToNext,
    onSwipeRight: moveToPrevious,
  });

  useEffect(() => {
    if (!carouselState.isOpen) return;

    const previousOverflow: string = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return (): void => {
      document.body.style.overflow = previousOverflow;
    };
  }, [carouselState.isOpen]);

  useEffect(() => {
    if (!carouselState.isOpen) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeCarousel();
        return;
      }

      if (event.key === "ArrowLeft") {
        moveToPrevious();
        return;
      }

      if (event.key === "ArrowRight") {
        moveToNext();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return (): void => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [carouselState.isOpen, closeCarousel, moveToNext, moveToPrevious]);

  return (
    <>
      <section
        aria-label="앨범 이미지 목록"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {images.map((image: AlbumImage, index: number) => (
          <button
            key={image.src}
            type="button"
            onClick={() => openCarousel(index)}
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

      {carouselState.isOpen && activeImage && (
        <dialog
          open
          aria-label="사진 크게 보기"
          className="fixed inset-0 z-60 m-0 flex h-full w-full items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm"
          onCancel={(event: SyntheticEvent<HTMLDialogElement>): void => {
            event.preventDefault();
            closeCarousel();
          }}
        >
          <button
            type="button"
            aria-label="닫기"
            onClick={closeCarousel}
            className="absolute inset-0 z-0 cursor-default"
          />
          <div className="relative z-10 w-full max-w-6xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-gray-200">
                <span className="font-semibold">
                  {getWrappedIndex(carouselState.activeIndex, totalImages) + 1}
                </span>
                <span className="text-gray-400"> / {totalImages}</span>
              </div>
              <button
                type="button"
                onClick={closeCarousel}
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
                onClick={moveToPrevious}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm text-gray-100 transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                aria-label="이전 사진"
              >
                ←
              </button>
              <button
                type="button"
                onClick={moveToNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm text-gray-100 transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                aria-label="다음 사진"
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
