import { useCallback, useRef } from "react";
import type { TouchEvent, TouchEventHandler } from "react";

interface SwipeTrackingState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  isSwipeCandidate: boolean;
}

export interface SwipeGestureParams {
  readonly isEnabled?: boolean;
  readonly thresholdPx?: number;
  readonly directionTolerancePx?: number;
  readonly onSwipeLeft: () => void;
  readonly onSwipeRight: () => void;
}

export interface SwipeGestureHandlers<TElement extends HTMLElement> {
  readonly onTouchStart: TouchEventHandler<TElement>;
  readonly onTouchMove: TouchEventHandler<TElement>;
  readonly onTouchEnd: TouchEventHandler<TElement>;
  readonly onTouchCancel: TouchEventHandler<TElement>;
}

const DEFAULT_SWIPE_THRESHOLD_PX = 50;
const DEFAULT_SWIPE_DIRECTION_TOLERANCE_PX = 10;

function extractPrimaryTouch(event: TouchEvent<HTMLElement>) {
  if (event.touches.length !== 1) return null;
  return event.touches.item(0);
}

/**
 * 좌/우 스와이프 제스처를 감지하는 훅입니다.
 * - 수직 스크롤이 우세하면 스와이프로 판단하지 않습니다.
 * - 임계값(기본 50px)을 넘는 수평 이동만 스와이프로 처리합니다.
 */
export function useSwipeGesture<TElement extends HTMLElement>({
  isEnabled = true,
  thresholdPx = DEFAULT_SWIPE_THRESHOLD_PX,
  directionTolerancePx = DEFAULT_SWIPE_DIRECTION_TOLERANCE_PX,
  onSwipeLeft,
  onSwipeRight,
}: SwipeGestureParams): SwipeGestureHandlers<TElement> {
  const swipeTrackingStateRef = useRef<SwipeTrackingState | null>(null);

  const onTouchStart = useCallback<TouchEventHandler<TElement>>(
    (event: TouchEvent<TElement>) => {
      if (!isEnabled) return;

      const touch = extractPrimaryTouch(event);
      if (!touch) return;

      swipeTrackingStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY,
        isSwipeCandidate: true,
      };
    },
    [isEnabled]
  );

  const onTouchMove = useCallback<TouchEventHandler<TElement>>(
    (event: TouchEvent<TElement>) => {
      if (!isEnabled) return;

      const currentTrackingState = swipeTrackingStateRef.current;
      if (!currentTrackingState) return;

      const touch = extractPrimaryTouch(event);
      if (!touch) return;

      currentTrackingState.lastX = touch.clientX;
      currentTrackingState.lastY = touch.clientY;

      const deltaX = currentTrackingState.lastX - currentTrackingState.startX;
      const deltaY = currentTrackingState.lastY - currentTrackingState.startY;

      if (Math.abs(deltaY) > Math.abs(deltaX) + directionTolerancePx) {
        currentTrackingState.isSwipeCandidate = false;
      }
    },
    [directionTolerancePx, isEnabled]
  );

  const onTouchEnd = useCallback<TouchEventHandler<TElement>>((): void => {
    const currentTrackingState = swipeTrackingStateRef.current;
    swipeTrackingStateRef.current = null;

    if (!currentTrackingState) return;
    if (!isEnabled) return;
    if (!currentTrackingState.isSwipeCandidate) return;

    const deltaX = currentTrackingState.lastX - currentTrackingState.startX;
    const deltaY = currentTrackingState.lastY - currentTrackingState.startY;

    if (Math.abs(deltaX) < thresholdPx) return;
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (deltaX < 0) {
      onSwipeLeft();
      return;
    }

    onSwipeRight();
  }, [isEnabled, onSwipeLeft, onSwipeRight, thresholdPx]);

  const onTouchCancel = useCallback<TouchEventHandler<TElement>>((): void => {
    swipeTrackingStateRef.current = null;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
}
