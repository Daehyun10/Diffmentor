import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI Code Reviewer",
  description: "Beginner-friendly AI code review for GitHub Pull Requests"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
