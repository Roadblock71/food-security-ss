import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "South Sudan Food Security Risk",
  description: "Early-warning signal for IPC Phase 3+ between formal assessments",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}