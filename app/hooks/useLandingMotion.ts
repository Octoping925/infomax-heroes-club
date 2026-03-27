import { useEffect } from "react";

interface UseLandingMotionOptions {
  readonly revealSelector?: string;
}

const DEFAULT_REVEAL_SELECTOR = "[data-reveal]";

/**
 * 랜딩 페이지의 진입/스크롤 리빌과 히어로 글로우 포인터 반응을 초기화합니다.
 */
export function useLandingMotion({ revealSelector = DEFAULT_REVEAL_SELECTOR }: UseLandingMotionOptions = {}) {
  useEffect(() => {
    const revealElements = document.querySelectorAll<HTMLElement>(revealSelector);
    const prefersReducedMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)");

    if (prefersReducedMotion.matches) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    revealElements.forEach((element, index) => {
      element.style.setProperty("--reveal-delay", `${Math.min(index * 90, 360)}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -10% 0px" },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [revealSelector]);
}
