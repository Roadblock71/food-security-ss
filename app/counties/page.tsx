"use client";
import CountyGrid from "@/components/CountyGrid";

export default function CountiesPage() {
  return (
    <main className="px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#1E3A8A]">
          Explorer
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          All counties
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#57534E]">
          Current predictions for every county. Star any county to add it to
          your close-monitoring list — saved locally in this browser.
        </p>
      </header>

      <div className="rounded-3xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
        <CountyGrid />
      </div>
    </main>
  );
}