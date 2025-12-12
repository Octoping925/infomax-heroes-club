import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "연합인포맥스 히오스 동호회",
  description: "연합인포맥스 히어로즈 오브 더 스톰 동호회",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head></head>
      <body style={{ margin: 0, padding: 0, minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
