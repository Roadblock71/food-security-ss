"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/",        label: "Dashboard" },
  { href: "/predict", label: "Predict" },
  { href: "/map",     label: "Risk Map" },
  { href: "/about",   label: "About" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-40 border-b border-[#E7E5E0] bg-[#F8F7F4]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#1E3A8A]" />
          <span className="font-semibold tracking-tight text-[#1C1917]">
            South Sudan Food Security
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
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