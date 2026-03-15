"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/* Hide native number input spinners */
const hideSpinners = `
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
`;

function StepInput({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex items-center gap-1 justify-end">
      <div className="flex flex-col -my-1">
        <button
          onClick={() => onChange(clamp(value + step))}
          className="text-gray-400 hover:text-purple-500 leading-none text-xs px-1"
        >
          &#9650;
        </button>
        <button
          onClick={() => onChange(clamp(value - step))}
          className="text-gray-400 hover:text-purple-500 leading-none text-xs px-1"
        >
          &#9660;
        </button>
      </div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(clamp(parseFloat(e.target.value) || min))}
        className="w-16 md:w-20 text-right font-bold text-sm md:text-base rounded-lg border border-gray-300 px-2 md:px-3 py-1 focus:outline-none focus:border-purple-400"
        style={{ color: "var(--theme-primary)" }}
      />
    </div>
  );
}

/* ─── Slide 4: Business Model ─── */
function BusinessModelSlide() {
  const [teamSize, setTeamSize] = useState(10);
  const [appCount, setAppCount] = useState(5);

  // Hosting revenue
  const hostingMonthly = appCount * 5 + teamSize * appCount * 1;

  const go4itMonthly = hostingMonthly;
  const go4itAnnual = go4itMonthly * 12;
  const traditionalAnnual = teamSize * 1400;
  const savings = traditionalAnnual - go4itAnnual;
  const multiple =
    go4itAnnual > 0 ? Math.round(traditionalAnnual / go4itAnnual) : 0;
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <div className="flex flex-col md:justify-center md:h-full max-w-5xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: hideSpinners }} />
      <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-3 md:mb-6">
        Business Model
      </h2>

      <p className="text-base md:text-xl text-gray-700 mb-4 md:mb-6">
        Apps are{" "}
        <span className="font-bold gradient-brand-text">free to create</span>.
        Three revenue streams:
      </p>

      {/* Three revenue streams */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="rounded-xl border border-gray-200 p-3 md:p-4 text-center">
          <p
            className="text-xl md:text-3xl font-bold"
            style={{ color: "var(--theme-primary)" }}
          >
            $5
          </p>
          <p className="text-sm text-gray-500 mt-1">per app / month</p>
          <p className="text-xs text-gray-400 mt-1">~50% margin on hosting</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3 md:p-4 text-center">
          <p
            className="text-xl md:text-3xl font-bold"
            style={{ color: "var(--theme-secondary)" }}
          >
            $1
          </p>
          <p className="text-sm text-gray-500 mt-1">per person / app / month</p>
          <p className="text-xs text-gray-400 mt-1">100% margin</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3 md:p-4 text-center">
          <p
            className="text-xl md:text-3xl font-bold"
            style={{ color: "var(--theme-accent)" }}
          >
            $25–95
          </p>
          <p className="text-sm text-gray-500 mt-1">per org / month</p>
          <p className="text-xs text-gray-400 mt-1">GoPilot AI intelligence tiers</p>
          <p className="text-xs text-gray-400">&lt;41% margin (growing)</p>
        </div>
      </div>

      {/* GoPilot tiers */}
      <div className="rounded-xl border border-gray-200 p-3 md:p-4 mb-4 md:mb-6">
        <p className="text-xs md:text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
          GoPilot Pro — Cross-App AI Intelligence
        </p>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          {[
            { tier: "Free", price: "$0", queries: "10/day", cost: "~$4/mo" },
            { tier: "Starter", price: "$25", queries: "50/day", cost: "~$19/mo" },
            { tier: "Pro", price: "$45", queries: "100/day", cost: "~$38/mo" },
            { tier: "Unlimited", price: "$95", queries: "Unlimited", cost: "~$56/mo" },
          ].map((t) => (
            <div key={t.tier} className="py-1">
              <p className="font-bold text-gray-800 text-xs md:text-sm">{t.tier}</p>
              <p className="font-semibold text-base md:text-lg" style={{ color: "var(--theme-accent)" }}>{t.price}</p>
              <p className="text-[10px] md:text-xs text-gray-500">{t.queries}</p>
              <p className="text-[10px] text-gray-400">{t.cost} cost @ 50% util</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 italic">
          Low-margin today — this is where we grow as we bring higher-power AI intelligence and optimize inference costs.
        </p>
      </div>

      {/* Interactive calculator */}
      <div className="rounded-xl border-2 p-3 md:p-5" style={{ borderColor: "var(--theme-accent)" }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-8 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Team size:</span>
            <StepInput value={teamSize} onChange={setTeamSize} min={1} max={100} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Apps:</span>
            <StepInput value={appCount} onChange={setAppCount} min={1} max={20} />
          </div>
          <p className="text-xs text-gray-400 italic">Hosting only (excl. GoPilot)</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs md:text-sm text-gray-500 mb-1">Traditional SaaS</p>
            <p className="text-lg md:text-2xl font-bold" style={{ color: "#ef4444" }}>
              {fmt(traditionalAnnual)}
            </p>
            <p className="text-xs text-gray-400">/year</p>
          </div>
          <div>
            <p className="text-xs md:text-sm text-gray-500 mb-1">GO4IT</p>
            <p className="text-lg md:text-2xl font-bold gradient-brand-text">
              {fmt(go4itAnnual)}
            </p>
            <p className="text-xs text-gray-400">/year</p>
          </div>
          <div>
            <p className="text-xs md:text-sm text-gray-500 mb-1">Savings</p>
            <p className="text-lg md:text-2xl font-bold" style={{ color: "var(--theme-accent)" }}>
              {fmt(savings)}
            </p>
            <p className="text-xs text-gray-400">/year</p>
          </div>
        </div>

        <p className="text-center mt-2">
          <span className="text-2xl md:text-3xl font-extrabold gradient-brand-text">
            {multiple}x
          </span>{" "}
          <span className="text-sm md:text-base text-gray-600">
            reduction in cost
          </span>
        </p>
      </div>
    </div>
  );
}

/* ─── Slide 5: Dev Status ─── */
function DevStatusSlide() {
  const sections = [
    {
      title: "Live & Working",
      color: "#22c55e",
      items: [
        "Platform live at go4it.live",
        "12 Go Suite apps built, published, and deployed",
        "AI assistant with cross-app intelligence",
        "Org portals with SSO and team management",
        "Stripe Checkout integration (test mode)",
        "GoPilot Pro tiered subscriptions",
      ],
    },
    {
      title: "In Progress",
      color: "#f59e0b",
      items: [
        "App creation preview flow (blank page issue)",
        "Stripe billing enforcement & payment failure handling",
        "Trial period logic",
        "Builder hardening (rate limits, cleanup)",
      ],
    },
    {
      title: "Not Yet Started",
      color: "#94a3b8",
      items: [
        "Custom subdomain DNS",
        "Live Stripe keys (still in test mode)",
        "POS integrations",
      ],
    },
  ];

  return (
    <div className="flex flex-col md:justify-center md:h-full max-w-5xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 md:mb-8">
        Where We Are
      </h2>
      <p className="text-base md:text-xl text-gray-500 mb-6 md:mb-8">
        Honest status — what works, what doesn&apos;t, what&apos;s next.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {sections.map((s) => (
          <div key={s.title} className="rounded-xl border border-gray-200 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <h3 className="font-bold text-gray-900 text-base md:text-lg">
                {s.title}
              </h3>
            </div>
            <ul className="space-y-2">
              {s.items.map((item) => (
                <li
                  key={item}
                  className="text-sm md:text-base text-gray-600 flex items-start gap-2"
                >
                  <span
                    className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-sm md:text-base text-gray-400 mt-4 md:mt-6 text-center italic">
        Demo org &ldquo;Space Gods Inc.&rdquo; has 6 live apps with seeded data
        — available to walk through.
      </p>
    </div>
  );
}

/* ─── Slide 6: Roadmap ─── */
function RoadmapSlide() {
  const tiers = [
    {
      label: "Now",
      color: "#f97316",
      items: [
        "Fix app creation preview flow",
        "Stripe billing: enforcement, failure handling, go-live",
        "Builder hardening & monitoring",
      ],
    },
    {
      label: "Next",
      color: "#ec4899",
      items: [
        "AI coworker: cross-app data queries",
        "Model selection (Sonnet vs. Opus)",
        "Go Suite polish pass",
      ],
    },
    {
      label: "Later",
      color: "#9333ea",
      items: [
        "Custom domains",
        "POS integrations (Square, Shopify)",
        "GoChat iOS app",
        "Proactive AI insights",
      ],
    },
  ];

  return (
    <div className="flex flex-col md:justify-center md:h-full max-w-5xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 md:mb-8">
        Development Roadmap
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {tiers.map((tier, ti) => (
          <div key={tier.label} className="relative">
            {/* Connector line (desktop) */}
            {ti < tiers.length - 1 && (
              <div className="hidden md:block absolute top-8 -right-3 w-6 h-0.5 bg-gray-300" />
            )}
            <div
              className="rounded-xl border-2 p-4 md:p-6"
              style={{ borderColor: tier.color }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: tier.color }}
                >
                  {tier.label}
                </div>
                <div className="flex-1 h-0.5 bg-gray-200" />
              </div>
              <ul className="space-y-3">
                {tier.items.map((item) => (
                  <li
                    key={item}
                    className="text-sm md:text-base text-gray-700 flex items-start gap-2"
                  >
                    <span
                      className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: tier.color }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm md:text-base text-gray-400 mt-6 text-center italic">
        Priority is shipping what makes the product usable before scaling.
      </p>
    </div>
  );
}

/* ─── Slide 7: GTM Options ─── */
function GTMSlide() {
  const strategies = [
    {
      rank: 1,
      title: "Local Small Business Outreach",
      desc: "Find and onboard local businesses directly. High-touch, real feedback fast.",
      tag: "PMF validation",
      active: true,
    },
    {
      rank: 2,
      title: "Small Business Associations",
      desc: "Partner with chambers of commerce, NSBA. Credibility + distribution.",
      tag: "Credibility",
      active: true,
    },
    {
      rank: 3,
      title: "Paid Social Media",
      desc: "Targeted ads once PMF is established and there's something worth amplifying.",
      tag: "Post-PMF",
      active: false,
    },
    {
      rank: 4,
      title: "Early-Stage Startup Program",
      desc: "Free access for early startups. Bet on a subset succeeding and growing with us.",
      tag: "Long-term bet",
      active: false,
    },
  ];

  return (
    <div className="flex flex-col md:justify-center md:h-full max-w-4xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2 md:mb-4">
        Go-To-Market
      </h2>
      <p className="text-base md:text-xl text-gray-500 mb-6 md:mb-8">
        PMF first — prove the product works before spending on acquisition.
      </p>

      <div className="space-y-3 md:space-y-4">
        {strategies.map((s) => (
          <div
            key={s.rank}
            className={`rounded-xl border-2 p-4 md:p-5 flex items-start gap-4 transition ${
              s.active ? "" : "opacity-50"
            }`}
            style={{
              borderColor: s.active ? "var(--theme-primary)" : "#e5e7eb",
            }}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                s.active ? "gradient-brand" : "bg-gray-200 text-gray-500"
              }`}
            >
              {s.rank}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 text-base md:text-lg">
                  {s.title}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.active
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {s.tag}
                </span>
              </div>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                {s.desc}
              </p>
            </div>
            {s.active && (
              <span
                className="text-xs font-bold uppercase tracking-wide mt-1"
                style={{ color: "var(--theme-accent)" }}
              >
                Active
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Slides Array ─── */

const goSuiteApps = [
  { name: "GoCRM", icon: "🤝", category: "CRM / Sales" },
  { name: "GoProject", icon: "📋", category: "Project Management" },
  { name: "GoSchedule", icon: "📅", category: "Scheduling" },
  { name: "GoInventory", icon: "📦", category: "Inventory" },
  { name: "GoInvoice", icon: "💰", category: "Finance" },
  { name: "GoSupport", icon: "🎧", category: "Helpdesk" },
  { name: "GoHR", icon: "👥", category: "People / HR" },
  { name: "GoChat", icon: "💬", category: "Chat" },
  { name: "GoMailer", icon: "📧", category: "Marketing" },
  { name: "GoDocs", icon: "📄", category: "Documents" },
  { name: "GoForms", icon: "📝", category: "Forms" },
  { name: "GoWiki", icon: "📚", category: "Knowledge Base" },
];

const slides = [
  {
    id: "problem",
    content: (
      <div className="flex flex-col md:justify-center md:h-full max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 md:mb-10">
          The Problem
        </h2>
        <p className="text-lg md:text-2xl text-gray-700">
          US small businesses spend{" "}
          <span className="font-bold text-theme-accent">
            ~$1,400/employee/year
          </span>{" "}
          on SaaS — mostly on features they don&apos;t use, from vendors with
          inflexible tools.
        </p>
        <p className="text-lg md:text-2xl text-gray-700 mt-4 md:mt-6">
          For a 20-person company, that&apos;s{" "}
          <span className="font-bold text-theme-secondary">$28,000/year</span>{" "}
          just to operate.
        </p>
      </div>
    ),
  },
  {
    id: "solution",
    content: (
      <div className="flex flex-col md:justify-center md:h-full max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 md:mb-8">
          What We Built
        </h2>
        <div className="space-y-3 md:space-y-5 mb-6 md:mb-8">
          <p className="text-lg md:text-2xl text-gray-700">
            <span className="font-bold gradient-brand-text">GO4IT</span> — a
            free marketplace for AI-generated SaaS apps. Browse ready-made tools
            or describe what you need in plain English.
          </p>
          <p className="text-base md:text-xl text-gray-500">
            Marketplace + AI builder + managed hosting. Everything you need,
            nothing you don&apos;t.
          </p>
        </div>

        {/* Go Suite grid */}
        <div>
          <p className="text-sm md:text-base font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Go Suite — 12 apps, live today
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
            {goSuiteApps.map((app) => (
              <div
                key={app.name}
                className="rounded-lg border border-gray-200 p-2 md:p-3 text-center hover:border-purple-300 transition"
              >
                <div className="text-xl md:text-2xl mb-1">{app.icon}</div>
                <p className="text-xs md:text-sm font-semibold text-gray-800">
                  {app.name}
                </p>
                <p className="text-[10px] md:text-xs text-gray-400 leading-tight">
                  {app.category}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "how",
    content: (
      <div className="flex flex-col md:justify-center md:h-full max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 md:mb-10">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          {[
            {
              step: "1",
              title: "Browse or Build",
              desc: "Pick apps from the marketplace, or describe one in plain English and our AI builds it.",
            },
            {
              step: "2",
              title: "Add & Assign",
              desc: "Select and customize applications, import your data, and invite your team.",
            },
            {
              step: "3",
              title: "Deploy",
              desc: "Access your apps and cross-app AI intelligence — all from your org home page.",
            },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full gradient-brand text-xl md:text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                {s.step}
              </div>
              <div className="w-full aspect-video flex items-end justify-center mb-4">
                <img
                  src={`/deck/step-${s.step}.png`}
                  alt={s.title}
                  className="max-w-full max-h-full rounded-lg shadow-md"
                />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                {s.title}
              </h3>
              <p className="text-sm md:text-lg text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  { id: "business-model", content: null },
  { id: "dev-status", content: null },
  { id: "roadmap", content: null },
  { id: "gtm", content: null },
  {
    id: "ask",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <h2 className="text-3xl md:text-5xl font-bold gradient-brand-text mb-8 md:mb-12">
          Questions for You
        </h2>
        <div className="space-y-6 md:space-y-8 max-w-2xl">
          {[
            "Does this product resonate? What's missing?",
            "Are we building the right things next?",
            "Which GTM path would you pursue first, and why?",
          ].map((q, i) => (
            <div key={i} className="flex items-start gap-3 md:gap-4 text-left">
              <span
                className="w-8 h-8 md:w-10 md:h-10 rounded-full gradient-brand flex items-center justify-center text-sm md:text-base font-bold shrink-0"
              >
                {i + 1}
              </span>
              <p className="text-lg md:text-2xl text-gray-700 pt-1">{q}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function StrategyDeckPage() {
  const [current, setCurrent] = useState(0);

  const goNext = useCallback(() => {
    setCurrent((c) => Math.min(c + 1, slides.length - 1));
  }, []);

  const goPrev = useCallback(() => {
    setCurrent((c) => Math.max(c - 1, 0));
  }, []);

  // Keyboard navigation
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

  // Touch swipe navigation
  const touchStart = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStart.current === null) return;
      const diff = touchStart.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? goNext() : goPrev();
      }
      touchStart.current = null;
    },
    [goNext, goPrev]
  );

  const slideContent =
    slides[current].id === "business-model" ? (
      <BusinessModelSlide />
    ) : slides[current].id === "dev-status" ? (
      <DevStatusSlide />
    ) : slides[current].id === "roadmap" ? (
      <RoadmapSlide />
    ) : slides[current].id === "gtm" ? (
      <GTMSlide />
    ) : (
      slides[current].content
    );

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-white select-none"
      style={
        {
          "--theme-primary": "#9333ea",
          "--theme-secondary": "#ec4899",
          "--theme-accent": "#f97316",
          "--theme-gradient":
            "linear-gradient(to right, #f97316, #ec4899, #9333ea)",
          "--theme-primary-grad": "#9333ea",
          "--theme-secondary-grad": "#ec4899",
          "--theme-accent-grad": "#f97316",
          "--theme-primary-contrast": "#ffffff",
          "--theme-secondary-contrast": "#ffffff",
          "--theme-accent-contrast": "#111827",
          "--theme-gradient-contrast": "#ffffff",
          "--theme-darkest": "#9333ea",
          "--theme-second-darkest": "#ec4899",
          "--theme-lightest": "#f97316",
          "--theme-darkest-contrast": "#ffffff",
          "--theme-second-darkest-contrast": "#ffffff",
        } as React.CSSProperties
      }
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide */}
      <div className="h-full px-4 pt-6 pb-24 md:px-16 md:pt-12 md:pb-16 overflow-y-auto">
        {slideContent}
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
      <div className="fixed bottom-1 md:bottom-6 right-8 text-sm text-gray-400">
        {current + 1} / {slides.length}
      </div>
    </div>
  );
}
