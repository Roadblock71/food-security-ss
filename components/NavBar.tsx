"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/",        label: "Dashboard" },
  { href: "/predict", label: "Predict" },
  { href: "/about",   label: "About" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-40 border-b border-[#E7E5E0] bg-[#F8F7F4]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1E3A8A]" />
          <span className="text-sm font-semibold tracking-tight text-[#1C1917] sm:text-base">
            South Sudan Food Security
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  active
                    ? "bg-[#1E3A8A] text-white"
                    : "text-[#57534E] hover:bg-[#E7E5E0]/60 hover:text-[#1C1917]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}