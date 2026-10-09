"use client";
import { Suspense } from "react";
import CountyGrid from "@/components/CountyGrid";

function GridFallback() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-2xl bg-[#F1F0EC]"
        />
      ))}
    </div>
  );
}

export default function CountiesPage() {
  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#1E3A8A]">
          Explorer
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          All counties
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#57534E]">
          Current predictions for every county. Star any county to add it to
          your close-monitoring list — saved locally in this browser.
        </p>
      </header>

      <div className="rounded-3xl border border-[#EBE8E2] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-6">
        <Suspense fallback={<GridFallback />}>
          <CountyGrid />
        </Suspense>
      </div>
    </main>
  );
}