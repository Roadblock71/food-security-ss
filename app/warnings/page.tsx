"use client";
import Link from "next/link";
import CountyGrid from "@/components/CountyGrid";
import { IconArrow } from "@/components/Icons";

export default function WarningsPage() {
  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#991B1B]">
          Early warning
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Counties flagged for closer assessment
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#57534E]">
          Counties where the model predicts an ≥ 85% probability of IPC Phase
          3+ in the next assessment period. Prioritise for field verification
          and resource pre-positioning.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/predict"
            className="inline-flex items-center gap-2 rounded-lg bg-[#991B1B] px-4 py-2 text-sm font-medium text-white hover:bg-[#7F1D1D]"
          >
            Run a detailed assessment <IconArrow className="h-4 w-4" />
          </Link>
          <Link
            href="/counties"
            className="inline-flex items-center gap-2 rounded-lg border border-[#E7E5E0] bg-white px-4 py-2 text-sm font-medium hover:bg-[#F8F7F4]"
          >
            Browse all counties
          </Link>
        </div>
      </header>

      <div className="rounded-3xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
        <CountyGrid mode="warnings" showFilters={true} />
      </div>
    </main>
  );
}