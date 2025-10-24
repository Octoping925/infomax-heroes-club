"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Heading,
  Text,
  Avatar,
  Badge,
} from "@once-ui-system/core";

/**
 * 히어로즈 오브 더 스톰 동호회 메인 페이지 컴포넌트
 */
export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("about");

  return (
    <div className="min-h-screen bg-linear-to-b from-[#0a0a12] via-[#12121d] to-[#1a1a2e]">
      {/* 헤더 네비게이션 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
        <nav className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                size="m"
                style={{
                  background: "linear-gradient(135deg, #00d4ff, #7b2ff7)",
                }}
              >
                <span className="text-white font-bold text-xl">H</span>
              </Avatar>
              <div>
                <Heading variant="heading-strong-l" onBackground="brand-strong">
                  연합인포맥스 히어로즈 동호회
                </Heading>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Infomax Heroes Club
                </Text>
              </div>
            </div>
            <div className="flex gap-4">
              <Button
                variant={activeTab === "about" ? "primary" : "tertiary"}
                size="m"
                onClick={() => setActiveTab("about")}
              >
                소개
              </Button>
              <Button
                variant={activeTab === "activities" ? "primary" : "tertiary"}
                size="m"
                onClick={() => setActiveTab("activities")}
              >
                활동
              </Button>
              <Button
                variant={activeTab === "members" ? "primary" : "tertiary"}
                size="m"
                onClick={() => setActiveTab("members")}
              >
                멤버
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* 히어로 섹션 */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge
              style={{
                background:
                  "linear-gradient(to right, rgba(0, 212, 255, 0.2), rgba(123, 47, 247, 0.2))",
                border: "1px solid rgba(0, 212, 255, 0.3)",
                marginBottom: "1rem",
                padding: "0.5rem 1rem",
              }}
            >
              🎮 Heroes of the Storm Community
            </Badge>
            <Heading
              variant="display-strong-xl"
              style={{
                background:
                  "linear-gradient(to right, #00d4ff, #7b2ff7, #ff3d00)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                marginBottom: "1.5rem",
              }}
            >
              함께 만드는 승리의 역사
            </Heading>
            <Text
              variant="heading-default-l"
              onBackground="neutral-weak"
              style={{ maxWidth: "42rem", margin: "0 auto" }}
            >
              연합인포맥스 히어로즈 동호회에서 즐거운 게임과 소통을 경험하세요.
              <br />
              실력과 팀워크를 함께 키워나가는 커뮤니티입니다.
            </Text>
          </div>

          {/* 주요 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <StatCard
              title="활동 멤버"
              value="24+"
              description="열정적인 히어로즈 플레이어"
              icon="👥"
            />
            <StatCard
              title="주간 게임"
              value="15+"
              description="매주 함께하는 게임 세션"
              icon="🎯"
            />
            <StatCard
              title="승리 경험"
              value="80%"
              description="팀 게임 평균 승률"
              icon="🏆"
            />
          </div>

          {/* 탭 컨텐츠 */}
          <Card
            padding="32"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {activeTab === "about" && <AboutSection />}
            {activeTab === "activities" && <ActivitiesSection />}
            {activeTab === "members" && <MembersSection />}
          </Card>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <Card
            padding="48"
            style={{
              background:
                "linear-gradient(to right, rgba(0, 212, 255, 0.1), rgba(123, 47, 247, 0.1))",
              border: "1px solid rgba(0, 212, 255, 0.3)",
            }}
          >
            <div className="text-center space-y-6">
              <Heading variant="display-strong-l" onBackground="brand-strong">
                함께 플레이하고 싶으신가요?
              </Heading>
              <Text variant="heading-default-m" onBackground="neutral-weak">
                연합인포맥스 히어로즈 동호회에 가입하여 즐거운 게임 문화를
                경험하세요!
              </Text>
              <div className="flex gap-4 justify-center pt-4">
                <Button
                  variant="primary"
                  size="l"
                  style={{
                    background: "linear-gradient(to right, #00d4ff, #7b2ff7)",
                  }}
                >
                  동호회 가입하기
                </Button>
                <Button variant="secondary" size="l">
                  자세히 알아보기
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-2">
          <Text variant="body-default-m" onBackground="neutral-weak">
            © 2025 연합인포맥스 히어로즈 동호회. All rights reserved.
          </Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Made with ❤️ for Heroes of the Storm community
          </Text>
        </div>
      </footer>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: string;
}

/**
 * 통계 카드 컴포넌트
 */
function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <Card
      padding="32"
      style={{
        background:
          "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        transition: "all 0.3s ease",
      }}
      className="hover:scale-105"
    >
      <div className="flex flex-col gap-3">
        <Text variant="display-default-xl">{icon}</Text>
        <Text
          variant="label-strong-s"
          onBackground="neutral-weak"
          style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
        >
          {title}
        </Text>
        <Heading
          variant="display-strong-xl"
          style={{
            background: "linear-gradient(to right, #00d4ff, #7b2ff7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {value}
        </Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
          {description}
        </Text>
      </div>
    </Card>
  );
}

/**
 * 소개 섹션 컴포넌트
 */
function AboutSection() {
  return (
    <div className="space-y-6">
      <Heading variant="display-strong-l" onBackground="brand-strong">
        동호회 소개
      </Heading>
      <div className="space-y-8">
        <Text variant="heading-default-m" onBackground="neutral-weak">
          연합인포맥스 히어로즈 동호회는 히어로즈 오브 더 스톰을 사랑하는
          임직원들이 모여 만든 게임 커뮤니티입니다. 실력 향상과 즐거운 게임
          문화를 목표로 정기적인 게임 세션과 소통의 장을 마련하고 있습니다.
        </Text>
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
    </div>
  );
}

/**
 * 활동 섹션 컴포넌트
 */
function ActivitiesSection() {
  return (
    <div className="space-y-6">
      <Heading variant="display-strong-l" onBackground="brand-strong">
        주요 활동
      </Heading>
      <div className="space-y-4">
        <ActivityCard
          title="주간 팀 랭크 게임"
          time="매주 수요일 저녁 8시"
          description="5인 팀 랭크 게임으로 함께 티어를 올려갑니다"
          type="정기"
        />
        <ActivityCard
          title="주말 자유 플레이"
          time="주말 오후 시간대"
          description="자유롭게 모여서 빠른 대전이나 난투를 즐깁니다"
          type="자유"
        />
        <ActivityCard
          title="월간 토너먼트"
          time="매월 마지막 주 토요일"
          description="팀을 나누어 진행하는 사내 토너먼트"
          type="이벤트"
        />
        <ActivityCard
          title="전략 연구 모임"
          time="격주 화요일 점심시간"
          description="메타 분석, 영웅 픽/밴 전략 등을 공유합니다"
          type="교육"
        />
      </div>
    </div>
  );
}

/**
 * 멤버 섹션 컴포넌트
 */
function MembersSection() {
  return (
    <div className="space-y-6">
      <Heading variant="display-strong-l" onBackground="brand-strong">
        멤버 구성
      </Heading>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MemberTypeCard
          type="탱커 전문"
          count={6}
          description="전장을 이끄는 든든한 탱커들"
          color="linear-gradient(135deg, #3b82f6, #06b6d4)"
        />
        <MemberTypeCard
          type="딜러 전문"
          count={10}
          description="적을 제압하는 화력 담당"
          color="linear-gradient(135deg, #ef4444, #f97316)"
        />
        <MemberTypeCard
          type="힐러/서포터"
          count={8}
          description="팀을 지키는 든든한 지원군"
          color="linear-gradient(135deg, #22c55e, #10b981)"
        />
      </div>
      <Card
        padding="24"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <div className="space-y-4">
          <Heading variant="heading-strong-l" onBackground="brand-strong">
            가입 안내
          </Heading>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <Text variant="heading-strong-m" style={{ color: "#00d4ff" }}>
                1.
              </Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                연합인포맥스 임직원이면 누구나 가입 가능합니다
              </Text>
            </div>
            <div className="flex gap-3 items-start">
              <Text variant="heading-strong-m" style={{ color: "#00d4ff" }}>
                2.
              </Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                히어로즈 게임 레벨 제한은 없습니다 (초보자 환영!)
              </Text>
            </div>
            <div className="flex gap-3 items-start">
              <Text variant="heading-strong-m" style={{ color: "#00d4ff" }}>
                3.
              </Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                사내 메신저를 통해 동호회 채널에 참여하세요
              </Text>
            </div>
            <div className="flex gap-3 items-start">
              <Text variant="heading-strong-m" style={{ color: "#00d4ff" }}>
                4.
              </Text>
              <Text variant="body-default-m" onBackground="neutral-weak">
                정기 게임 세션에 자유롭게 참여하시면 됩니다
              </Text>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

/**
 * 기능 카드 컴포넌트
 */
function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <Card
      padding="24"
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        transition: "all 0.3s ease",
      }}
      className="hover:bg-white/10"
    >
      <div className="flex flex-col gap-3">
        <Text variant="display-default-l">{icon}</Text>
        <Heading variant="heading-strong-l" onBackground="brand-strong">
          {title}
        </Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
          {description}
        </Text>
      </div>
    </Card>
  );
}

