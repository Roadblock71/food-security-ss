import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "South Sudan Food Security Risk",
  description: "Early-warning signal for IPC Phase 3+ between formal assessments",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8F7F4] text-[#1C1917] antialiased">
        <NavBar />
        {children}
      </body>
    </html>
  );
}