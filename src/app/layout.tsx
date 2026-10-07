import type { Metadata } from "next";
import { Noto_Sans_TC, ZCOOL_XiaoWei } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans_TC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const display = ZCOOL_XiaoWei({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "三好關卡",
  description:
    "築牌 Roguelike：用三好與四給卡牌澄清誤會，AI 煉卡師幫你長牌庫。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${sans.variable} ${display.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
