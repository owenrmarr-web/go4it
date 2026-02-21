"use client";
import { useState } from "react";
import Header from "@/components/Header";

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
  const decimals = step < 1 ? Math.ceil(-Math.log10(step)) : 0;
  const clamp = (v: number) =>
    parseFloat(Math.min(max, Math.max(min, v)).toFixed(decimals));
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
        className="w-20 text-right font-bold text-sm md:text-base rounded-lg border border-gray-300 px-2 py-1 focus:outline-none focus:border-purple-400"
        style={{ color: "var(--theme-second-darkest)" }}
      />
    </div>
  );
}

const competitors = [
  { category: "CRM", name: "HubSpot", perUser: 20, base: 0 },
  { category: "Project Mgmt", name: "Monday.com", perUser: 12, base: 0 },
  { category: "Messaging", name: "Slack", perUser: 7.25, base: 0 },
  { category: "Invoicing", name: "FreshBooks", perUser: 11, base: 30 },
  { category: "Payroll", name: "Gusto", perUser: 6, base: 49 },
];

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function PricingPage() {
  const [employees, setEmployees] = useState(10);
  const [numApps, setNumApps] = useState(5);
  // Indices: 0=CRM, 1=PM, 2=Messaging, 3=Invoicing, 4=Payroll
  const [seats, setSeats] = useState([10, 10, 10, 5, 10]);

  const handleEmployeesChange = (v: number) => {
    setEmployees(v);
    // Reset CRM, PM, Messaging, Payroll to match; Invoicing follows if below 5
    setSeats((prev) =>
      prev.map((s, i) => (i === 3 ? (v < 5 ? v : s) : v))
    );
  };

  const updateSeat = (i: number, v: number) =>
    setSeats((prev) => prev.map((s, j) => (j === i ? v : s)));

  const extraApps = Math.max(0, numApps - 5);
  const avgPerUser = competitors.reduce((sum, c) => sum + c.perUser, 0) / competitors.length;
  const avgBase = competitors.reduce((sum, c) => sum + c.base, 0) / competitors.length;
  const extraTraditionalCost = extraApps * (avgBase + avgPerUser * employees);
  const extraGo4itCost = extraApps * (5 + employees * 1);

  const baseTraditionalTotal = competitors.reduce(
    (sum, c, i) => sum + c.base + c.perUser * seats[i],
    0
  );
  const baseGo4itTotal = competitors.reduce(
    (sum, _, i) => sum + 5 + seats[i] * 1,
    0
  );
  const traditionalTotal = baseTraditionalTotal + extraTraditionalCost;
  const go4itTotal = baseGo4itTotal + extraGo4itCost;
  const monthlySavings = traditionalTotal - go4itTotal;
  const annualSavings = monthlySavings * 12;
  const multiple =
    traditionalTotal > 0 && go4itTotal > 0
      ? Math.round(traditionalTotal / go4itTotal)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <style dangerouslySetInnerHTML={{ __html: hideSpinners }} />

      {/* Hero */}
      <section className="gradient-brand pt-24 sm:pt-32 pb-10 sm:pb-14 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold drop-shadow-lg">
          Pricing
        </h1>
        <p className="mt-3 text-lg sm:text-xl opacity-80 max-w-2xl mx-auto">
          Enterprise-grade apps at a fraction of the cost
        </p>
      </section>

      {/* How It Works + Pricing — two columns */}
      <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          {/* Left — How It Works */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
              How It Works
            </h2>
            <div className="flex flex-col gap-0">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center font-bold text-sm shrink-0">
                    1
                  </div>
                  <div className="w-0.5 flex-1 bg-gradient-to-b from-orange-300 to-pink-300 my-1" />
                </div>
                <div className="pb-8">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Browse or Build
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Find apps in the App Store or create your own with AI — no
                    coding required.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center font-bold text-sm shrink-0">
                    2
                  </div>
                  <div className="w-0.5 flex-1 bg-gradient-to-b from-pink-300 to-purple-300 my-1" />
                </div>
                <div className="pb-8">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Add &amp; Assign
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Add apps to your organization and assign teammates
                    access to the tools they need.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center font-bold text-sm shrink-0">
                    3
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Deploy &amp; Use
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Apps deploy instantly and run through GO4IT in the browser —
                    nothing to install or maintain.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Pricing */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
              Simple Pricing
            </h2>
            <div className="space-y-6">
              {/* $5/app card */}
              <div className="rounded-xl border-2 border-theme-accent bg-orange-50/50 p-6">
                <div className="text-3xl md:text-4xl font-extrabold text-theme-accent">
                  $5<span className="text-lg md:text-xl font-bold text-gray-500">/app/month</span>
                </div>
                <p className="text-gray-600 mt-2">
                  Each app you add to your organization costs a flat $5/month.
                  Covers hosting &amp; infrastructure.
                </p>
              </div>

              {/* $1/seat card */}
              <div className="rounded-xl border-2 border-theme-primary bg-purple-50/50 p-6">
                <div className="text-3xl md:text-4xl font-extrabold text-theme-primary">
                  $1<span className="text-lg md:text-xl font-bold text-gray-500">/seat/app/month</span>
                </div>
                <p className="text-gray-600 mt-2">
                  For each team member using an app. Only pay for the people who
                  actually need access — scale up or down anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      </div>

      {/* Cost Savings Calculator */}
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-4xl font-bold text-gray-900">
            Cost Savings Calculator
          </h2>
          <p className="text-gray-500 mt-2 text-sm md:text-lg">
            See how much your business could save with GO4IT
          </p>
        </div>

        {/* Inputs + savings + reduction — single row */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-48 text-gray-700 font-medium whitespace-nowrap">Number of Employees:</span>
              <StepInput
                value={employees}
                onChange={handleEmployeesChange}
                min={1}
                max={500}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-48 text-gray-700 font-medium whitespace-nowrap">Number of Apps:</span>
              <StepInput
                value={numApps}
                onChange={setNumApps}
                min={5}
                max={50}
              />
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="rounded-xl bg-green-50 border border-green-200 px-6 py-3 text-center">
              <p className="text-xs text-gray-500">Monthly savings</p>
              <p className="text-2xl md:text-3xl font-extrabold text-green-600">{fmt(monthlySavings)}</p>
            </div>
            <div className="rounded-xl bg-green-50 border border-green-200 px-6 py-3 text-center">
              <p className="text-xs text-gray-500">Annual savings</p>
              <p className="text-2xl md:text-3xl font-extrabold text-green-600">{fmt(annualSavings)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl md:text-5xl font-extrabold gradient-brand-text">{multiple}x</span>
              <span className="text-base md:text-lg text-gray-600">cost reduction</span>
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <table className="hidden md:table w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="py-2 px-3 text-sm font-semibold text-gray-500">
                Category
              </th>
              <th className="py-2 px-3 text-sm font-semibold text-gray-500">
                Incumbent
              </th>
              <th className="py-2 px-3 text-sm font-semibold text-gray-500 text-right">
                Seats
              </th>
              <th className="py-2 px-3 text-sm font-semibold text-gray-500 text-right">
                Per-User Price
              </th>
              <th className="py-2 px-3 text-sm font-semibold text-gray-500 text-right">
                Monthly Cost
              </th>
              <th className="py-2 px-3 text-sm font-semibold text-right gradient-brand-text">
                GO4IT Cost
              </th>
            </tr>
          </thead>
          <tbody className="text-base text-gray-700">
            {competitors.map((c, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-3 px-3 font-medium">{c.category}</td>
                <td className="py-3 px-3 text-gray-500">{c.name}</td>
                <td className="py-3 px-3 text-right">
                  <StepInput value={seats[i]} onChange={(v) => updateSeat(i, v)} min={1} max={500} />
                </td>
                <td className="py-3 px-3 text-right text-sm">
                  {`$${c.perUser}/user/mo`}
                  {c.base > 0 && (
                    <span className="text-gray-400">{` + $${c.base} base`}</span>
                  )}
                </td>
                <td
                  className="py-3 px-3 text-right font-semibold"
                  style={{ color: "#ef4444" }}
                >
                  {fmt(c.base + c.perUser * seats[i])}
                </td>
                <td
                  className="py-3 px-3 text-right font-semibold"
                  style={{ color: "var(--theme-darkest)" }}
                >
                  {fmt(5 + seats[i] * 1)}
                </td>
              </tr>
            ))}
            {extraApps > 0 && (
              <tr className="border-b border-gray-100">
                <td className="py-3 px-3 font-medium">Additional Apps <span className="text-gray-400 font-normal">(x{extraApps})</span></td>
                <td className="py-3 px-3 text-gray-500">Various</td>
                <td className="py-3 px-3 text-right font-semibold" style={{ color: "var(--theme-second-darkest)" }}>{employees}</td>
                <td className="py-3 px-3 text-right text-sm">avg. of above</td>
                <td className="py-3 px-3 text-right font-semibold" style={{ color: "#ef4444" }}>{fmt(extraTraditionalCost)}</td>
                <td className="py-3 px-3 text-right font-semibold" style={{ color: "var(--theme-darkest)" }}>{fmt(extraGo4itCost)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr
              className="border-t-2"
              style={{ borderColor: "var(--theme-second-darkest)" }}
            >
              <td
                colSpan={4}
                className="py-3 px-3 font-bold text-lg text-gray-800"
              >
                Total Monthly
              </td>
              <td
                className="py-3 px-3 text-right font-bold text-xl"
                style={{ color: "#ef4444" }}
              >
                {fmt(traditionalTotal)}
              </td>
              <td className="py-3 px-3 text-right font-bold text-xl gradient-brand-text">
                {fmt(go4itTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Mobile table */}
        <div className="md:hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-1.5 text-left text-xs font-semibold text-gray-500">
                  Tool
                </th>
                <th className="py-1.5 text-right text-xs font-semibold text-gray-500">
                  Seats
                </th>
                <th className="py-1.5 text-right text-xs font-semibold text-gray-500">
                  Traditional
                </th>
                <th className="py-1.5 text-right text-xs font-semibold gradient-brand-text">
                  GO4IT
                </th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((c, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2">
                    <div className="font-medium text-gray-700">
                      {c.category}
                    </div>
                    <div className="text-xs text-gray-400">{c.name}</div>
                  </td>
                  <td className="py-2 text-right">
                    <StepInput value={seats[i]} onChange={(v) => updateSeat(i, v)} min={1} max={500} />
                  </td>
                  <td
                    className="py-2 text-right font-semibold"
                    style={{ color: "#ef4444" }}
                  >
                    {fmt(c.base + c.perUser * seats[i])}
                  </td>
                  <td
                    className="py-2 text-right font-semibold"
                    style={{ color: "var(--theme-darkest)" }}
                  >
                    {fmt(5 + seats[i] * 1)}
                  </td>
                </tr>
              ))}
              {extraApps > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-2">
                    <div className="font-medium text-gray-700">Additional Apps</div>
                    <div className="text-xs text-gray-400">x{extraApps} @ avg. of above</div>
                  </td>
                  <td className="py-2 text-right font-semibold" style={{ color: "var(--theme-second-darkest)" }}>{employees}</td>
                  <td className="py-2 text-right font-semibold" style={{ color: "#ef4444" }}>{fmt(extraTraditionalCost)}</td>
                  <td className="py-2 text-right font-semibold" style={{ color: "var(--theme-darkest)" }}>{fmt(extraGo4itCost)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr
                className="border-t-2"
                style={{ borderColor: "var(--theme-second-darkest)" }}
              >
                <td colSpan={2} className="py-2 font-bold text-gray-800">Total</td>
                <td
                  className="py-2 text-right font-bold"
                  style={{ color: "#ef4444" }}
                >
                  {fmt(traditionalTotal)}
                </td>
                <td className="py-2 text-right font-bold gradient-brand-text">
                  {fmt(go4itTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pricing footnote */}
        <p className="text-xs md:text-sm text-gray-400 mt-8 text-center">
          Incumbent pricing based on annual billing. GO4IT: $5/app/mo +
          $1/person/app/mo.
        </p>
      </section>
    </div>
  );
}