interface ActivityCardProps {
  title: string;
  time: string;
  description: string;
  type: string;
}

/**
 * 활동 카드 컴포넌트
 */
function ActivityCard({ title, time, description, type }: ActivityCardProps) {
  const getBadgeColor = (activityType: string): React.CSSProperties => {
    switch (activityType) {
      case "정기":
        return {
          background: "rgba(59, 130, 246, 0.2)",
          color: "rgb(96, 165, 250)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
        };
      case "자유":
        return {
          background: "rgba(34, 197, 94, 0.2)",
          color: "rgb(74, 222, 128)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
        };
      case "이벤트":
        return {
          background: "rgba(168, 85, 247, 0.2)",
          color: "rgb(192, 132, 252)",
          border: "1px solid rgba(168, 85, 247, 0.3)",
        };
      case "교육":
        return {
          background: "rgba(249, 115, 22, 0.2)",
          color: "rgb(251, 146, 60)",
          border: "1px solid rgba(249, 115, 22, 0.3)",
        };
      default:
        return {
          background: "rgba(156, 163, 175, 0.2)",
          color: "rgb(156, 163, 175)",
          border: "1px solid rgba(156, 163, 175, 0.3)",
        };
    }
  };

  return (
    <Card
      padding="24"
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        transition: "all 0.3s ease",
      }}
      className="hover:bg-white/10"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <Heading variant="heading-strong-l" onBackground="brand-strong">
            {title}
          </Heading>
          <Badge style={getBadgeColor(type)}>{type}</Badge>
        </div>
        <Text variant="body-default-s" style={{ color: "#00d4ff" }}>
          ⏰ {time}
        </Text>
        <Text variant="body-default-m" onBackground="neutral-weak">
          {description}
        </Text>
      </div>
    </Card>
  );
}

interface MemberTypeCardProps {
  type: string;
  count: number;
  description: string;
  color: string;
}

/**
 * 멤버 타입 카드 컴포넌트
 */
function MemberTypeCard({
  type,
  count,
  description,
  color,
}: MemberTypeCardProps) {
  return (
    <Card
      padding="24"
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        transition: "all 0.3s ease",
        textAlign: "center",
      }}
      className="hover:scale-105"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="flex items-center justify-center"
          style={{
            width: "4rem",
            height: "4rem",
            borderRadius: "50%",
            background: color,
          }}
        >
          <Heading variant="display-strong-l" onBackground="brand-strong">
            {count}
          </Heading>
        </div>
        <Heading variant="heading-strong-l" onBackground="brand-strong">
          {type}
        </Heading>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {description}
        </Text>
      </div>
    </Card>
  );
}
