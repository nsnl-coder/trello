import type { Metadata } from "next";
import { env } from "@/config/env.config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: "Trello Clone",
  description: "Plan, track, and ship work with boards, lists, and cards.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
