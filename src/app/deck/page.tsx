"use client";
import { useState, useEffect, useCallback } from "react";

/* Hide native number input spinners */
const hideSpinners = `
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
`;

function StepInput({ value, onChange, min = 0, max = Infinity, step = 1 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <div className="flex flex-col -my-1">
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="text-gray-400 hover:text-purple-500 leading-none text-xs px-1"
        >&#9650;</button>
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="text-gray-400 hover:text-purple-500 leading-none text-xs px-1"
        >&#9660;</button>
      </div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Math.min(max, Math.max(min, parseFloat(e.target.value) || min)))}
        className="w-36 text-right font-bold rounded-lg border border-gray-300 px-3 py-1 focus:outline-none focus:border-purple-400"
        style={{ color: "var(--theme-primary)" }}
      />
    </div>
  );
}

function MarketSlide({ active }: { active: boolean }) {
  const [showHighlight, setShowHighlight] = useState(false);
  const [showTagline1, setShowTagline1] = useState(false);
  const [showTagline2, setShowTagline2] = useState(false);

  useEffect(() => {
    if (active) {
      const boxTimer = setTimeout(() => setShowHighlight(true), 1000);
      // Box fades 2s (done at 3s), 1s pause → line 1 at 4s, fades 2s (done at 6s) → line 2 at 6s
      const tag1Timer = setTimeout(() => setShowTagline1(true), 4000);
      const tag2Timer = setTimeout(() => setShowTagline2(true), 6000);
      return () => { clearTimeout(boxTimer); clearTimeout(tag1Timer); clearTimeout(tag2Timer); };
    }
    setShowHighlight(false);
    setShowTagline1(false);
    setShowTagline2(false);
  }, [active]);

  return (
    <div className="flex flex-col justify-center h-full max-w-5xl mx-auto">
      <h2 className="text-5xl font-bold text-gray-900 mb-8">2025 SaaS Spend</h2>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="py-2 px-4 text-center align-bottom" style={{ height: 240 }}>
              <div className="flex justify-center items-end h-full">
                <div className="rounded-full flex items-center justify-center text-white font-bold text-2xl" style={{ width: 220, height: 220, backgroundColor: "var(--theme-primary)" }}>$350B</div>
              </div>
            </th>
            <th className="py-2 px-4 text-center align-bottom" style={{ height: 240 }}>
              <div className="flex justify-center items-end h-full">
                <div className="rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ width: 120, height: 120, backgroundColor: "var(--theme-secondary)" }}>$105B</div>
              </div>
            </th>
            <th className="py-2 px-4 text-center align-bottom relative" style={{ height: 240 }}>
              <div
                className="absolute inset-0 border-2 rounded-xl transition-opacity duration-[2000ms]"
                style={{
                  borderColor: "var(--theme-accent)",
                  opacity: showHighlight ? 1 : 0,
                  top: 100,
                  bottom: -260,
                  left: -4,
                  right: -4,
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              />
              <div className="flex justify-center items-end h-full">
                <div className="rounded-full flex items-center justify-center text-white font-bold" style={{ width: 78, height: 78, backgroundColor: "var(--theme-accent)" }}>$44B</div>
              </div>
            </th>
            <th className="py-2 pr-4 align-bottom">
              <p
                className="text-lg font-semibold text-right leading-snug transition-opacity duration-[2000ms]"
                style={{
                  color: "var(--theme-accent)",
                  opacity: showTagline1 ? 1 : 0,
                }}
              >
                Big enough to need software.
              </p>
              <p
                className="text-lg font-semibold text-right leading-snug transition-opacity duration-[2000ms]"
                style={{
                  color: "var(--theme-accent)",
                  opacity: showTagline2 ? 1 : 0,
                }}
              >
                Smart enough not to overpay for it.
              </p>
            </th>
          </tr>
          <tr className="border-b-2 border-gray-200">
            <th className="py-2 px-4 text-base font-semibold text-center" style={{ color: "var(--theme-primary)" }}>Global</th>
            <th className="py-2 px-4 text-base font-semibold text-center" style={{ color: "var(--theme-secondary)" }}>US 5–500 employees</th>
            <th className="py-2 px-4 text-base font-semibold text-center" style={{ color: "var(--theme-accent)" }}>US 5–50 employees</th>
            <th className="py-2 pr-4 text-sm font-semibold text-gray-500"></th>
          </tr>
        </thead>
        <tbody className="text-lg text-gray-700">
          <tr className="border-b border-gray-100">
            <td className="py-3 px-4 text-center">—</td>
            <td className="py-3 px-4 text-center">2.35M</td>
            <td className="py-3 px-4 text-center">2.12M</td>
            <td className="py-3 pl-4 font-medium text-gray-500 text-right">Number of Businesses</td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-3 px-4 text-center">—</td>
            <td className="py-3 px-4 text-center">26</td>
            <td className="py-3 px-4 text-center">15</td>
            <td className="py-3 pl-4 font-medium text-gray-500 text-right">Average Employee Count</td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-3 px-4 text-center">—</td>
            <td className="py-3 px-4 text-center">61.6M</td>
            <td className="py-3 px-4 text-center">31.1M</td>
            <td className="py-3 pl-4 font-medium text-gray-500 text-right">Total Number of Employees</td>
          </tr>
          <tr>
            <td className="py-3 px-4 text-center">—</td>
            <td className="py-3 px-4 text-center">$1,700</td>
            <td className="py-3 px-4 text-center">$1,400</td>
            <td className="py-3 pl-4 font-medium text-gray-500 text-right">Annual SaaS Spend per Employee</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function FinancialModelSlide() {
  const [customers, setCustomers] = useState(1270000);
  const [usersPerCustomer, setUsersPerCustomer] = useState(15);
  const [appsPerUser, setAppsPerUser] = useState(5);
  const [penetration, setPenetration] = useState(1);
  const hostingCostPerApp = 2.68;
  const gensPerWeek = 1;
  const pricePerUserApp = 1;
  const minPerUser = 5;
  const costPerGeneration = 1.50;

  const penetratedCustomers = customers * (penetration / 100);
  const totalUsers = penetratedCustomers * usersPerCustomer;
  const effectivePerUser = Math.max(appsPerUser * pricePerUserApp, minPerUser);
  const annualAppRevenue = totalUsers * effectivePerUser * 12;
  // Hosting cost per app/mo ($2.68). Hosting revenue = cost + 20% markup.
  const monthlyHostingCost = penetratedCustomers * appsPerUser * hostingCostPerApp;
  const annualInfraCost = monthlyHostingCost * 12;
  const annualHostingRevenue = annualInfraCost * 1.20;
  const annualInferenceCost = penetratedCustomers * gensPerWeek * costPerGeneration * 52;
  const totalAnnualRevenue = annualAppRevenue + annualHostingRevenue;
  const totalAnnualCost = annualInfraCost + annualInferenceCost;
  const annualGrossProfit = totalAnnualRevenue - totalAnnualCost;
  const grossMargin = totalAnnualRevenue > 0 ? (annualGrossProfit / totalAnnualRevenue) * 100 : 0;

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `$${(n / 1_000).toFixed(0)}K`
        : `$${n.toFixed(0)}`;

  return (
    <div className="flex flex-col justify-center h-full max-w-5xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: hideSpinners }} />
      <h2 className="text-5xl font-bold text-gray-900 mb-8">Financial Model</h2>

      <table className="w-full text-left border-collapse text-lg" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "24%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "3%" }} />
          <col style={{ width: "24%" }} />
          <col style={{ width: "22%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className="pb-4 text-xl font-bold text-gray-800" colSpan={2}>Assumptions</th>
            <th className="pb-4 w-8"></th>
            <th className="pb-4 text-xl font-bold text-gray-800" colSpan={2}>Outputs</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="py-3 text-gray-600">Addressable Businesses</td>
            <td className="py-3 text-right">
              <StepInput value={customers} onChange={setCustomers} min={0} step={1000} />
            </td>
            <td></td>
            <td className="py-3 text-gray-600">Total Businesses</td>
            <td className="py-3 text-right font-bold" style={{ color: "var(--theme-secondary)" }}>
              {Math.round(penetratedCustomers).toLocaleString()}
            </td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-3 text-gray-600">Market Penetration</td>
            <td className="py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <StepInput value={penetration} onChange={setPenetration} min={0} max={100} step={penetration < 1 ? 0.1 : 1} />
                <span className="font-bold" style={{ color: "var(--theme-primary)" }}>%</span>
              </div>
            </td>
            <td></td>
            <td className="py-3 text-gray-600">Total Users</td>
            <td className="py-3 text-right font-bold" style={{ color: "var(--theme-secondary)" }}>
              {Math.round(totalUsers).toLocaleString()}
            </td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-3 text-gray-600">Seats per Business</td>
            <td className="py-3 text-right">
              <StepInput value={usersPerCustomer} onChange={setUsersPerCustomer} min={1} />
            </td>
            <td></td>
            <td className="py-3 text-gray-600 font-semibold">Total Annual Revenue</td>
            <td className="py-3 text-right text-xl font-bold gradient-brand-text">
              {fmt(totalAnnualRevenue)}
            </td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-3 text-gray-600">Apps per Business</td>
            <td className="py-3 text-right">
              <StepInput value={appsPerUser} onChange={setAppsPerUser} min={1} />
            </td>
            <td></td>
            <td className="py-3 text-gray-600">Annual Hosting Cost</td>
            <td className="py-3 text-right font-bold text-gray-500">
              {fmt(annualInfraCost)}
            </td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-3 text-gray-600">Price</td>
            <td className="py-3 text-right font-bold text-gray-800">
              $1/user/app/mo
            </td>
            <td></td>
            <td className="py-3 text-gray-600">Annual Inference Cost</td>
            <td className="py-3 text-right font-bold text-gray-500">
              {fmt(annualInferenceCost)}
            </td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-3 text-gray-600">Monthly Revenue per Business</td>
            <td className="py-3 text-right font-bold" style={{ color: "var(--theme-secondary)" }}>
              {fmt(effectivePerUser * usersPerCustomer)}
            </td>
            <td></td>
            <td className="py-3 text-gray-600">Annual Gross Profit</td>
            <td className="py-3 text-right font-bold" style={{ color: "var(--theme-accent)" }}>
              {fmt(annualGrossProfit)}
            </td>
          </tr>
          <tr>
            <td className="py-3 text-gray-600">Hosting Costs/Month</td>
            <td className="py-3 text-right font-bold" style={{ color: "var(--theme-secondary)" }}>
              {fmt(monthlyHostingCost)}
            </td>
            <td></td>
            <td className="py-3 text-gray-600 font-semibold">Gross Margin</td>
            <td className="py-3 text-right text-xl font-bold" style={{ color: "var(--theme-accent)" }}>
              {grossMargin.toFixed(0)}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const slides = [
  {
    id: "title",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-7xl font-bold gradient-brand-text mb-6">GO4IT</h1>
        <p className="text-2xl text-gray-600 max-w-[48.4rem]">
          AI-enabled software tools to help small businesses do big things.
        </p>
      </div>
    ),
  },
  {
    id: "problem",
    content: (
      <div className="flex flex-col justify-center h-full max-w-5xl mx-auto">
        <h2 className="text-5xl font-bold text-gray-900 mb-10">The Problem</h2>
        <div className="space-y-6">
          <p className="text-2xl text-gray-700">
            US small businesses spend{" "}
            <span className="font-bold text-theme-accent">
              ~$1,400/employee/year
            </span>{" "}
            on SaaS software.
          </p>
          <p className="text-2xl text-gray-700">
            For a 20-person company, that&apos;s{" "}
            <span className="font-bold text-theme-secondary">$28,000/year</span>{" "}
            on tools they barely customize.
          </p>
          <p className="text-2xl text-gray-700">
            Most are paying for features they don&apos;t need, from vendors with inflexible tools.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "solution",
    content: (
      <div className="flex flex-col justify-center h-full max-w-5xl mx-auto">
        <h2 className="text-5xl font-bold text-gray-900 mb-10">
          The Solution
        </h2>
        <div className="space-y-6">
          <p className="text-2xl text-gray-700">
            GO4IT is a{" "}
            <span className="font-bold gradient-brand-text">
              free marketplace
            </span>{" "}
            for human-ideated, AI-generated SaaS applications.
          </p>
          <p className="text-2xl text-gray-700">
            Pick from a library of ready-made tools — or describe what you need
            in plain English
            <br />
            and AI builds it for you.
          </p>
          <p className="text-2xl text-gray-700">
            We host everything, directly in your browser. No cloud experience required.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "how",
    content: (
      <div className="flex flex-col justify-center h-full max-w-5xl mx-auto">
        <h2 className="text-5xl font-bold text-gray-900 mb-10">
          How It Works
        </h2>
        <div className="grid grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Browse or Create",
              desc: "Pick apps from the marketplace, or describe one in plain English.",
            },
            {
              step: "2",
              title: "Configure",
              desc: "Select your applications, customize layouts, and invite your team.",
            },
            {
              step: "3",
              title: "Launch",
              desc: "Your apps are live under your custom URL.",
            },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-16 h-16 rounded-full gradient-brand text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                {s.step}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {s.title}
              </h3>
              <p className="text-lg text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  { id: "market", content: null },
  {
    id: "sizing",
    content: (
      <div className="flex flex-col justify-center h-full max-w-5xl mx-auto">
        <h2 className="text-5xl font-bold text-gray-900 mb-10">
          Our Addressable Market
        </h2>

        <div className="flex items-start gap-3">
          {/* $44B starting block */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
              style={{ width: 130, height: 130, backgroundColor: "#f97316" }}
            >
              $44B
            </div>
            <p className="text-sm font-semibold mt-2" style={{ color: "#f97316" }}>
              US 5–50 SaaS
            </p>
          </div>

          {/* Arrow + filter 1: industry fit */}
          <div className="flex flex-col items-center flex-1 pt-[42px]">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
              75% industry fit
            </div>
            <div className="w-full h-0.5 bg-gray-300 relative">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-gray-300" />
            </div>
            <div className="mt-2 text-xs text-gray-500 leading-tight text-center">
              <span className="text-green-600 font-semibold">Yes:</span> Retail, services, tech<br />
              <span className="text-red-400 font-semibold">No:</span> Healthcare, education
            </div>
          </div>

          {/* $33B block */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
              style={{ width: 130, height: 130, backgroundColor: "#e8527a" }}
            >
              $33B
            </div>
            <p className="text-sm font-semibold mt-2" style={{ color: "#e8527a" }}>
              Industry Fit
            </p>
          </div>

          {/* Arrow + filter 2: addressable categories */}
          <div className="flex flex-col items-center flex-1 pt-[42px]">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
              60% addressable
            </div>
            <div className="w-full h-0.5 bg-gray-300 relative">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-gray-300" />
            </div>
            <div className="mt-2 text-xs text-gray-500 leading-tight text-center">
              <span className="text-green-600 font-semibold">Yes:</span> CRM, PM, messaging, HR<br />
              <span className="text-red-400 font-semibold">No:</span> Payments, storage, security
            </div>
          </div>

          {/* $20B final block */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg"
              style={{ width: 130, height: 130, background: "linear-gradient(135deg, #f97316, #ec4899, #9333ea)" }}
            >
              $20B
            </div>
            <p className="text-sm font-bold mt-2 gradient-brand-text">
              GO4IT SAM
            </p>
          </div>
        </div>

        <p className="text-2xl font-semibold text-gray-700 mt-10 text-center">
          GO4IT is positioned to disrupt a{" "}
          <span className="font-bold gradient-brand-text">$20 Billion ARR</span> market.
        </p>
        <p className="text-lg text-gray-400 mt-2 text-center">
          Across 1,270,000 SaaS-using small businesses in the US.
        </p>
      </div>
    ),
  },
  {
    id: "revenue",
    content: (
      <div className="flex flex-col justify-center h-full max-w-[57.6rem] mx-auto">
        <h2 className="text-5xl font-bold text-gray-900 mb-10">
          Revenue Model
        </h2>
        <div className="space-y-6">
          <p className="text-2xl text-gray-700">
            Apps are{" "}
            <span className="font-bold gradient-brand-text">free to create</span>
            .
          </p>
          <p className="text-2xl text-gray-700">
            For hosting, GO4IT deploys apps on edge data center VMs,
            charging a fixed <span className="font-bold text-theme-primary">~20% premium</span> on infrastructure costs.
          </p>
          <p className="text-2xl text-gray-700">
            Our signature pricing:{" "}
            <span className="font-bold text-theme-secondary">$1/user/app/month</span>{" "}
            (minimum $5/user).
          </p>
          <p className="text-2xl text-gray-700">
            This represents a{" "}
            <span className="font-bold text-theme-accent">5–10x savings</span>{" "}
            vs. current SaaS spend.
          </p>
        </div>
      </div>
    ),
  },
  { id: "financial", content: null },
  {
    id: "ask",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-5xl font-bold gradient-brand-text mb-10">
          Let&apos;s GO4IT
        </h2>
        <a
          href="https://go4it.live"
          target="_blank"
          rel="noopener noreferrer"
          className="gradient-brand text-white text-xl font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition"
        >
          Visit go4it.live
        </a>
      </div>
    ),
  },
];

export default function DeckPage() {
  const [current, setCurrent] = useState(0);

  const goNext = useCallback(() => {
    setCurrent((c) => Math.min(c + 1, slides.length - 1));
  }, []);

  const goPrev = useCallback(() => {
    setCurrent((c) => Math.max(c - 1, 0));
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-white select-none"
      style={{
        // Force GO4IT brand colors (remove to inherit org theme)
        "--theme-primary": "#9333ea",
        "--theme-secondary": "#ec4899",
        "--theme-accent": "#f97316",
        "--theme-gradient": "linear-gradient(to right, #f97316, #ec4899, #9333ea)",
      } as React.CSSProperties}
    >
      {/* Slide */}
      <div className="h-full px-16 py-12">
        {slides[current].id === "market"
          ? <MarketSlide active={slides[current].id === "market"} />
          : slides[current].id === "financial"
            ? <FinancialModelSlide />
            : slides[current].content}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-30 flex items-center justify-center transition"
        >
          &larr;
        </button>

        {/* Slide dots */}
        <div className="flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition ${
                i === current ? "gradient-brand scale-125" : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          disabled={current === slides.length - 1}
          className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-30 flex items-center justify-center transition"
        >
          &rarr;
        </button>
      </div>

      {/* Slide counter */}
      <div className="fixed bottom-6 right-8 text-sm text-gray-400">
        {current + 1} / {slides.length}
      </div>
    </div>
  );
}
