"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Heading,
  Text,
  Avatar,
  Badge,
  Flex,
  Grid,
  Column,
  BlockQuote,
} from "@once-ui-system/core";

/**
 * 히어로즈 오브 더 스톰 동호회 메인 페이지 컴포넌트
 */
export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("about");

  return (
    <Column fillWidth background="page" style={{ minHeight: "100vh" }}>
      {/* 헤더 네비게이션 */}
      <Flex
        as="header"
        position="relative"
        fillWidth
        paddingX="l"
        paddingY="m"
        gap="m"
        style={{
          borderBottom: "1px solid var(--neutral-alpha-weak)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Flex fillWidth maxWidth="xl" horizontal="center">
          <Flex gap="m" vertical="center">
            <Avatar
              size="m"
              style={{
                background: "linear-gradient(135deg, #00d4ff, #7b2ff7)",
              }}
            >
              <Text variant="heading-strong-xl">H</Text>
            </Avatar>
            <Column gap="4">
              <Heading variant="heading-strong-l">
                연합인포맥스 히어로즈 동호회
              </Heading>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                Infomax Heroes Club
              </Text>
            </Column>
          </Flex>
          <Flex gap="s" style={{ marginLeft: "auto" }}>
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
          </Flex>
        </Flex>
      </Flex>

      {/* 히어로 섹션 */}
      <Flex
        as="section"
        fillWidth
        paddingTop="xl"
        paddingBottom="xl"
        paddingX="l"
        horizontal="center"
      >
        <Column fillWidth maxWidth="xl" gap="xl">
          <Column gap="l" horizontal="center">
            <Badge
              style={{
                background:
                  "linear-gradient(to right, rgba(0, 212, 255, 0.2), rgba(123, 47, 247, 0.2))",
                border: "1px solid rgba(0, 212, 255, 0.3)",
                padding: "10px 20px",
              }}
            >
              🎮 Heroes of the Storm Community
            </Badge>
            <Heading
              variant="display-strong-xl"
              align="center"
              style={{
                background:
                  "linear-gradient(to right, #00d4ff, #7b2ff7, #ff3d00)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              함께 만드는 승리의 역사
            </Heading>
            <Text
              variant="heading-default-l"
              align="center"
              onBackground="neutral-weak"
              style={{ maxWidth: "42rem" }}
            >
              연합인포맥스 히오스 동호회에서 즐거운 게임과 소통을 경험하세요.
              <br />
              실력과 팀워크를 함께 키워나가는 커뮤니티입니다.
            </Text>
          </Column>

          {/* 주요 통계 */}
          <Grid columns="2" gap="m">
            <StatCard
              title="활동 멤버"
              value="10+"
              description="열정적인 히어로즈 플레이어"
              icon="👥"
            />
            <StatCard
              title="내전"
              value="3회"
              description="매주 함께하는 게임 세션"
              icon="🎯"
            />
          </Grid>

          {/* 탭 컨텐츠 */}
          <Card
            padding="l"
            style={{
              background: "var(--neutral-alpha-weak)",
              backdropFilter: "blur(12px)",
            }}
          >
            {activeTab === "about" && <AboutSection />}
            {activeTab === "activities" && <ActivitiesSection />}
            {activeTab === "members" && <MembersSection />}
          </Card>
        </Column>
      </Flex>

      {/* CTA 섹션 */}
      <Flex
        as="section"
        fillWidth
        paddingY="xl"
        paddingX="l"
        horizontal="center"
      >
        <Card
          fillWidth
          maxWidth="l"
          padding="xl"
          style={{
            background:
              "linear-gradient(to right, rgba(0, 212, 255, 0.1), rgba(123, 47, 247, 0.1))",
            border: "1px solid rgba(0, 212, 255, 0.3)",
          }}
        >
          <Column gap="l" horizontal="center">
            <Heading variant="display-strong-l" align="center">
              함께 플레이하고 싶으신가요?
            </Heading>
            <Text
              variant="heading-default-m"
              align="center"
              onBackground="neutral-weak"
            >
              연합인포맥스 히오스 동호회에 가입하여 즐거운 게임 문화를
              경험하세요!
            </Text>
            <BlockQuote author={{ name: "채수관" }}>
              “승리에 우연은 없습니다.”
            </BlockQuote>
          </Column>
        </Card>
      </Flex>
    </Column>
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
      padding="l"
      style={{
        background:
          "linear-gradient(135deg, var(--neutral-alpha-weak), var(--neutral-alpha-medium))",
        backdropFilter: "blur(12px)",
        transition: "all 0.3s ease",
      }}
    >
      <Column gap="m">
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
      </Column>
    </Card>
  );
}

/**
 * 소개 섹션 컴포넌트
 */
function AboutSection() {
  return (
    <Column gap="l">
      <Heading variant="display-strong-l">동호회 소개</Heading>
      <Column gap="xl">
        <Text variant="heading-default-m" onBackground="neutral-weak">
          연합인포맥스 히어로즈 동호회는 히어로즈 오브 더 스톰을 사랑하는
          임직원들이 모여 만든 게임 커뮤니티입니다. 실력 향상과 즐거운 게임
          문화를 목표로 정기적인 게임 세션과 소통의 장을 마련하고 있습니다.
        </Text>
        <Grid columns="2" mobileColumns="1" gap="m">
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
        </Grid>
      </Column>
    </Column>
  );
}

/**
 * 활동 섹션 컴포넌트
 */
function ActivitiesSection() {
  return (
    <Column gap="l">
      <Heading variant="display-strong-l">주요 활동</Heading>
      <Column gap="m">
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
      </Column>
    </Column>
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
      padding="l"
      style={{
        background: "var(--neutral-alpha-weak)",
        transition: "all 0.3s ease",
      }}
    >
      <Column gap="m">
        <Text variant="display-default-l">{icon}</Text>
        <Heading variant="heading-strong-l">{title}</Heading>
        <Text variant="body-default-m" onBackground="neutral-weak">
          {description}
        </Text>
      </Column>
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
      padding="l"
      style={{
        background: "var(--neutral-alpha-weak)",
        transition: "all 0.3s ease",
      }}
    >
      <Column gap="m">
        <Flex horizontal="between">
          <Heading variant="heading-strong-l">{title}</Heading>
          <Badge style={getBadgeColor(type)}>{type}</Badge>
        </Flex>
        <Text variant="body-default-s" style={{ color: "#00d4ff" }}>
          ⏰ {time}
        </Text>
        <Text variant="body-default-m" onBackground="neutral-weak">
          {description}
        </Text>
      </Column>
    </Card>
  );
}
