"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconGrid, IconGauge, IconMap, IconInfo, IconBell,
} from "./Icons";

const LINKS = [
  { href: "/",        label: "Dashboard", icon: IconGrid },
  { href: "/predict", label: "Predict",   icon: IconGauge },
  { href: "/map",     label: "Risk Map",  icon: IconMap },
  { href: "/about",   label: "About",     icon: IconInfo },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-[#E7E5E0] bg-[#F8F7F4]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#1E3A8A]">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="truncate text-sm font-semibold tracking-tight text-[#1C1917] sm:text-base">
            South Sudan Food Security
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {LINKS.map((l) => {
            const Icon = l.icon;
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  active
                    ? "bg-[#1E3A8A] text-white"
                    : "text-[#57534E] hover:bg-[#E7E5E0]/60 hover:text-[#1C1917]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className="ml-1 grid h-8 w-8 place-items-center rounded-md text-[#57534E] hover:bg-[#E7E5E0]/60"
            aria-label="Alerts"
          >
            <IconBell className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}