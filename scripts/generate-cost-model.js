const ExcelJS = require("exceljs");
const path = require("path");

async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GO4IT";
  wb.created = new Date();

  // ── Constants ──
  const PEOPLE_PER_BIZ = 10;
  const APPS_PER_BIZ = 6;
  const GENERATIONS_PER_MO = 4; // 1/week
  const FLY_COST_PER_APP = 2.68; // shared-cpu-1x 256MB + 1GB vol
  const ANTHROPIC_PER_GEN = 0.5; // ~$0.30-$0.80 avg
  const VERCEL_BASE = 20; // Pro plan
  const TURSO_FREE_LIMIT = 500; // DBs on free tier
  const TURSO_PAID = 29; // /mo after free tier
  const RESEND_FREE_EMAILS = 3000;
  const RESEND_PAID = 20; // /mo after free tier
  const SQUARESPACE_YEARLY = 20;
  const INFRA_MARKUP = 0.2; // 20%
  const SEAT_PRICE = 1.0; // $1/seat/app/mo

  // Business counts to model
  const bizCounts = [
    100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000,
    500000, 1000000,
  ];

  // ═══════════════════════════════════════════
  // Sheet 1: Assumptions
  // ═══════════════════════════════════════════
  const assumptions = wb.addWorksheet("Assumptions");
  assumptions.columns = [
    { header: "Parameter", key: "param", width: 40 },
    { header: "Value", key: "value", width: 18 },
    { header: "Unit", key: "unit", width: 20 },
  ];

  const headerStyle = {
    font: { bold: true, color: { argb: "FFFFFFFF" }, size: 12 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B21A8" } },
    alignment: { horizontal: "center" },
  };

  assumptions.getRow(1).eachCell((cell) => {
    cell.style = headerStyle;
  });

  const assumptionData = [
    ["Average employees per business", PEOPLE_PER_BIZ, "people"],
    ["Average apps per business", APPS_PER_BIZ, "apps"],
    ["Seats per app (= employees)", PEOPLE_PER_BIZ, "seats"],
    ["App generations per business/mo", GENERATIONS_PER_MO, "generations"],
    ["", "", ""],
    ["Fly.io cost per deployed app", FLY_COST_PER_APP, "$/app/mo"],
    [
      "Anthropic API cost per generation",
      ANTHROPIC_PER_GEN,
      "$/generation",
    ],
    ["Vercel Pro (platform hosting)", VERCEL_BASE, "$/mo fixed"],
    ["Turso free tier limit", TURSO_FREE_LIMIT, "databases"],
    ["Turso paid tier", TURSO_PAID, "$/mo (after free)"],
    ["Resend free tier", RESEND_FREE_EMAILS, "emails/mo"],
    ["Resend paid tier", RESEND_PAID, "$/mo (after free)"],
    ["Squarespace domain", SQUARESPACE_YEARLY, "$/year"],
    ["", "", ""],
    ["Infrastructure markup", `${INFRA_MARKUP * 100}%`, "on hosting costs"],
    ["Per-seat per-app price", SEAT_PRICE, "$/seat/app/mo"],
  ];

  assumptionData.forEach((row) => {
    const r = assumptions.addRow({ param: row[0], value: row[1], unit: row[2] });
    if (row[0] === "") return;
    r.getCell(1).font = { bold: row[0].startsWith("Infrastructure") || row[0].startsWith("Per-seat") };
  });

  // ═══════════════════════════════════════════
  // Sheet 2: Cost Model
  // ═══════════════════════════════════════════
  const costs = wb.addWorksheet("Cost Model");

  const costHeaders = [
    "Businesses",
    "Total Apps",
    "Total Seats",
    "Generations/mo",
    "Fly.io ($/mo)",
    "Anthropic ($/mo)",
    "Vercel ($/mo)",
    "Turso ($/mo)",
    "Resend ($/mo)",
    "Domain ($/mo)",
    "Total Cost ($/mo)",
    "Cost/Business ($/mo)",
  ];

  costs.columns = costHeaders.map((h, i) => ({
    header: h,
    key: `c${i}`,
    width: i === 0 ? 14 : 18,
  }));

  costs.getRow(1).eachCell((cell) => {
    cell.style = headerStyle;
  });

  const costRows = bizCounts.map((biz) => {
    const totalApps = biz * APPS_PER_BIZ;
    const totalSeats = biz * PEOPLE_PER_BIZ * APPS_PER_BIZ;
    const gensPerMo = biz * GENERATIONS_PER_MO;

    const flyCost = totalApps * FLY_COST_PER_APP;
    const anthropicCost = gensPerMo * ANTHROPIC_PER_GEN;

    // Vercel scales with traffic — estimate $20 base + $0.01/biz after 1K
    const vercelCost = biz <= 1000 ? VERCEL_BASE : VERCEL_BASE + (biz - 1000) * 0.01;

    // Turso: free up to 500 DBs, then $29/mo + usage
    // Each business gets 1 platform DB row, each deployed app gets its own SQLite on Fly
    // Turso is only for the platform DB — scales with reads/writes not app count
    const tursoCost = biz <= 5000 ? 0 : TURSO_PAID + Math.floor(biz / 10000) * 10;

    // Resend: ~2 emails per business on signup + invites; ongoing ~0.5 emails/biz/mo
    const emailsPerMo = biz * 0.5;
    const resendCost =
      emailsPerMo <= RESEND_FREE_EMAILS ? 0 : RESEND_PAID + (emailsPerMo - RESEND_FREE_EMAILS) * 0.001;

    const domainCost = SQUARESPACE_YEARLY / 12;

    const totalCost = flyCost + anthropicCost + vercelCost + tursoCost + resendCost + domainCost;
    const costPerBiz = totalCost / biz;

    return [
      biz,
      totalApps,
      totalSeats,
      gensPerMo,
      flyCost,
      anthropicCost,
      vercelCost,
      tursoCost,
      resendCost,
      domainCost,
      totalCost,
      costPerBiz,
    ];
  });

  costRows.forEach((row) => {
    const r = costs.addRow(
      Object.fromEntries(row.map((v, i) => [`c${i}`, v]))
    );
    // Format numbers
    r.eachCell((cell, colNumber) => {
      if (colNumber === 1) {
        cell.numFmt = "#,##0";
      } else if (colNumber >= 2 && colNumber <= 4) {
        cell.numFmt = "#,##0";
      } else {
        cell.numFmt = "$#,##0.00";
      }
    });
  });

  // ═══════════════════════════════════════════
  // Sheet 3: Revenue Model
  // ═══════════════════════════════════════════
  const revenue = wb.addWorksheet("Revenue Model");

  const revHeaders = [
    "Businesses",
    "Hosting Revenue ($/mo)",
    "Seat Revenue ($/mo)",
    "Total Revenue ($/mo)",
    "Revenue/Business ($/mo)",
    "Total Cost ($/mo)",
    "Gross Profit ($/mo)",
    "Gross Margin (%)",
    "Annual Revenue ($)",
    "Annual Profit ($)",
  ];

  revenue.columns = revHeaders.map((h, i) => ({
    header: h,
    key: `r${i}`,
    width: i === 0 ? 14 : 22,
  }));

  revenue.getRow(1).eachCell((cell) => {
    cell.style = headerStyle;
  });

  costRows.forEach((costRow) => {
    const biz = costRow[0];
    const totalCost = costRow[10];
    const flyCost = costRow[4];
    const anthropicCost = costRow[5];

    // Hosting revenue = (Fly.io cost + Anthropic cost) × 1.2
    const hostingRevenue = (flyCost + anthropicCost) * (1 + INFRA_MARKUP);

    // Seat revenue = businesses × apps × seats × $1
    const seatRevenue = biz * APPS_PER_BIZ * PEOPLE_PER_BIZ * SEAT_PRICE;

    const totalRevenue = hostingRevenue + seatRevenue;
    const revenuePerBiz = totalRevenue / biz;
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = (grossProfit / totalRevenue) * 100;
    const annualRevenue = totalRevenue * 12;
    const annualProfit = grossProfit * 12;

    const r = revenue.addRow({
      r0: biz,
      r1: hostingRevenue,
      r2: seatRevenue,
      r3: totalRevenue,
      r4: revenuePerBiz,
      r5: totalCost,
      r6: grossProfit,
      r7: grossMargin,
      r8: annualRevenue,
      r9: annualProfit,
    });

    r.eachCell((cell, colNumber) => {
      if (colNumber === 1) {
        cell.numFmt = "#,##0";
      } else if (colNumber === 8) {
        cell.numFmt = "0.0%";
        cell.value = grossMargin / 100; // Store as decimal for % format
      } else {
        cell.numFmt = "$#,##0";
      }
    });
  });

  // ═══════════════════════════════════════════
  // Sheet 4: Summary Dashboard
  // ═══════════════════════════════════════════
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "", key: "label", width: 30 },
    { header: "100", key: "s100", width: 16 },
    { header: "1,000", key: "s1k", width: 16 },
    { header: "10,000", key: "s10k", width: 16 },
    { header: "100,000", key: "s100k", width: 18 },
    { header: "1,000,000", key: "s1m", width: 18 },
  ];

  summary.getRow(1).eachCell((cell) => {
    cell.style = headerStyle;
  });
  summary.getCell("A1").value = "Metric \\ Businesses";

  // Pick specific business counts for the summary
  const pickBiz = [100, 1000, 10000, 100000, 1000000];
  const pickIndices = pickBiz.map((b) => bizCounts.indexOf(b));

  function getRevRow(bizIdx) {
    const costRow = costRows[bizIdx];
    const biz = costRow[0];
    const totalCost = costRow[10];
    const flyCost = costRow[4];
    const anthropicCost = costRow[5];
    const hostingRevenue = (flyCost + anthropicCost) * (1 + INFRA_MARKUP);
    const seatRevenue = biz * APPS_PER_BIZ * PEOPLE_PER_BIZ * SEAT_PRICE;
    const totalRevenue = hostingRevenue + seatRevenue;
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = (grossProfit / totalRevenue) * 100;
    return { biz, totalCost, totalRevenue, grossProfit, grossMargin, hostingRevenue, seatRevenue };
  }

  const summaryMetrics = [
    {
      label: "Monthly Revenue",
      values: pickIndices.map((i) => getRevRow(i).totalRevenue),
      fmt: "$#,##0",
    },
    {
      label: "Monthly Cost",
      values: pickIndices.map((i) => getRevRow(i).totalCost),
      fmt: "$#,##0",
    },
    {
      label: "Monthly Profit",
      values: pickIndices.map((i) => getRevRow(i).grossProfit),
      fmt: "$#,##0",
    },
    {
      label: "Gross Margin",
      values: pickIndices.map((i) => getRevRow(i).grossMargin / 100),
      fmt: "0.0%",
    },
    { label: "", values: ["", "", "", "", ""], fmt: null },
    {
      label: "Annual Revenue",
      values: pickIndices.map((i) => getRevRow(i).totalRevenue * 12),
      fmt: "$#,##0",
    },
    {
      label: "Annual Profit",
      values: pickIndices.map((i) => getRevRow(i).grossProfit * 12),
      fmt: "$#,##0",
    },
    { label: "", values: ["", "", "", "", ""], fmt: null },
    {
      label: "Revenue per Business ($/mo)",
      values: pickIndices.map((i) => {
        const r = getRevRow(i);
        return r.totalRevenue / r.biz;
      }),
      fmt: "$#,##0.00",
    },
    {
      label: "Cost per Business ($/mo)",
      values: pickIndices.map((i) => {
        const r = getRevRow(i);
        return r.totalCost / r.biz;
      }),
      fmt: "$#,##0.00",
    },
    {
      label: "Profit per Business ($/mo)",
      values: pickIndices.map((i) => {
        const r = getRevRow(i);
        return r.grossProfit / r.biz;
      }),
      fmt: "$#,##0.00",
    },
    { label: "", values: ["", "", "", "", ""], fmt: null },
    {
      label: "Hosting Rev (% of total)",
      values: pickIndices.map((i) => {
        const r = getRevRow(i);
        return r.hostingRevenue / r.totalRevenue;
      }),
      fmt: "0.0%",
    },
    {
      label: "Seat Rev (% of total)",
      values: pickIndices.map((i) => {
        const r = getRevRow(i);
        return r.seatRevenue / r.totalRevenue;
      }),
      fmt: "0.0%",
    },
  ];

  const keys = ["s100", "s1k", "s10k", "s100k", "s1m"];
  summaryMetrics.forEach((metric) => {
    const rowData = { label: metric.label };
    keys.forEach((k, idx) => {
      rowData[k] = metric.values[idx];
    });
    const r = summary.addRow(rowData);
    if (metric.fmt) {
      r.eachCell((cell, colNumber) => {
        if (colNumber > 1 && metric.fmt) {
          cell.numFmt = metric.fmt;
        }
        if (colNumber === 1) {
          cell.font = { bold: true };
        }
      });
    }
  });

  // Conditional formatting — highlight profit rows
  summary.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const label = row.getCell(1).value;
    if (
      label &&
      (String(label).includes("Profit") || String(label).includes("Margin"))
    ) {
      row.eachCell((cell, colNumber) => {
        if (colNumber > 1) {
          cell.font = { bold: true, color: { argb: "FF16A34A" } };
        }
      });
    }
  });

  // ── Save ──
  const outPath = path.join(__dirname, "..", "GO4IT_Cost_Revenue_Model.xlsx");
  await wb.xlsx.writeFile(outPath);
  console.log(`Excel model saved to: ${outPath}`);
}

generate().catch(console.error);
