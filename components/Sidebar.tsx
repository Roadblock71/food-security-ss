"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  IconHome, IconGauge, IconSearch, IconMap, IconAlert,
  IconInfo, IconMenu, IconX, IconPulse,
} from "./Icons";

const LINKS = [
  { href: "/",          label: "Dashboard",         icon: IconHome },
  { href: "/predict",   label: "Risk Predictor",    icon: IconGauge },
  { href: "/counties",  label: "County Intelligence", icon: IconSearch },
  { href: "/atlas",     label: "Risk Atlas",        icon: IconMap },
  { href: "/warnings",  label: "Early Warning",     icon: IconAlert },
  { href: "/about",     label: "Model & Methodology", icon: IconInfo },
];

interface Props {
  warningCount?: number;
}

export default function Sidebar({ warningCount = 0 }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer when route changes
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const NavList = (
    <nav className="flex flex-col gap-0.5">
      {LINKS.map((l) => {
        const Icon = l.icon;
        const active =
          l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        const showBadge = l.href === "/warnings" && warningCount > 0;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-[#EEF2FF] text-[#1E3A8A]"
                : "text-[#57534E] hover:bg-[#F1F0EC] hover:text-[#1C1917]"
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? "text-[#1E3A8A]" : "text-[#A8A29E] group-hover:text-[#57534E]"}`} />
            <span className="flex-1 truncate">{l.label}</span>
            {showBadge && (
              <span className="rounded-full bg-[#FEF2F2] px-1.5 py-0.5 text-[10px] font-semibold text-[#991B1B]">
                {warningCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const Header = (
    <div className="mb-6 flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#1E3A8A] text-white">
        <IconPulse className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold tracking-tight text-[#1C1917]">
          South Sudan
        </div>
        <div className="text-[10px] uppercase tracking-widest text-[#78716C]">
          Food Security
        </div>
      </div>
    </div>
  );

  const Footer = (
    <div className="mt-6 border-t border-[#E7E5E0] pt-4">
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#78716C]">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" /> API
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" /> Model
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" /> Dataset
        </span>
      </div>
      <div className="mt-2 text-[10px] text-[#A8A29E]">
        IndabaX South Sudan 2026
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar (fixed left rail) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#E7E5E0] bg-white px-4 py-6 lg:flex">
        {Header}
        {NavList}
        <div className="mt-auto">{Footer}</div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E7E5E0] bg-[#F8F7F4]/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#1E3A8A] text-white">
            <IconPulse className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            South Sudan Food Security
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid h-8 w-8 place-items-center rounded-md text-[#57534E] hover:bg-[#E7E5E0]/60"
          aria-label="Open navigation"
        >
          <IconMenu className="h-5 w-5" />
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-[#E7E5E0] bg-white px-4 py-6 shadow-xl">
            <div className="flex items-start justify-between">
              {Header}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-[#57534E] hover:bg-[#E7E5E0]/60"
                aria-label="Close navigation"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            {NavList}
            <div className="mt-8">{Footer}</div>
          </aside>
        </div>
      )}
    </>
  );
}