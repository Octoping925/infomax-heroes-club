import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppQueryProvider } from "./providers";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
  style: "normal",
});

export const metadata: Metadata = {
  title: "연합인포맥스 히오스 동호회",
  description: "연합인포맥스 히어로즈 오브 더 스톰 동호회",
};

interface RootLayoutProps {
  readonly children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head></head>
      <body className={pretendard.variable} style={{ margin: 0, padding: 0, minHeight: "100vh" }}>
        <AppQueryProvider>{children}</AppQueryProvider>
      </body>
    </html>
  );
}
