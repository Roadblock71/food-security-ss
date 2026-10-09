import Link from "next/link";

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#1E3A8A]">
        Methodology
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
        How the model works
      </h1>
      <p className="mt-3 text-sm text-[#57534E] sm:text-base">
        What this tool does, how it was built, and where it should not be
        trusted.
      </p>

      <div className="mt-10 space-y-6">
        <section className="rounded-2xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold sm:text-lg">
            What it predicts
          </h2>
          <p className="mt-2 text-sm text-[#57534E] sm:text-base">
            The binary target{" "}
            <code className="rounded bg-[#F8F7F4] px-1.5 py-0.5 text-xs">
              food_insecurity_risk
            </code>
            : <strong>1</strong> if a county is classified IPC Phase 3+
            (Crisis, Emergency, or Catastrophe) in the target period,{" "}
            <strong>0</strong> if Minimal or Stressed.
          </p>
        </section>

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
              No target encoding — deliberately removed after it hurt
              out-of-sample performance
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold sm:text-lg">Validation</h2>
          <p className="mt-2 text-sm text-[#57534E]">
            Walk-forward splits — training only on rows available before each
            target period, then evaluating on the future window. The four
            holdouts below are the four test periods we set aside.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E7E5E0] text-[10px] uppercase tracking-wider text-[#78716C] sm:text-xs">
                  <th className="py-2 pr-3 font-medium">Holdout period</th>
                  <th className="py-2 pr-3 font-medium">Rows</th>
                  <th className="py-2 pl-3 text-right font-medium">AUC</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { period: "2023",        rows: 234, auc: 0.960 },
                  { period: "2024",        rows: 236, auc: 0.984 },
                  { period: "2025-04",     rows:  78, auc: 0.990 },
                  { period: "2025-09 (CV)",rows: 204, auc: 0.978 },
                ].map((r) => (
                  <tr
                    key={r.period}
                    className="border-b border-[#F1F0EC] last:border-0"
                  >
                    <td className="py-2 pr-3 font-mono text-xs">{r.period}</td>
                    <td className="py-2 pr-3 text-xs text-[#78716C]">
                      {r.rows}
                    </td>
                    <td className="py-2 pl-3 text-right font-mono font-semibold">
                      {r.auc.toFixed(3)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-3 pr-3 text-xs font-medium text-[#1C1917]">
                    Mean
                  </td>
                  <td className="pt-3 pr-3" />
                  <td className="pt-3 pl-3 text-right font-mono text-base font-semibold text-[#1E3A8A]">
                    0.978
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-[#57534E]">
            A separate 5-fold cross-validation across the full training set
            gives an out-of-fold AUC of <strong>0.950</strong>. That number is
            lower than the walk-forward mean because the random 5-fold mixes
            earlier, noisier periods into both training and validation.
          </p>
        </section>

        <section className="rounded-2xl border border-[#E7E5E0] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold sm:text-lg">
            Threshold analysis
          </h2>
          <p className="mt-2 text-sm text-[#57534E] sm:text-base">
            Choosing a decision threshold of <strong>0.32</strong> maximises F1
            on out-of-fold predictions:
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "F1",        value: "0.937" },
              { label: "Precision", value: "0.924" },
              { label: "Recall",    value: "0.950" },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-lg border border-[#E7E5E0] bg-[#F8F7F4] p-3"
              >
                <div className="text-[10px] font-medium uppercase tracking-wider text-[#78716C]">
                  {k.label}
                </div>
                <div className="mt-1 text-xl font-semibold">{k.value}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#78716C]">
            Recall is prioritised over precision — for a humanitarian signal,
            missing a deteriorating county is more costly than an unnecessary
            check-in.
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
              Lag features are stale for future test periods — a county&apos;s
              most recent history may be months old
            </li>
            <li>Only as current as the last available cereal production figure</li>
            <li>Trained on 2014–2025 data; drift is likely beyond 2027</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[#E7E5E0] bg-[#F8F7F4] p-5 text-sm text-[#57534E] sm:p-6">
          <p className="font-medium text-[#1C1917]">Intended use</p>
          <p className="mt-2">
            Built for{" "}
            <strong className="text-[#1C1917]">
              IndabaX South Sudan 2026
            </strong>{" "}
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
          ← Back to overview
        </Link>
      </div>
    </main>
  );
}