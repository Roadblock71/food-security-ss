import Link from "next/link";

export default function About() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Model & methodology</h1>
      <p className="mt-3 text-[#57534E]">
        A short card describing what this tool does, how it was built, and where
        it should not be trusted.
      </p>

      <section className="mt-10 space-y-8">
        <div>
          <h2 className="text-lg font-semibold">What it predicts</h2>
          <p className="mt-2 text-[#57534E]">
            The binary outcome <code className="rounded bg-[#F8F7F4] px-1.5 py-0.5 text-xs">food_insecurity_risk</code>:
            1 if a county is classified IPC Phase 3+ (Crisis, Emergency, or
            Catastrophe) in the target period, 0 if Minimal or Stressed.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Model</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[#57534E]">
            <li>Random Forest, 500 trees, depth 8, class-balanced</li>
            <li>35 engineered features from 9 raw inputs</li>
            <li>Ensemble of the county&apos;s own prior-period history (lags 1–3) plus derived ratios</li>
            <li>No target encoding — validated on real temporal holdouts</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Validation</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[#57534E]">
            <li>Walk-forward splits on 2023, 2024, 2025-04, 2025-09</li>
            <li>Public Zindi AUC: <strong className="text-[#1C1917]">0.9642</strong></li>
            <li>OOF AUC on full training set: 0.9611</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Limitations</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[#57534E]">
            <li>County-level, not household-level</li>
            <li>Cannot model conflict shocks or new displacement events</li>
            <li>Lag features are stale for future test periods</li>
            <li>Only as current as the last cereal-production figure available</li>
          </ul>
        </div>

        <div className="rounded-xl border border-[#E7E5E0] bg-[#F8F7F4] p-5">
          <p className="text-sm text-[#57534E]">
            <strong className="text-[#1C1917]">Built for IndabaX South Sudan 2026.</strong>{" "}
            The model is intended to complement the IPC&apos;s expert-led process —
            not replace it.
          </p>
        </div>
      </section>

      <Link href="/" className="mt-10 inline-block text-sm underline">
        ← Back to dashboard
      </Link>
    </main>
  );
}