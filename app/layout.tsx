import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小店管家",
  description: "通用零售收银记账系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
