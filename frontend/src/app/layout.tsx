import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buggi - Autonomous Bug Bounty Assistant",
  description: "Desktop-resident cybersecurity AI research assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="select-none bg-transparent text-gray-200 antialiased font-mono">
        {children}
      </body>
    </html>
  );
}
