import Link from "next/link";

const KPIS = [
  { label: "Counties covered",     value: "79",       sub: "across 11 states" },
  { label: "Training observations", value: "3,099",    sub: "IPC periods 2014–2025" },
  { label: "Validation AUC",        value: "0.964",    sub: "temporal holdout" },
  { label: "Model",                 value: "RF × 500", sub: "class-balanced trees" },
];

const ACTIONS = [
  {
    href: "/predict",
    title: "Run a risk assessment",
    desc: "Enter county context and get a probability of IPC Phase 3+.",
    accent: "bg-[#1E3A8A]",
  },
  {
    href: "/map",
    title: "View the risk atlas",
    desc: "See all 79 counties coloured by predicted probability.",
    accent: "bg-[#B45309]",
  },
  {
    href: "/about",
    title: "Model & methodology",
    desc: "Features, validation, and limitations — read before use.",
    accent: "bg-[#57534E]",
  },
];

export default function Dashboard() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <section className="rounded-2xl border border-[#E7E5E0] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#1E3A8A]">
          Humanitarian early-warning
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight">
          Food security intelligence <br />
          for South Sudan
        </h1>
        <p className="mt-4 max-w-2xl text-[#57534E]">
          Historical context, predictive signals, and county-level risk scores
          for analysts and responders — a complement to the expert-led IPC
          classification process.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/predict"
            className="rounded-lg bg-[#1E3A8A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF]"
          >
            Run an assessment →
          </Link>
          <Link
            href="/map"
            className="rounded-lg border border-[#E7E5E0] bg-white px-5 py-2.5 text-sm font-medium hover:bg-[#F8F7F4]"
          >
            Open risk atlas
          </Link>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-xl border border-[#E7E5E0] bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-[#78716C]">
              {k.label}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{k.value}</div>
            <div className="mt-1 text-xs text-[#78716C]">{k.sub}</div>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[#78716C]">
          Quick actions
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group rounded-xl border border-[#E7E5E0] bg-white p-5 transition-colors hover:border-[#1E3A8A]/30 hover:bg-[#F8F7F4]"
            >
              <span className={`inline-block h-2 w-2 rounded-full ${a.accent}`} />
              <h3 className="mt-3 text-base font-semibold">{a.title}</h3>
              <p className="mt-1 text-sm text-[#57534E]">{a.desc}</p>
              <span className="mt-3 inline-block text-sm font-medium text-[#1E3A8A] opacity-0 transition-opacity group-hover:opacity-100">
                Continue →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-[#E7E5E0] bg-[#F8F7F4] p-5 text-sm text-[#57534E]">
        <p className="font-medium text-[#1C1917]">Disclaimer</p>
        <p className="mt-1">
          This tool provides an early-warning signal between formal IPC
          assessment cycles. It is not a replacement for IPC classification and
          should be used alongside expert analysis.
        </p>
      </section>
    </main>
  );
}