"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/* Hide native number input spinners */
const hideSpinners = `
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
`;

function StepInput({ value, onChange, min = 0, max = Infinity, step = 1 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  // Round to step precision to avoid floating point artifacts (0.7999999 → 0.8)
  const decimals = step < 1 ? Math.ceil(-Math.log10(step)) : 0;
  const clamp = (v: number) => parseFloat(Math.min(max, Math.max(min, v)).toFixed(decimals));
  return (
    <div className="flex items-center gap-1 justify-end">
      <div className="flex flex-col -my-1">
        <button
          onClick={() => onChange(clamp(value + step))}
          className="text-gray-400 hover:text-purple-500 leading-none text-xs px-1"
        >&#9650;</button>
        <button
          onClick={() => onChange(clamp(value - step))}
          className="text-gray-400 hover:text-purple-500 leading-none text-xs px-1"
        >&#9660;</button>
      </div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(clamp(parseFloat(e.target.value) || min))}
        className="w-28 md:w-36 text-right font-bold text-sm md:text-base rounded-lg border border-gray-300 px-2 md:px-3 py-1 focus:outline-none focus:border-purple-400"
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
      <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 md:mb-8">2025 SaaS Spend</h2>

      {/* Desktop table */}
      <table className="hidden md:table w-full text-left border-collapse">
        <thead>
          <tr>
            <th className="py-2 px-4 text-center align-bottom" style={{ height: 240 }}>
              <div className="flex justify-center items-end h-full">
                <div className="rounded-full flex items-center justify-center text-on-primary font-bold text-2xl" style={{ width: 220, height: 220, backgroundColor: "var(--theme-primary)" }}>$350B</div>
              </div>
            </th>
            <th className="py-2 px-4 text-center align-bottom" style={{ height: 240 }}>
              <div className="flex justify-center items-end h-full">
                <div className="rounded-full flex items-center justify-center text-on-secondary font-bold text-xl" style={{ width: 120, height: 120, backgroundColor: "var(--theme-secondary)" }}>$105B</div>
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
                <div className="rounded-full flex items-center justify-center text-on-accent font-bold" style={{ width: 78, height: 78, backgroundColor: "var(--theme-accent)" }}>$44B</div>
              </div>
            </th>
            <th className="py-2 pr-4 align-bottom">
              <p
                className="text-lg font-semibold text-right leading-snug transition-opacity duration-[2000ms]"
                style={{ color: "var(--theme-accent)", opacity: showTagline1 ? 1 : 0 }}
              >
                Big enough to need software.
              </p>
              <p
                className="text-lg font-semibold text-right leading-snug transition-opacity duration-[2000ms]"
                style={{ color: "var(--theme-accent)", opacity: showTagline2 ? 1 : 0 }}
              >
                Smart enough to not overpay for it.
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
            <td className="py-3 px-4 text-center">61.1M</td>
            <td className="py-3 px-4 text-center">31.8M</td>
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

      {/* Mobile: circles + focused data */}
      <div className="md:hidden">
        <div className="flex justify-center items-end gap-4 mb-2">
          <div className="flex flex-col items-center">
            <div className="rounded-full flex items-center justify-center text-on-primary font-bold text-sm" style={{ width: 110, height: 110, backgroundColor: "var(--theme-primary)" }}>$350B</div>
            <span className="text-xs font-semibold mt-1" style={{ color: "var(--theme-primary)" }}>Global</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="rounded-full flex items-center justify-center text-on-secondary font-bold text-sm" style={{ width: 60, height: 60, backgroundColor: "var(--theme-secondary)" }}>$105B</div>
            <span className="text-xs font-semibold mt-1" style={{ color: "var(--theme-secondary)" }}>US 5–500</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className="absolute border-2 rounded-lg transition-opacity duration-[2000ms]"
                style={{ borderColor: "var(--theme-accent)", opacity: showHighlight ? 1 : 0, top: -6, bottom: -6, left: -6, right: -6, pointerEvents: "none" }}
              />
              <div className="rounded-full flex items-center justify-center text-on-accent font-bold text-xs" style={{ width: 44, height: 44, backgroundColor: "var(--theme-accent)" }}>$44B</div>
            </div>
            <span className="text-xs font-semibold mt-1" style={{ color: "var(--theme-accent)" }}>US 5–50</span>
          </div>
        </div>
        <div className="mt-2 mb-4 text-center">
          <p className="text-sm font-semibold transition-opacity duration-[2000ms]" style={{ color: "var(--theme-accent)", opacity: showTagline1 ? 1 : 0 }}>
            Big enough to need software.
          </p>
          <p className="text-sm font-semibold transition-opacity duration-[2000ms]" style={{ color: "var(--theme-accent)", opacity: showTagline2 ? 1 : 0 }}>
            Smart enough to not overpay for it.
          </p>
        </div>
        <table className="w-full text-sm border-collapse">
          <tbody className="text-gray-700">
            {[
              { label: "Businesses", vals: ["—", "2.35M", "2.12M"] },
              { label: "Avg Employees", vals: ["—", "26", "15"] },
              { label: "Total Employees", vals: ["—", "61.1M", "31.8M"] },
              { label: "SaaS $/Employee", vals: ["—", "$1,700", "$1,400"] },
            ].map((r, i) => (
              <tr key={i} className={i < 3 ? "border-b border-gray-100" : ""}>
                <td className="py-2 text-gray-500 font-medium">{r.label}</td>
                <td className="py-2 text-center">{r.vals[0]}</td>
                <td className="py-2 text-center">{r.vals[1]}</td>
                <td className="py-2 text-center font-semibold">{r.vals[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DCFSlide() {
  const customers = 1270000;
  const [penetration, setPenetration] = useState(1);
  const [usersPerCustomer, setUsersPerCustomer] = useState(15);
  const [appsPerUser, setAppsPerUser] = useState(5);
  const [discountRate, setDiscountRate] = useState(30);
  const [growthRate, setGrowthRate] = useState(50);
  const [terminalGrowth, setTerminalGrowth] = useState(3);
  const years = 5;

  // Revenue model (mirrors FinancialModelSlide)
  const basePerApp = 5;
  const seatPricePerApp = 1;
  const hostingCostPerApp = 2.68;
  const costPerGeneration = 1.50;
  const gensPerWeek = 1;

  const penetratedCustomers = customers * (penetration / 100);
  const totalUsers = penetratedCustomers * usersPerCustomer;
  const year1AppBaseRevenue = penetratedCustomers * appsPerUser * basePerApp * 12;
  const year1SeatRevenue = totalUsers * appsPerUser * seatPricePerApp * 12;
  const year1Revenue = year1AppBaseRevenue + year1SeatRevenue;

  // Costs
  const year1HostingCost = penetratedCustomers * appsPerUser * hostingCostPerApp * 12;
  const year1InferenceCost = penetratedCustomers * gensPerWeek * costPerGeneration * 52;
  const year1FixedCosts = (20 + 6) * 12; // Vercel + Builder
  const year1TotalCost = year1HostingCost + year1InferenceCost + year1FixedCosts;
  const year1FCF = year1Revenue - year1TotalCost;

  // Project FCF over years with growth rate
  const projections = Array.from({ length: years }, (_, i) => {
    const g = growthRate / 100;
    const biz = penetratedCustomers * Math.pow(1 + g, i);
    const revenue = year1Revenue * Math.pow(1 + g, i);
    const cost = year1TotalCost * Math.pow(1 + g * 0.7, i); // costs grow slower (economies of scale)
    const fcf = revenue - cost;
    const discounted = fcf / Math.pow(1 + discountRate / 100, i + 1);
    return { year: i + 1, biz, revenue, cost, fcf, discounted };
  });

  // Terminal value (Gordon Growth Model on final year FCF)
  const finalFCF = projections[years - 1].fcf;
  const terminalValue = finalFCF * (1 + terminalGrowth / 100) / (discountRate / 100 - terminalGrowth / 100);
  const discountedTerminal = terminalValue / Math.pow(1 + discountRate / 100, years);

  const sumDiscountedFCF = projections.reduce((s, p) => s + p.discounted, 0);
  const enterpriseValue = sumDiscountedFCF + discountedTerminal;

  const fmt = (n: number) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  };

  return (
    <div className="flex flex-col justify-center h-full max-w-5xl mx-auto overflow-y-auto">
      <style dangerouslySetInnerHTML={{ __html: hideSpinners }} />
      <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 md:mb-6">DCF Valuation</h2>

      {/* Desktop */}
      <div className="hidden md:block">
        {/* Inputs row */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Market</h3>
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Addressable Businesses</td>
                  <td className="py-1.5 text-right font-bold" style={{ color: "var(--theme-primary)" }}>1,270,000</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Market Penetration</td>
                  <td className="py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <StepInput value={penetration} onChange={setPenetration} min={0} max={100} step={penetration < 1 ? 0.1 : 1} />
                      <span className="font-bold text-xs" style={{ color: "var(--theme-primary)" }}>%</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Seats / Business</td>
                  <td className="py-1.5 text-right"><StepInput value={usersPerCustomer} onChange={setUsersPerCustomer} min={1} /></td>
                </tr>
                <tr>
                  <td className="py-1.5 text-gray-600">Apps / Business</td>
                  <td className="py-1.5 text-right"><StepInput value={appsPerUser} onChange={setAppsPerUser} min={1} /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">DCF Assumptions</h3>
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Revenue Growth</td>
                  <td className="py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <StepInput value={growthRate} onChange={setGrowthRate} min={0} max={200} step={5} />
                      <span className="font-bold text-xs" style={{ color: "var(--theme-primary)" }}>%</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Discount Rate (WACC)</td>
                  <td className="py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <StepInput value={discountRate} onChange={setDiscountRate} min={5} max={50} step={1} />
                      <span className="font-bold text-xs" style={{ color: "var(--theme-primary)" }}>%</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 text-gray-600">Terminal Growth</td>
                  <td className="py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <StepInput value={terminalGrowth} onChange={setTerminalGrowth} min={0} max={10} step={0.5} />
                      <span className="font-bold text-xs" style={{ color: "var(--theme-primary)" }}>%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Year 1 Base</h3>
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Revenue</td>
                  <td className="py-1.5 text-right font-bold" style={{ color: "var(--theme-secondary)" }}>{fmt(year1Revenue)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 text-gray-600">Total Costs</td>
                  <td className="py-1.5 text-right font-bold text-gray-500">{fmt(year1TotalCost)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-gray-600">Free Cash Flow</td>
                  <td className="py-1.5 text-right font-bold" style={{ color: year1FCF >= 0 ? "var(--theme-accent)" : "#ef4444" }}>{fmt(year1FCF)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Projection table */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2" style={{ borderColor: "var(--theme-primary)" }}>
              <th className="py-2 text-left font-bold text-gray-800">Year</th>
              {projections.map(p => (
                <th key={p.year} className="py-2 text-right font-bold text-gray-800">{p.year}</th>
              ))}
              <th className="py-2 text-right font-bold text-gray-800">Terminal</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-gray-600">Businesses</td>
              {projections.map(p => (
                <td key={p.year} className="py-2 text-right font-semibold" style={{ color: "var(--theme-primary)" }}>{Math.round(p.biz).toLocaleString()}</td>
              ))}
              <td className="py-2 text-right text-gray-400">—</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-gray-600">Revenue</td>
              {projections.map(p => (
                <td key={p.year} className="py-2 text-right font-semibold" style={{ color: "var(--theme-secondary)" }}>{fmt(p.revenue)}</td>
              ))}
              <td className="py-2 text-right text-gray-400">—</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-gray-600">Costs</td>
              {projections.map(p => (
                <td key={p.year} className="py-2 text-right text-gray-500">{fmt(p.cost)}</td>
              ))}
              <td className="py-2 text-right text-gray-400">—</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-gray-600">Free Cash Flow</td>
              {projections.map(p => (
                <td key={p.year} className="py-2 text-right font-semibold" style={{ color: p.fcf >= 0 ? "var(--theme-accent)" : "#ef4444" }}>{fmt(p.fcf)}</td>
              ))}
              <td className="py-2 text-right font-semibold" style={{ color: "var(--theme-accent)" }}>{fmt(terminalValue)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 text-gray-600">Discounted FCF</td>
              {projections.map(p => (
                <td key={p.year} className="py-2 text-right text-gray-500">{fmt(p.discounted)}</td>
              ))}
              <td className="py-2 text-right text-gray-500">{fmt(discountedTerminal)}</td>
            </tr>
          </tbody>
        </table>

        {/* Enterprise Value */}
        <div className="mt-4 flex items-center justify-between border-t-2 pt-4" style={{ borderColor: "var(--theme-primary)" }}>
          <span className="text-lg font-bold text-gray-800">Enterprise Value</span>
          <span className="text-3xl font-extrabold gradient-brand-text">{fmt(enterpriseValue)}</span>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">Market</h3>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1 text-gray-600">Businesses</td>
                <td className="py-1 text-right font-bold" style={{ color: "var(--theme-primary)" }}>1,270,000</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 text-gray-600">Penetration</td>
                <td className="py-1 text-right"><div className="flex items-center justify-end gap-1"><StepInput value={penetration} onChange={setPenetration} min={0} max={100} step={penetration < 1 ? 0.1 : 1} /><span className="font-bold" style={{ color: "var(--theme-primary)" }}>%</span></div></td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 text-gray-600">Seats/Biz</td>
                <td className="py-1 text-right"><StepInput value={usersPerCustomer} onChange={setUsersPerCustomer} min={1} /></td>
              </tr>
              <tr>
                <td className="py-1 text-gray-600">Apps/Biz</td>
                <td className="py-1 text-right"><StepInput value={appsPerUser} onChange={setAppsPerUser} min={1} /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-1">DCF Assumptions</h3>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1 text-gray-600">Growth</td>
                <td className="py-1 text-right"><div className="flex items-center justify-end gap-1"><StepInput value={growthRate} onChange={setGrowthRate} min={0} max={200} step={5} /><span className="font-bold" style={{ color: "var(--theme-primary)" }}>%</span></div></td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 text-gray-600">WACC</td>
                <td className="py-1 text-right"><div className="flex items-center justify-end gap-1"><StepInput value={discountRate} onChange={setDiscountRate} min={5} max={50} step={1} /><span className="font-bold" style={{ color: "var(--theme-primary)" }}>%</span></div></td>
              </tr>
              <tr>
                <td className="py-1 text-gray-600">Terminal Growth</td>
                <td className="py-1 text-right"><div className="flex items-center justify-end gap-1"><StepInput value={terminalGrowth} onChange={setTerminalGrowth} min={0} max={10} step={0.5} /><span className="font-bold" style={{ color: "var(--theme-primary)" }}>%</span></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[400px]">
            <thead>
              <tr className="border-b-2" style={{ borderColor: "var(--theme-primary)" }}>
                <th className="py-1 text-left font-bold text-gray-800">Yr</th>
                {projections.map(p => <th key={p.year} className="py-1 text-right font-bold text-gray-800">{p.year}</th>)}
                <th className="py-1 text-right font-bold text-gray-800">TV</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1 text-gray-600">Biz</td>
                {projections.map(p => <td key={p.year} className="py-1 text-right" style={{ color: "var(--theme-primary)" }}>{Math.round(p.biz).toLocaleString()}</td>)}
                <td className="py-1 text-right text-gray-400">—</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 text-gray-600">Rev</td>
                {projections.map(p => <td key={p.year} className="py-1 text-right" style={{ color: "var(--theme-secondary)" }}>{fmt(p.revenue)}</td>)}
                <td className="py-1 text-right text-gray-400">—</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 text-gray-600">FCF</td>
                {projections.map(p => <td key={p.year} className="py-1 text-right" style={{ color: p.fcf >= 0 ? "var(--theme-accent)" : "#ef4444" }}>{fmt(p.fcf)}</td>)}
                <td className="py-1 text-right" style={{ color: "var(--theme-accent)" }}>{fmt(terminalValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t-2 pt-2" style={{ borderColor: "var(--theme-primary)" }}>
          <span className="text-base font-bold text-gray-800">Enterprise Value</span>
          <span className="text-2xl font-extrabold gradient-brand-text">{fmt(enterpriseValue)}</span>
        </div>
      </div>
    </div>
  );
}

function FinancialModelSlide() {
  const customers = 1270000;
  const [usersPerCustomer, setUsersPerCustomer] = useState(15);
  const [appsPerUser, setAppsPerUser] = useState(5);
  const [penetration, setPenetration] = useState(1);
  const basePerApp = 5;
  const seatPricePerApp = 1;
  const hostingCostPerApp = 2.68;
  const costPerGeneration = 1.50;
  const gensPerWeek = 1;

  const penetratedCustomers = customers * (penetration / 100);
  const totalUsers = penetratedCustomers * usersPerCustomer;
  const annualAppBaseRevenue = penetratedCustomers * appsPerUser * basePerApp * 12;
  const annualSeatRevenue = totalUsers * appsPerUser * seatPricePerApp * 12;
  const monthlyHostingCost = penetratedCustomers * appsPerUser * hostingCostPerApp;
  const annualInfraCost = monthlyHostingCost * 12;
  const annualInferenceCost = penetratedCustomers * gensPerWeek * costPerGeneration * 52;
  const totalAnnualRevenue = annualAppBaseRevenue + annualSeatRevenue;
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
    <div className="flex flex-col justify-center h-full max-w-5xl mx-auto overflow-y-auto">
      <style dangerouslySetInnerHTML={{ __html: hideSpinners }} />
      <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 md:mb-8">Financial Model</h2>

      {/* Desktop: side-by-side table */}
      <table className="hidden md:table w-full text-left border-collapse text-lg" style={{ tableLayout: "fixed" }}>
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
            <td className="py-3 text-right font-bold" style={{ color: "var(--theme-primary)" }}>
              1,270,000
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
              $5/app + $1/seat/app
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
              {fmt(appsPerUser * basePerApp + usersPerCustomer * appsPerUser * seatPricePerApp)}
            </td>
            <td></td>
            <td className="py-3 text-gray-600 font-semibold">Annual Gross Profit</td>
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

      {/* Mobile: stacked sections */}
      <div className="md:hidden space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-800 mb-2">Assumptions</h3>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-600">Businesses</td>
                <td className="py-2 text-right font-bold" style={{ color: "var(--theme-primary)" }}>1,270,000</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-600">Penetration</td>
                <td className="py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <StepInput value={penetration} onChange={setPenetration} min={0} max={100} step={penetration < 1 ? 0.1 : 1} />
                    <span className="font-bold text-sm" style={{ color: "var(--theme-primary)" }}>%</span>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-600">Seats/Business</td>
                <td className="py-2 text-right"><StepInput value={usersPerCustomer} onChange={setUsersPerCustomer} min={1} /></td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-600">Apps/Business</td>
                <td className="py-2 text-right"><StepInput value={appsPerUser} onChange={setAppsPerUser} min={1} /></td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">Price</td>
                <td className="py-2 text-right font-bold text-gray-800">$5/app + $1/seat/app</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-800 mb-2">Outputs</h3>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-600">Total Businesses</td>
                <td className="py-2 text-right font-bold" style={{ color: "var(--theme-secondary)" }}>{Math.round(penetratedCustomers).toLocaleString()}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-600">Total Users</td>
                <td className="py-2 text-right font-bold" style={{ color: "var(--theme-secondary)" }}>{Math.round(totalUsers).toLocaleString()}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-600 font-semibold">Annual Revenue</td>
                <td className="py-2 text-right font-bold gradient-brand-text">{fmt(totalAnnualRevenue)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-600">Hosting Cost</td>
                <td className="py-2 text-right font-bold text-gray-500">{fmt(annualInfraCost)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-600">Inference Cost</td>
                <td className="py-2 text-right font-bold text-gray-500">{fmt(annualInferenceCost)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-600">Gross Profit</td>
                <td className="py-2 text-right font-bold" style={{ color: "var(--theme-accent)" }}>{fmt(annualGrossProfit)}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600 font-semibold">Gross Margin</td>
                <td className="py-2 text-right text-lg font-bold" style={{ color: "var(--theme-accent)" }}>{grossMargin.toFixed(0)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProductStrategySlide() {
  const completed = [
    { label: "Platform Foundation", desc: "Auth, database, hosting" },
    { label: "AI App Generation", desc: "Claude Code CLI + builder" },
    { label: "Marketplace Rollout", desc: "Browse, publish, discover" },
    { label: "Organizations & Teams", desc: "Roles, invites, branding" },
    { label: "App Deployments", desc: "One-click launch to Fly.io" },
  ];
  const current = [
    { label: "Billing & Payments", desc: "Stripe subscriptions" },
    { label: "Marketplace Depth", desc: "Expanding pre-built offerings" },
  ];
  const future = [
    { label: "Cross-App Intelligence", desc: "Business insights multiplier" },
    { label: "AI-Native Coworkers", desc: "Agentic AI integration" },
    { label: "Generation Optimization", desc: "Fastest app generator in the world" },
  ];

  const userTranslations = [
    { dev: "Platform Foundation", user: "Sign up, verify email, create org" },
    { dev: "AI App Generation", user: "Describe an app in plain English, get it in 15 min" },
    { dev: "Marketplace Rollout", user: "Browse a library of ready-made business tools" },
    { dev: "Organizations & Teams", user: "Invite your team, assign roles" },
    { dev: "App Deployments", user: "Launch apps to your custom subdomain" },
    { dev: "Billing & Payments", user: "Subscribe and pay per-app, per-seat" },
    { dev: "Marketplace Depth", user: "More polished apps ready to deploy instantly" },
    { dev: "Cross-App Intelligence", user: "Ask questions across all your business data" },
    { dev: "AI-Native Coworkers", user: "AI agents that work alongside your team" },
    { dev: "Generation Optimization", user: "Apps built faster with higher quality" },
  ];

  // Gradient stops for the stepping stones
  const allSteps = [...completed, ...current, ...future];
  const getColor = (i: number) => {
    const t = i / (allSteps.length - 1);
    // orange → pink → purple
    if (t < 0.5) {
      const u = t * 2;
      const r = Math.round(249 + (236 - 249) * u);
      const g = Math.round(115 + (72 - 115) * u);
      const b = Math.round(22 + (153 - 22) * u);
      return `rgb(${r},${g},${b})`;
    }
    const u = (t - 0.5) * 2;
    const r = Math.round(236 + (147 - 236) * u);
    const g = Math.round(72 + (51 - 72) * u);
    const b = Math.round(153 + (234 - 153) * u);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto overflow-y-auto">
      <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 md:mb-6">Product Roadmap</h2>

      {/* Desktop */}
      <div className="hidden md:block">
        {/* Development Track — staggered footsteps */}
        <div className="mb-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Development Milestones</div>
          <div className="flex items-start justify-center" style={{ minHeight: 140 }}>
            {allSteps.map((step, i) => {
              const isCompleted = i < completed.length;
              const isCurrent = i >= completed.length && i < completed.length + current.length;
              const isHigh = i % 2 === 0;
              return (
                <div key={i} style={{ marginTop: isHigh ? 0 : 36 }}>
                  <div className="flex flex-col items-center" style={{ width: 88 }}>
                    <div
                      className="rounded-full flex items-center justify-center text-white font-bold text-xs mb-1.5"
                      style={{
                        width: 44,
                        height: 44,
                        backgroundColor: isCompleted || isCurrent ? getColor(i) : "#e5e7eb",
                        color: isCompleted || isCurrent ? "white" : "#9ca3af",
                        border: isCurrent ? "3px solid white" : "none",
                        boxShadow: isCurrent ? `0 0 0 2px ${getColor(i)}, 0 0 12px ${getColor(i)}40` : "none",
                        opacity: !isCompleted && !isCurrent ? 0.6 : 1,
                      }}
                    >
                      {isCompleted ? "\u2713" : isCurrent ? "\u2022\u2022" : (i + 1)}
                    </div>
                    <span
                      className="text-xs font-semibold text-center leading-tight"
                      style={{ color: isCompleted || isCurrent ? getColor(i) : "#9ca3af" }}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] text-gray-400 text-center leading-tight mt-0.5">
                      {step.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getColor(0) }} />
              <span className="text-xs text-gray-500">Complete</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: getColor(6), backgroundColor: getColor(6), boxShadow: `0 0 0 1px white, 0 0 0 2px ${getColor(6)}` }} />
              <span className="text-xs text-gray-500">In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <span className="text-xs text-gray-500">Planned</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-3" />

        {/* User Experience Track — staggered footsteps mirroring above */}
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">What Users Experience</div>
          <div className="flex items-start justify-center" style={{ minHeight: 120 }}>
            {userTranslations.map((row, i) => {
              const isCompleted = i < completed.length;
              const isCurrent = i >= completed.length && i < completed.length + current.length;
              const isFuture = !isCompleted && !isCurrent;
              const color = getColor(i);
              const isHigh = i % 2 === 0;
              return (
                <div key={i} style={{ marginTop: isHigh ? 0 : 30 }}>
                  <div className="flex flex-col items-center" style={{ width: 88 }}>
                    <div
                      className="rounded-full flex-shrink-0 mb-1.5"
                      style={{
                        width: isCurrent ? 34 : 28,
                        height: isCurrent ? 34 : 28,
                        backgroundColor: isFuture ? "#e5e7eb" : color,
                        boxShadow: isCurrent ? `0 0 0 3px white, 0 0 0 5px ${color}, 0 0 14px ${color}50` : "none",
                        opacity: isFuture ? 0.6 : 1,
                      }}
                    />
                    <span className={`text-xs text-center leading-tight ${isFuture ? "text-gray-400 italic" : "text-gray-700"}`}>
                      {row.user}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Development Track</div>
        <div className="space-y-1 mb-4">
          {allSteps.map((step, i) => {
            const isCompleted = i < completed.length;
            const isCurrent = i >= completed.length && i < completed.length + current.length;
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="flex flex-col items-center" style={{ width: 16 }}>
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: isCompleted || isCurrent ? getColor(i) : "#e5e7eb",
                      boxShadow: isCurrent ? `0 0 0 2px white, 0 0 0 3px ${getColor(i)}` : "none",
                    }}
                  />
                  {i < allSteps.length - 1 && <div className="w-0.5 h-3" style={{ backgroundColor: isCompleted ? getColor(i) : "#e5e7eb" }} />}
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold" style={{ color: isCompleted || isCurrent ? getColor(i) : "#9ca3af" }}>
                    {step.label}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-1">{step.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-200 my-3" />

        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Development {"\u2192"} User Experience</div>
        <div>
          {userTranslations.map((row, i) => {
            const isCompleted = i < completed.length;
            const isCurrent = i >= completed.length && i < completed.length + current.length;
            const isFuture = !isCompleted && !isCurrent;
            const color = getColor(i);
            const isLast = i === userTranslations.length - 1;
            return (
              <div key={i} className="flex gap-2">
                <div className="flex flex-col items-center" style={{ width: 16 }}>
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 z-10"
                    style={{
                      backgroundColor: isFuture ? "#e5e7eb" : color,
                      boxShadow: isCurrent ? `0 0 0 2px white, 0 0 0 3px ${color}` : "none",
                    }}
                  />
                  {!isLast && <div className="w-0.5 flex-1" style={{ backgroundColor: isFuture ? "#e5e7eb" : color, minHeight: 8 }} />}
                </div>
                <div className="pb-1.5">
                  <span className="text-xs font-semibold" style={{ color: isFuture ? "#9ca3af" : color }}>{row.dev}</span>
                  <span className="text-xs text-gray-400"> {"\u2192"} </span>
                  <span className={`text-xs ${isFuture ? "text-gray-400 italic" : "text-gray-600"}`}>{row.user}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PricingComparisonSlide() {
  const competitors = [
    { category: "CRM", name: "HubSpot", perUser: 20, base: 0 },
    { category: "Project Mgmt", name: "Monday.com", perUser: 12, base: 0 },
    { category: "Messaging", name: "Slack", perUser: 7.25, base: 0 },
    { category: "Invoicing", name: "FreshBooks", perUser: 11, base: 30 },
    { category: "Payroll", name: "Gusto", perUser: 6, base: 49 },
  ];

  const [seats, setSeats] = useState([15, 15, 15, 5, 15]);
  const updateSeats = (i: number, v: number) =>
    setSeats((prev) => prev.map((s, j) => (j === i ? v : s)));

  const traditionalTotal = competitors.reduce(
    (sum, c, i) => sum + c.base + c.perUser * seats[i], 0
  );
  const go4itTotal = competitors.reduce(
    (sum, _, i) => sum + 5 + seats[i] * 1, 0
  );
  const multiple = traditionalTotal > 0 && go4itTotal > 0
    ? Math.round(traditionalTotal / go4itTotal)
    : 0;

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <div className="flex flex-col justify-center h-full max-w-5xl mx-auto overflow-y-auto">
      <style dangerouslySetInnerHTML={{ __html: hideSpinners }} />
      <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-1 md:mb-2">Pricing Breakdown</h2>
      <p className="text-sm md:text-lg text-gray-500 mb-2 md:mb-3">
        5 core tools small businesses need — traditional vs. GO4IT (default 15 person business)
      </p>

      {/* Desktop */}
      <table className="hidden md:table w-full text-left border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="py-2 px-3 text-sm font-semibold text-gray-500">Category</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-500">Incumbent</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-500 text-right">Seats</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-500 text-right">Per-User Price</th>
            <th className="py-2 px-3 text-sm font-semibold text-gray-500 text-right">Monthly Cost</th>
            <th className="py-2 px-3 text-sm font-semibold text-right gradient-brand-text">GO4IT Cost</th>
          </tr>
        </thead>
        <tbody className="text-base text-gray-700">
          {competitors.map((c, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-3 px-3 font-medium">{c.category}</td>
              <td className="py-3 px-3 text-gray-500">{c.name}</td>
              <td className="py-3 px-3 text-right">
                <StepInput value={seats[i]} onChange={(v) => updateSeats(i, v)} min={1} max={50} />
              </td>
              <td className="py-3 px-3 text-right text-sm">
                {`$${c.perUser}/user/mo`}
                {c.base > 0 && <span className="text-gray-400">{` + $${c.base} base`}</span>}
              </td>
              <td className="py-3 px-3 text-right font-semibold" style={{ color: "#ef4444" }}>
                {fmt(c.base + c.perUser * seats[i])}
              </td>
              <td className="py-3 px-3 text-right font-semibold" style={{ color: "var(--theme-accent)" }}>
                {fmt(5 + seats[i] * 1)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2" style={{ borderColor: "var(--theme-primary)" }}>
            <td colSpan={4} className="py-3 px-3 font-bold text-lg text-gray-800">Total Monthly</td>
            <td className="py-3 px-3 text-right font-bold text-xl" style={{ color: "#ef4444" }}>
              {fmt(traditionalTotal)}
            </td>
            <td className="py-3 px-3 text-right font-bold text-xl gradient-brand-text">
              {fmt(go4itTotal)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Mobile */}
      <div className="md:hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="py-1.5 text-left text-xs font-semibold text-gray-500">Tool</th>
              <th className="py-1.5 text-right text-xs font-semibold text-gray-500">Seats</th>
              <th className="py-1.5 text-right text-xs font-semibold text-gray-500">Traditional</th>
              <th className="py-1.5 text-right text-xs font-semibold gradient-brand-text">GO4IT</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((c, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2">
                  <div className="font-medium text-gray-700">{c.category}</div>
                  <div className="text-xs text-gray-400">{c.name}</div>
                </td>
                <td className="py-2 text-right">
                  <StepInput value={seats[i]} onChange={(v) => updateSeats(i, v)} min={1} max={50} />
                </td>
                <td className="py-2 text-right font-semibold" style={{ color: "#ef4444" }}>
                  {fmt(c.base + c.perUser * seats[i])}
                </td>
                <td className="py-2 text-right font-semibold" style={{ color: "var(--theme-accent)" }}>
                  {fmt(5 + seats[i] * 1)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2" style={{ borderColor: "var(--theme-primary)" }}>
              <td colSpan={2} className="py-2 font-bold text-gray-800">Total</td>
              <td className="py-2 text-right font-bold" style={{ color: "#ef4444" }}>{fmt(traditionalTotal)}</td>
              <td className="py-2 text-right font-bold gradient-brand-text">{fmt(go4itTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Savings callout */}
      <div className="mt-1 md:mt-2 flex items-center justify-center gap-2">
        <span className="text-2xl md:text-4xl font-extrabold gradient-brand-text">{multiple}x</span>
        <span className="text-base md:text-xl text-gray-600">reduction in cost</span>
      </div>
      <p className="text-sm md:text-lg text-gray-500 text-center mt-1 italic">
        US 5-50 employee businesses average 16 SaaS apps — at 60% replacement (10 apps),<br />
        GO4IT saves a 15-person business over{" "}
        <span className="font-semibold text-theme-accent">$17,000/year</span>.
      </p>
      <p className="text-xs md:text-sm text-gray-400 text-center mt-1">
        Incumbent pricing based on annual billing. GO4IT: $5/app/mo + $1/person/app/mo.
      </p>
    </div>
  );
}

const slides = [
  {
    id: "title",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-4xl md:text-7xl font-bold gradient-brand-text mb-4 md:mb-6">GO4IT</h1>
        <p className="text-lg md:text-2xl text-gray-600 max-w-xs md:max-w-[48.4rem]">
          AI-enabled software tools to help small businesses do big things.
        </p>
      </div>
    ),
  },
  {
    id: "problem",
    content: (
      <div className="flex flex-col justify-center h-full max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 md:mb-10">The Problem</h2>
        <div className="space-y-4 md:space-y-6">
          <p className="text-lg md:text-2xl text-gray-700">
            US small businesses spend{" "}
            <span className="font-bold text-theme-accent">
              ~$1,400/employee/year
            </span>{" "}
            on SaaS software.
          </p>
          <p className="text-lg md:text-2xl text-gray-700">
            For a 20-person company, that&apos;s{" "}
            <span className="font-bold text-theme-secondary">$28,000/year</span>{" "}
            on tools they need to operate.
          </p>
          <p className="text-lg md:text-2xl text-gray-700">
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
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 md:mb-10">
          The Solution
        </h2>
        <div className="space-y-4 md:space-y-6">
          <p className="text-lg md:text-2xl text-gray-700">
            What if your software tools were tailored for your business, at a fraction of the cost?
          </p>
          <p className="text-lg md:text-2xl text-gray-700">
            GO4IT is a{" "}
            <span className="font-bold gradient-brand-text">
              free marketplace
            </span>{" "}
            for human-ideated, AI-generated SaaS applications.
          </p>
          <p className="text-lg md:text-2xl text-gray-700">
            Pick from a library of ready-made tools — or describe what you need
            in plain English
            <br />
            and AI builds it for you. Everything you need, nothing you don&apos;t.
          </p>
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
              desc: "Securely access your apps from your custom web address.",
            },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="w-16 h-16 rounded-full gradient-brand text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                {s.step}
              </div>
              <div className="w-full aspect-video flex items-end justify-center mb-4">
                <img
                  src={`/deck/step-${s.step}.png`}
                  alt={s.title}
                  className="max-w-full max-h-full rounded-lg shadow-md"
                />
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
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 md:mb-10">
          Our Addressable Market
        </h2>

        {/* Desktop: horizontal flow */}
        <div className="hidden md:flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="rounded-2xl flex items-center justify-center text-white font-bold text-2xl" style={{ width: 130, height: 130, backgroundColor: "#f97316" }}>$44B</div>
            <p className="text-sm font-semibold mt-2" style={{ color: "#f97316" }}>US 5–50 SaaS</p>
          </div>
          <div className="flex flex-col items-center flex-1 pt-[42px]">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">75% industry fit</div>
            <div className="w-full h-0.5 bg-gray-300 relative">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-gray-300" />
            </div>
            <div className="mt-2 text-xs text-gray-500 leading-tight text-center">
              <span className="text-green-600 font-semibold">Yes:</span> Retail, services, tech<br />
              <span className="text-red-400 font-semibold">No:</span> Healthcare, education
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="rounded-2xl flex items-center justify-center text-white font-bold text-2xl" style={{ width: 130, height: 130, backgroundColor: "#e8527a" }}>$33B</div>
            <p className="text-sm font-semibold mt-2" style={{ color: "#e8527a" }}>Industry Fit</p>
          </div>
          <div className="flex flex-col items-center flex-1 pt-[42px]">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">60% addressable</div>
            <div className="w-full h-0.5 bg-gray-300 relative">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-gray-300" />
            </div>
            <div className="mt-2 text-xs text-gray-500 leading-tight text-center">
              <span className="text-green-600 font-semibold">Yes:</span> CRM, PM, messaging, HR<br />
              <span className="text-red-400 font-semibold">No:</span> Payments, storage, security
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg" style={{ width: 130, height: 130, background: "linear-gradient(135deg, #f97316, #ec4899, #9333ea)" }}>$20B</div>
            <p className="text-sm font-bold mt-2 gradient-brand-text">GO4IT SAM</p>
          </div>
        </div>

        {/* Mobile: vertical flow */}
        <div className="flex md:hidden flex-col items-center gap-1">
          {[
            { value: "$44B", label: "US 5–50 SaaS", color: "#f97316", filter: null },
            { value: "$33B", label: "Industry Fit", color: "#e8527a", filter: { pct: "75%", name: "industry fit", yes: "Retail, services, tech", no: "Healthcare, education" } },
            { value: "$20B", label: "GO4IT SAM", color: null, gradient: true, filter: { pct: "60%", name: "addressable", yes: "CRM, PM, messaging, HR", no: "Payments, storage, security" } },
          ].map((b, i) => (
            <div key={i} className="flex flex-col items-center">
              {b.filter && (
                <div className="flex flex-col items-center mb-1">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{b.filter.pct} {b.filter.name}</div>
                  <div className="h-5 w-0.5 bg-gray-300 relative">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] border-t-gray-300" />
                  </div>
                  <div className="text-[10px] text-gray-500 leading-tight text-center">
                    <span className="text-green-600 font-semibold">Yes:</span> {b.filter.yes}{" · "}
                    <span className="text-red-400 font-semibold">No:</span> {b.filter.no}
                  </div>
                </div>
              )}
              <div
                className={`rounded-2xl flex items-center justify-center text-white font-bold text-lg ${b.gradient ? "shadow-lg" : ""}`}
                style={{ width: 80, height: 80, ...(b.gradient ? { background: "linear-gradient(135deg, #f97316, #ec4899, #9333ea)" } : { backgroundColor: b.color! }) }}
              >
                {b.value}
              </div>
              <p className={`text-xs font-semibold mt-1 ${b.gradient ? "gradient-brand-text font-bold" : ""}`} style={b.color ? { color: b.color } : undefined}>
                {b.label}
              </p>
            </div>
          ))}
        </div>

        <p className="text-lg md:text-2xl font-semibold text-gray-700 mt-6 md:mt-10 text-center">
          GO4IT is positioned to disrupt a{" "}
          <span className="font-bold gradient-brand-text">$20 Billion ARR</span> market.
        </p>
        <p className="text-sm md:text-lg text-gray-400 mt-2 text-center">
          Across 1,270,000 SaaS-using small businesses in the US.
        </p>
      </div>
    ),
  },
  {
    id: "revenue",
    content: (
      <div className="flex flex-col justify-center h-full max-w-sm md:max-w-[57.6rem] mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 md:mb-10">
          Revenue Model
        </h2>
        <div className="space-y-4 md:space-y-6">
          <p className="text-lg md:text-2xl text-gray-700">
            Apps are{" "}
            <span className="font-bold gradient-brand-text">free to create</span>
            .
          </p>
          <p className="text-lg md:text-2xl text-gray-700">
            <span className="font-bold text-theme-primary">$5/app/month</span>{" "}
            — covers hosting &amp; infrastructure.
          </p>
          <p className="text-lg md:text-2xl text-gray-700">
            <span className="font-bold text-theme-secondary">$1/person/app/month</span>{" "}
            — for each team member using an app.
          </p>
          <p className="text-lg md:text-2xl text-gray-700">
            A 15-person team with 5 apps pays just{" "}
            <span className="font-bold text-theme-accent">$90/month</span>{" "}
            — vs. $810/month with traditional SaaS.{" "}
            A <span className="font-bold text-theme-accent">9x</span> reduction in cost.
          </p>
        </div>
      </div>
    ),
  },
  { id: "pricing-comparison", content: null },
  { id: "financial", content: null },
  {
    id: "ask",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-3xl md:text-5xl font-bold gradient-brand-text mb-6 md:mb-10">
          Let&apos;s GO4IT
        </h2>
        <a
          href="https://go4it.live"
          target="_blank"
          rel="noopener noreferrer"
          className="gradient-brand text-lg md:text-xl font-semibold px-6 py-3 md:px-8 md:py-4 rounded-xl hover:opacity-90 transition"
        >
          Visit go4it.live
        </a>
      </div>
    ),
  },
  {
    id: "addendum",
    content: (
      <div className="flex items-center justify-center h-full">
        <h1 className="text-4xl md:text-7xl font-extrabold gradient-brand-text">
          Addendum Slides
        </h1>
      </div>
    ),
  },
  { id: "strategy", content: null },
  // { id: "dcf", content: null },
  {
    id: "marketplace",
    content: (
      <div className="flex flex-col justify-center h-full max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 md:mb-10">
          Why a Marketplace?
        </h2>

        <div className="space-y-4 md:space-y-6">
          <p className="text-lg md:text-2xl text-gray-700">
            Other AI app builders expect users to be <span className="text-gray-400">prompt engineers</span> and{" "}
            <span className="text-gray-400">architects</span>.
          </p>
          <p className="text-lg md:text-2xl text-gray-700">
            <span className="gradient-brand-text font-bold">GO4IT</span> lets users focus on{" "}
            <span className="font-semibold" style={{ color: "var(--theme-primary)" }}>operating their business</span>.
          </p>
          <p className="text-lg md:text-2xl text-gray-700">
            Most small businesses need the same tools — CRM, invoicing, scheduling, project management.
            Our curated library means they can{" "}
            <span className="font-semibold" style={{ color: "var(--theme-primary)" }}>browse, select, and launch in minutes</span> —
            not describe from scratch and wait.
          </p>
        </div>

        <p className="text-base md:text-xl text-gray-600 text-center mt-6 md:mt-8 italic">
          We preserve the freedom to create unique apps, while market meritocracy ensures the best common apps reach more users, leading to better products and faster deployments.
        </p>

        {/* Flywheel */}
        <div className="mt-6 md:mt-8">
          {/* Desktop: horizontal flywheel */}
          <div className="hidden md:flex items-center justify-center gap-3">
            {[
              { icon: "🛠️", label: "Creators build apps" },
              { icon: "⭐", label: "Best apps rise to the top" },
              { icon: "👥", label: "Users quickly find and deploy the best tools" },
              { icon: "🔄", label: "Product quality attracts more users" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex flex-col items-center text-center w-40">
                  <div className="text-3xl mb-2">{step.icon}</div>
                  <p className="text-sm font-medium text-gray-600">{step.label}</p>
                </div>
                {i < 3 && (
                  <div className="text-2xl font-bold gradient-brand-text">→</div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile: vertical flywheel */}
          <div className="md:hidden flex flex-col items-center gap-2">
            {[
              { icon: "🛠️", label: "Creators build apps" },
              { icon: "⭐", label: "Best apps rise to the top" },
              { icon: "👥", label: "Users quickly find and deploy the best tools" },
              { icon: "🔄", label: "Product quality attracts more users" },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{step.icon}</div>
                  <p className="text-sm font-medium text-gray-600">{step.label}</p>
                </div>
                {i < 3 && (
                  <div className="text-lg font-bold gradient-brand-text my-1">↓</div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    ),
  },
  {
    id: "competition",
    content: (
      <div className="flex flex-col justify-center h-full max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 md:mb-10">
          Competitive Landscape
        </h2>

        {/* Desktop comparison grid */}
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-3 px-4 text-base font-semibold text-gray-500 w-[200px]"></th>
                <th className="py-3 px-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg font-bold gradient-brand-text">GO4IT</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center">
                  <span className="text-lg font-bold text-gray-700">Base44</span>
                </th>
                <th className="py-3 px-3 text-center">
                  <span className="text-lg font-bold text-gray-700">Softr</span>
                </th>
                <th className="py-3 px-3 text-center">
                  <span className="text-lg font-bold text-gray-700">Bolt.new</span>
                </th>
                <th className="py-3 px-3 text-center">
                  <span className="text-lg font-bold text-gray-700">Replit</span>
                </th>
                <th className="py-3 px-3 text-center">
                  <span className="text-lg font-bold text-gray-700">Lovable</span>
                </th>
              </tr>
            </thead>
            <tbody className="text-base text-gray-700">
              {[
                { feature: "App Marketplace", go4it: true, base44: false, lovable: false, bolt: false, replit: false, softr: false },
                { feature: "AI Generation", go4it: true, base44: true, lovable: true, bolt: true, replit: true, softr: true },
                { feature: "Managed Hosting", go4it: true, base44: true, lovable: true, bolt: true, replit: true, softr: true },
                { feature: "Team Provisioning", go4it: true, base44: false, lovable: false, bolt: false, replit: false, softr: true },
                { feature: "Pre-Made Popular Apps", go4it: true, base44: false, lovable: false, bolt: false, replit: false, softr: false },
                { feature: "Auto-Deploy Pipeline", go4it: true, base44: true, lovable: true, bolt: true, replit: true, softr: true },
                { feature: "Business-Focused Pricing", go4it: true, base44: false, lovable: false, bolt: false, replit: false, softr: false },
              ].map((row, i) => (
                <tr key={i} className={i < 6 ? "border-b border-gray-100" : ""}>
                  <td className="py-3 px-4 font-medium text-gray-600">{row.feature}</td>
                  <td className="py-3 px-3 text-center">
                    {row.go4it ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-sm" style={{ background: "linear-gradient(135deg, #f97316, #ec4899, #9333ea)" }}>&#10003;</span>
                    ) : (
                      <span className="text-gray-300 text-lg">—</span>
                    )}
                  </td>
                  {[row.base44, row.softr, row.bolt, row.replit, row.lovable].map((val, j) => (
                    <td key={j} className="py-3 px-3 text-center">
                      {val ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-500 text-sm">&#10003;</span>
                      ) : (
                        <span className="text-gray-300 text-lg">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile comparison */}
        <div className="md:hidden space-y-3">
          {[
            { feature: "App Marketplace", go4it: true, others: "None" },
            { feature: "AI Generation", go4it: true, others: "All" },
            { feature: "Managed Hosting", go4it: true, others: "All" },
            { feature: "Team Provisioning", go4it: true, others: "Softr" },
            { feature: "Pre-Made Popular Apps", go4it: true, others: "None" },
            { feature: "Auto-Deploy Pipeline", go4it: true, others: "All" },
            { feature: "Business-Focused Pricing", go4it: true, others: "None" },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">{row.feature}</span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs" style={{ background: "linear-gradient(135deg, #f97316, #ec4899, #9333ea)" }}>&#10003;</span>
                <span className="text-xs text-gray-400">{row.others === "None" ? "Only GO4IT" : `Also: ${row.others}`}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-lg md:text-2xl font-semibold text-gray-700 mt-6 md:mt-10 text-center">
          Others build tools for <span className="text-gray-500">developers</span>.{" "}
          <span className="gradient-brand-text font-bold">GO4IT</span> builds tools for <span className="gradient-brand-text font-bold">businesses</span>.
        </p>
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
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? goNext() : goPrev(); }
    touchStart.current = null;
  }, [goNext, goPrev]);

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-white select-none"
      style={{
        "--theme-primary": "#9333ea",
        "--theme-secondary": "#ec4899",
        "--theme-accent": "#f97316",
        "--theme-gradient": "linear-gradient(to right, #f97316, #ec4899, #9333ea)",
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
      } as React.CSSProperties}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide */}
      <div className="h-full px-4 pt-6 pb-20 md:px-16 md:py-12 overflow-y-auto">
        {slides[current].id === "strategy"
          ? <ProductStrategySlide />
          : slides[current].id === "market"
          ? <MarketSlide active={slides[current].id === "market"} />
          : slides[current].id === "financial"
            ? <FinancialModelSlide />
            : slides[current].id === "dcf"
              ? <DCFSlide />
              : slides[current].id === "pricing-comparison"
                ? <PricingComparisonSlide />
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
