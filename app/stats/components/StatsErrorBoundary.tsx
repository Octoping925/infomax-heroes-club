"use client";

import { Component, type ReactNode } from "react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly error: Error | null;
}

/**
 * 탭 단위 에러 바운더리.
 * useSuspenseQuery가 던진 에러를 받아 탭 영역만 에러 화면으로 바꾸고, 상단 탭/연도 선택은 그대로 둔다.
 * 탭이나 연도가 바뀌면 부모에서 key를 바꿔 초기화한다.
 */
export class StatsErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <StatsErrorFallback error={this.state.error} onRetry={() => this.setState({ error: null })} />;
    }

    return this.props.children;
  }
}

function StatsErrorFallback({ error, onRetry }: { readonly error: Error; readonly onRetry: () => void }) {
  // 에러 상태로 캐시된 쿼리를 풀어야 다시 마운트될 때 재요청한다.
  const { reset } = useQueryErrorResetBoundary();

  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="text-red-400">❌ {error.message || "데이터를 불러오지 못했습니다."}</p>
      <button
        type="button"
        onClick={() => {
          reset();
          onRetry();
        }}
        className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/10"
      >
        다시 시도
      </button>
    </div>
  );
}
