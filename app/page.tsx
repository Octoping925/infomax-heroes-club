"use client";

import { useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";

/**
 * 히어로즈 오브 더 스톰 동호회 메인 페이지 컴포넌트
 */
export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("about");

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white">
      <TopBar value="home" />

      {/* 히어로 섹션 */}
      <section className="w-full px-6 py-16">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-6">
            <div className="inline-flex px-6 py-2 rounded-full bg-linear-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 backdrop-blur-xl">
              <span className="text-sm font-medium">
                🎮 Heroes of the Storm Community
              </span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold bg-linear-to-r from-cyan-400 via-purple-500 to-orange-500 bg-clip-text text-transparent">
              함께 만드는 승리의 역사
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              연합인포맥스 히오스 동호회에서 즐거운 게임과 소통을 경험하세요.
              <br />
              실력과 팀워크를 함께 키워나가는 커뮤니티입니다.
            </p>
          </div>

          {/* 주요 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              title="활동 멤버"
              value="13+"
              description="열정적인 히어로즈 플레이어"
              icon="👥"
              gradient="from-cyan-500/20 to-blue-500/20"
            />
            <StatCard
              title="내전"
              value="매주"
              description="함께하는 게임 세션"
              icon="🎯"
              gradient="from-purple-500/20 to-pink-500/20"
            />
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setActiveTab("about")}
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "about"
                  ? "bg-linear-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/25"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              소개
            </button>
            <button
              onClick={() => setActiveTab("activities")}
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "activities"
                  ? "bg-linear-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/25"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              활동
            </button>
          </div>

          {/* 탭 컨텐츠 */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            {activeTab === "about" && <AboutSection />}
            {activeTab === "activities" && <ActivitiesSection />}
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="w-full px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-linear-to-r from-cyan-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl p-12 border border-cyan-500/30 text-center space-y-6">
            <h3 className="text-4xl font-bold">함께 플레이하고 싶으신가요?</h3>
            <p className="text-xl text-gray-400">
              연합인포맥스 히오스 동호회에 가입하여 즐거운 게임 문화를
              경험하세요!
            </p>
            <blockquote className="border-l-4 border-cyan-500 pl-6 py-4 bg-white/5 rounded-r-xl">
              <p className="text-lg italic text-gray-300">
                &quot;승리에 우연은 없습니다.&quot;
              </p>
              <footer className="text-sm text-gray-500 mt-2">- 채수관</footer>
            </blockquote>
          </div>
        </div>
      </section>
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: string;
  gradient: string;
};

function StatCard({
  title,
  value,
  description,
  icon,
  gradient,
}: StatCardProps) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all hover:scale-105 duration-300`}
    >
      <div className="space-y-4">
        <div className="text-5xl">{icon}</div>
        <div className="text-xs uppercase tracking-widest text-gray-500 font-semibold">
          {title}
        </div>
        <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          {value}
        </div>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-8">
      <h3 className="text-3xl font-bold">동호회 소개</h3>
      <p className="text-lg text-gray-400 leading-relaxed">
        연합인포맥스 히어로즈 동호회는 히어로즈 오브 더 스톰을 사랑하는
        임직원들이 모여 만든 게임 커뮤니티입니다. 실력 향상과 즐거운 게임 문화를
        목표로 정기적인 게임 세션과 소통의 장을 마련하고 있습니다.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FeatureCard
          title="정기 게임 세션"
          description="매주 정기적으로 진행되는 팀 게임으로 함께 성장합니다"
          icon="🎮"
        />
        <FeatureCard
          title="스킬 향상 프로그램"
          description="전략 공유와 리플레이 분석으로 실력을 키워갑니다"
          icon="📈"
        />
        <FeatureCard
          title="친목 활동"
          description="게임 외에도 다양한 친목 활동으로 유대감을 형성합니다"
          icon="🤝"
        />
        <FeatureCard
          title="자유로운 분위기"
          description="초보자부터 고수까지 모두 환영하는 열린 커뮤니티"
          icon="✨"
        />
      </div>
    </div>
  );
}

function ActivitiesSection() {
  return (
    <div className="space-y-8">
      <h3 className="text-3xl font-bold">주요 활동</h3>
      <div className="space-y-4">
        <ActivityCard
          title="주간 내전"
          time="1달에 2번, 점심 내전"
          description="점심 내전으로 함께 승부를 겨룹니다"
          type="정기"
        />
        <ActivityCard
          title="주말 자유 플레이"
          time="주말 오후 시간대"
          description="자유롭게 모여서 빠른 대전이나 난투를 즐깁니다"
          type="자유"
        />
        <ActivityCard
          title="월간 저녁 내전"
          time="매월 1회 금요일"
          description="팀을 나누어 진행하는 사내 토너먼트"
          type="정기"
        />
        <ActivityCard
          title="전략 연구 모임"
          time="미정"
          description="메타 분석, 영웅 픽/밴 전략 등을 공유합니다"
          type="교육"
        />
      </div>
    </div>
  );
}

type FeatureCardProps = {
  title: string;
  description: string;
  icon: string;
};

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all">
      <div className="space-y-3">
        <div className="text-4xl">{icon}</div>
        <h4 className="text-xl font-bold">{title}</h4>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
}

type ActivityCardProps = {
  title: string;
  time: string;
  description: string;
  type: string;
};

function ActivityCard({ title, time, description, type }: ActivityCardProps) {
  const getBadgeStyle = (activityType: string) => {
    const styles = {
      정기: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      자유: "bg-green-500/20 text-green-400 border-green-500/30",
      이벤트: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      교육: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    };
    return (
      styles[activityType as keyof typeof styles] ||
      "bg-gray-500/20 text-gray-400 border-gray-500/30"
    );
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-bold">{title}</h4>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${getBadgeStyle(
              type
            )}`}
          >
            {type}
          </span>
        </div>
        <p className="text-sm text-cyan-400">⏰ {time}</p>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
}
