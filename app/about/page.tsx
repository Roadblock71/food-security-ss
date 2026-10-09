import Link from "next/link";

const SECTIONS = [
  {
    title: "What it predicts",
    body: (
      <>
        The binary target{" "}
        <code className="rounded bg-[#F8F7F4] px-1.5 py-0.5 text-xs">
          food_insecurity_risk
        </code>
        : <strong>1</strong> if a county is classified IPC Phase 3+ (Crisis,
        Emergency, or Catastrophe) in the target period, <strong>0</strong> if
        Minimal or Stressed.
      </>
    ),
  },
];

export default function About() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#1E3A8A]">
        Model card
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
        Model & methodology
      </h1>
      <p className="mt-3 text-sm text-[#57534E] sm:text-base">
        What this tool does, how it was built, and where it should not be
        trusted.
      </p>

      <div className="mt-10 space-y-6">
        {SECTIONS.map((s) => (
          <section
            key={s.title}
            className="rounded-2xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6"
          >
            <h2 className="text-base font-semibold sm:text-lg">{s.title}</h2>
            <p className="mt-2 text-sm text-[#57534E] sm:text-base">{s.body}</p>
          </section>
        ))}

        <section className="rounded-2xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold sm:text-lg">Model</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-[#57534E] sm:text-base">
            <li>
              Random Forest, 500 trees, depth 8, class-balanced via{" "}
              <code className="rounded bg-[#F8F7F4] px-1.5 py-0.5 text-xs">
                class_weight=&quot;balanced&quot;
              </code>
            </li>
            <li>35 engineered features from 9 raw inputs</li>
            <li>
              County-history features: 1/2/3-step lags, rolling-3 means, and
              per-county mean production
            </li>
            <li>
              Deliberately <em>no</em> target encoding — validated against real
              temporal holdouts
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold sm:text-lg">Validation</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Zindi AUC", value: "0.9642", sub: "public leaderboard" },
              { label: "OOF AUC", value: "0.9611", sub: "5-fold cross-val" },
              { label: "F1 @ 0.19", value: "0.944", sub: "on OOF predictions" },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-lg border border-[#E7E5E0] bg-[#F8F7F4] p-3"
              >
                <div className="text-[10px] font-medium uppercase tracking-wider text-[#78716C]">
                  {k.label}
                </div>
                <div className="mt-1 text-xl font-semibold">{k.value}</div>
                <div className="text-[10px] text-[#78716C]">{k.sub}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-[#57534E]">
            Walk-forward splits on <strong>2023</strong>, <strong>2024</strong>,{" "}
            <strong>2025-04</strong>, and <strong>2025-09</strong> — training
            only on rows available before each target period. Reported AUC is on
            the held-out future window, not a random split.
          </p>
        </section>

        <section className="rounded-2xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold sm:text-lg">Limitations</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-[#57534E] sm:text-base">
            <li>County-level only — does not model household variation</li>
            <li>
              Cannot anticipate sudden conflict shocks or new displacement
              events
            </li>
            <li>
              Lag features are stale for future test periods (a county&apos;s
              most recent history may be months old)
            </li>
            <li>
              Only as current as the last available cereal production figure
            </li>
            <li>
              Trained on 2014–2025 data; model drift is likely beyond 2027
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[#E7E5E0] bg-[#F8F7F4] p-5 text-sm text-[#57534E] sm:p-6">
          <p className="font-medium text-[#1C1917]">Intended use</p>
          <p className="mt-2">
            Built for <strong className="text-[#1C1917]">IndabaX South Sudan 2026</strong>{" "}
            to support analysts and responders between formal IPC assessment
            cycles. It is not a replacement for the IPC&apos;s expert-led
            classification process. Every prediction should be treated as one
            input alongside field reports, local knowledge, and humanitarian
            judgment.
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/predict"
          className="rounded-lg bg-[#1E3A8A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF]"
        >
          Run an assessment →
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-[#E7E5E0] bg-white px-5 py-2.5 text-sm font-medium hover:bg-[#F8F7F4]"
        >
          ← Back to dashboard
        </Link>
      </div>
    </main>
  );
}