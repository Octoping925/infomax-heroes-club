import { useCallback, useEffect, useState } from "react";

interface CarouselState {
  readonly isOpen: boolean;
  readonly activeIndex: number;
}

interface CarouselApi {
  readonly isOpen: boolean;
  readonly activeIndex: number;
  readonly total: number;
  readonly canGoToPrevious: boolean;
  readonly canGoToNext: boolean;
  readonly openAt: (index: number) => void;
  readonly close: () => void;
  readonly goTo: (index: number) => void;
  readonly goToPrevious: () => void;
  readonly goToNext: () => void;
}

function getClampedIndex(nextIndex: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, nextIndex));
}

function getWrappedIndex(nextIndex: number, total: number): number {
  if (total <= 0) return 0;
  return ((nextIndex % total) + total) % total;
}

function getSafeIndex(nextIndex: number, total: number, isLoopEnabled: boolean) {
  return isLoopEnabled ? getWrappedIndex(nextIndex, total) : getClampedIndex(nextIndex, total);
}

/**
 * 캐러셀 상태(열림/닫힘)와 활성 인덱스, 이동 API를 제공하는 훅입니다.
 * 기본 동작은 끝에서 멈추는(clamp) 방식이며, 옵션으로 루프(wrap)를 켤 수 있습니다.
 */
export function useCarousel(total: number, initialIndex: number = 0, isLoopEnabled: boolean = false): CarouselApi {
  const [state, setState] = useState<CarouselState>(() => ({
    isOpen: false,
    activeIndex: getSafeIndex(initialIndex, total, isLoopEnabled),
  }));

  const canGoToPrevious: boolean = (() => {
    if (total <= 0) return false;
    if (isLoopEnabled) return total > 1;
    return state.activeIndex > 0;
  })();

  const canGoToNext: boolean = (() => {
    if (total <= 0) return false;
    if (isLoopEnabled) return total > 1;
    return state.activeIndex < total - 1;
  })();

  const goTo = useCallback(
    (index: number) => {
      setState((prev: CarouselState) => ({
        ...prev,
        activeIndex: getSafeIndex(index, total, isLoopEnabled),
      }));
    },
    [isLoopEnabled, total],
  );

  const openAt = useCallback(
    (index: number) => {
      setState({
        isOpen: true,
        activeIndex: getSafeIndex(index, total, isLoopEnabled),
      });
    },
    [isLoopEnabled, total],
  );

  const close = useCallback(() => {
    setState((prev: CarouselState) => ({ ...prev, isOpen: false }));
  }, []);

  const goToPrevious = useCallback(() => {
    setState((prev: CarouselState) => ({
      ...prev,
      activeIndex: getSafeIndex(prev.activeIndex - 1, total, isLoopEnabled),
    }));
  }, [isLoopEnabled, total]);

  const goToNext = useCallback(() => {
    setState((prev: CarouselState) => ({
      ...prev,
      activeIndex: getSafeIndex(prev.activeIndex + 1, total, isLoopEnabled),
    }));
  }, [isLoopEnabled, total]);

  useEffect(() => {
    if (!state.isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }

      if (event.key === "ArrowLeft") {
        goToPrevious();
        return;
      }

      if (event.key === "ArrowRight") {
        goToNext();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, goToNext, goToPrevious, state.isOpen]);

  return {
    isOpen: state.isOpen,
    activeIndex: state.activeIndex,
    total,
    canGoToPrevious,
    canGoToNext,
    openAt,
    close,
    goTo,
    goToPrevious,
    goToNext,
  };
}
