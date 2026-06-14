import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "DiffMentor",
  description: "Beginner-friendly AI Pull Request mentor for GitHub"
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
