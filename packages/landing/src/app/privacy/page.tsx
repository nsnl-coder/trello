import type { Metadata } from "next";
import { PrivacyPolicy } from "@/features/legal/components/privacy-policy";

export const metadata: Metadata = {
  title: "Privacy Policy | Kanbandiv",
  description: "How Kanbandiv collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <PrivacyPolicy />;
}
