import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "修仙卡牌 · 戰鬥沙盒",
  description: "傳統修仙風格 RPG 卡牌副本戰鬥",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
