import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "搜索引擎评测工具 - Z-Eval",
  description: "多维度评估搜索引擎结果质量的专业工具，支持自定义评分体系和批量测试",
  keywords: "搜索引擎,评测,质量评估,权威性,相关性,时效性",
};

/**
 * 根布局组件
 * 提供全局样式和元数据配置
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
