"use client";

import { useState } from "react";
import { type RivalryParams } from "@/config/query-keys";
import { useRivalries } from "../hooks/useRivalries";
import { Title } from "../components/Title";
import { RivalryCard } from "./RivalryCard";
import { RivalryControls } from "./RivalryControl";

const DEFAULT_PARAMS: RivalryParams = {
  minMatches: 3,
  limit: 7,
  takeMatches: 500,
  includeInsufficientSample: false,
};

export function RivalryTab() {
  const [params, setParams] = useState<RivalryParams>(DEFAULT_PARAMS);
  const { data, error } = useRivalries(params);

  const { hottest, items } = data;

  const note = (() => {
    return (
      <>
        <p className="text-gray-400">
          <span className="text-white">내전 1건</span>을 1회 맞대결로 보고,{" "}
          <span className="text-white">맞대결 횟수</span> + <span className="text-white">승률 균형(50:50)</span> +{" "}
          <span className="text-white">최근 경기 가중</span> +{" "}
          <span className="text-white">퍼포먼스 격차(작을수록 가산)</span>로 점수를 계산합니다.
        </p>
        <p className="text-xs text-gray-500">
          표본이 적은 페어는 기본적으로 제외되며(최소 {params.minMatches}회), 옵션으로 포함할 수 있습니다.
        </p>
      </>
    );
  })();

  if (error) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-red-400">❌ {error.message}</p>
      </div>
    );
  }

  if (hottest === null && items.length === 0) {
    return (
      <div className="space-y-6">
        {note}
        <RivalryControls params={params} setParams={setParams} />
        <div className="flex justify-center py-12">
          <p className="text-gray-500">조건에 맞는 라이벌 데이터가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <Title title="라이벌리" description="가장 뜨거운 1:1 구도를 찾아봅니다." />
      <div className="space-y-2">{note}</div>
      <RivalryControls params={params} setParams={setParams} />

      {hottest && (
        <section className="space-y-3">
          <Title title="가장 뜨거운 라이벌" />
          <RivalryCard card={hottest} variant="hottest" />
        </section>
      )}

      <section className="space-y-3">
        <Title title="라이벌 카드" description={`총 ${items.length}개`} />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {items.slice(1).map((card) => (
            <RivalryCard key={card.id} card={card} variant="normal" />
          ))}
        </div>
      </section>
    </section>
  );
}
