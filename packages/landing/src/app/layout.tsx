import type { Metadata } from "next";
import { env } from "@/config/env.config";
import "./globals.css";

// Render at request time so APP_URL/SITE_URL are read from the container env
// (byte-identical image per tier) instead of being baked into prerendered HTML
// at build. Applies to every route under this root layout.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: "Kanbandiv",
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
