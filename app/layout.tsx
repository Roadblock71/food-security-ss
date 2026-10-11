import type { Metadata, Viewport } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "South Sudan Food Security Risk",
  description:
    "Early-warning signal for IPC Phase 3+ between formal assessments",
  other: {
    // Tells the Dark Reader browser extension to skip this page.
    "darkreader-lock": "true",
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8F7F4] text-[#1C1917] antialiased">
        <Sidebar />
        <div className="lg:pl-64">{children}</div>
      </body>
    </html>
  );
}