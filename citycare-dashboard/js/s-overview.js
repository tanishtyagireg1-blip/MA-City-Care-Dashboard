/* Overview: headline numbers, the forecast chart, annual comparison, findings. */
(function () {
  const { D, h, F, M, col, alpha, card, baseOpts, tbl, seg, kpi, Engine } = Core;
  const ser = D.series, bm = D.backtest_metrics, A = D.annual_summary_inr_lakh;
  const mp = (measure) => bm.find((r) => r.measure === measure && r.metric === "MAPE");
  const bench = D.diagnostics.benchmark_sales;

  Sections.overview = {
    title: "Overview",
    head() {
      return { h1: `AI cut the sales forecast error from ${F.pc(mp("Sales").traditional)} to ${F.pc(mp("Sales").ai)}, but a simple seasonal rule did better still`,
        p: "A 12-month budget for a small pharmacy, built two ways: a trend line with cost-volume-profit (CVP) analysis, and an AI ensemble of Holt-Winters and Ridge regression. Use the chart to compare them month by month." };
    },
    render(root) {
      const base = Engine.year({}); const o = D.scenarios.outcomes[0];
      const k = h("div", { class: "kpis" },
        kpi("Sales budget, next 12 months", F.lkU(A.ai.sales_lakh * 1e5), F.sgn(A.ai.sales_growth, (x) => F.pc(x)) + " on the last 12 months", "good"),
        kpi("Operating profit budget", F.lkU(base.P), F.sgn(o.profit_vs_last_year, (x) => F.pc(x)) + " on last year's " + F.lk(X().last_year_profit) + " lakh", "good"),
        kpi("Sales forecast error (MAPE)", F.pc(mp("Sales").ai) + " vs " + F.pc(mp("Sales").traditional), "AI against the trend line, on six unseen months", "good"),
        kpi("Break-even sales per month", F.lkU(base.beMonthly), "Margin of safety " + F.pc(base.mos), ""),
        kpi("Operating leverage (trend CVP)", F.x(D.cvp.degree_of_operating_leverage, 1), "A 10% sales fall cuts profit by " + F.pc(Math.abs(D.sensitivity[0].profit_change), 0), "bad"),
        kpi("Chance profit falls below last year", F.pc(D.monte_carlo.probabilities[1].probability, 0), "In 5,000 simulated years", ""));
      root.append(k);

      /* hero chart */
      const st = { metric: "sales", range: "recent" };
      const ranges = { all: [0, 35], recent: [12, 35], bt: [18, 35] };
      const metricSeg = seg([{ v: "sales", label: "Sales" }, { v: "expenses", label: "Expenses" }, { v: "profit", label: "Operating profit" }], st.metric, (v) => { st.metric = v; hero.draw(); }, "Measure");
      const rangeSeg = seg([{ v: "all", label: "All 36 months" }, { v: "recent", label: "Last 12 and forecast" }, { v: "bt", label: "Backtest and forecast" }], st.range, (v) => { st.range = v; hero.draw(); }, "Range");
      const hero = card({
        title: "Actual and forecast by month", height: 380, file: "forecast-by-month",
        sub: "Black is what happened. Orange and blue show what each method forecast; in the shaded backtest window they had not seen the actuals. Hover for values and errors; press a legend item to hide it.",
        controls: [metricSeg, rangeSeg],
        note: "The shaded band is the AI forecast plus or minus 1.28 times the backtest RMSE, an approximate 80% range (sales only).",
      });
      hero.draw(() => {
        const c = col(), [a, b] = ranges[st.range], m = st.metric;
        const sl = (key) => ser.map((r) => r[key]).slice(a, b + 1);
        const labels = ser.map((r) => F.mon(r.month)).slice(a, b + 1);
        const L = (arr) => arr.map((v) => (v == null ? null : v));
        const ds = [
          { label: "Actual", data: L(sl("actual_" + m)), borderColor: c.actual, backgroundColor: c.actual, borderWidth: 2.4, pointRadius: 0, pointHoverRadius: 4, tension: 0, spanGaps: false },
          { label: "Traditional (trend and CVP)", legendLabel: "Traditional", data: L(sl("traditional_" + m)), borderColor: c.trad, backgroundColor: c.trad, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, pointHoverRadius: 4, tension: 0 },
          { label: "AI ensemble", data: L(sl("ai_" + m)), borderColor: c.ai, backgroundColor: c.ai, borderWidth: 2.4, pointRadius: 0, pointHoverRadius: 4, tension: 0 },
          { label: "Hybrid (AI sales, CVP costs)", legendLabel: "Hybrid", data: L(sl("hybrid_" + m)), borderColor: c.hyb, backgroundColor: c.hyb, borderWidth: 2, borderDash: [2, 3], pointRadius: 0, pointHoverRadius: 4, tension: 0, hidden: false },
        ];
        if (m === "sales") {
          ds.push({ label: "AI upper 80%", legendLabel: "AI 80% range", group: "band", data: L(sl("ai_sales_upper_80")), borderColor: "transparent", backgroundColor: alpha(c.ai, 0.14), fill: "+1", pointRadius: 0, pointHoverRadius: 0, legendType: "box", legendColor: alpha(c.ai, 0.4), noTip: false });
          ds.push({ label: "AI lower 80%", group: "band", data: L(sl("ai_sales_lower_80")), borderColor: "transparent", pointRadius: 0, pointHoverRadius: 0, noLegend: true, backgroundColor: "transparent" });
        }
        const rel = (i) => i - a, items = [];
        if (b >= 18 && a <= 23) items.push({ from: Math.max(18, a) - a, to: Math.min(23, b) - a, color: alpha(c.ink2, 0.10), label: "Backtest" });
        if (b >= 24) items.push({ from: Math.max(24, a) - a, to: b - a, color: alpha(c.ink2, 0.045), label: "Forecast" });
        const o = baseOpts({ yTitle: "INR lakh" });
        o.plugins.regions = { items };
        o.plugins.tooltip.callbacks.afterBody = (items) => {
          const r = ser[a + items[0].dataIndex]; if (!r || r.phase !== "Backtest") return "";
          const act = r["actual_" + m]; const e = (who) => (r[who + "_" + m] - act) / Math.abs(act);
          return ["", "Error against the actual (forecast minus actual):", `Traditional ${F.sgn(e("traditional"), (x) => F.pc(x))}   AI ${F.sgn(e("ai"), (x) => F.pc(x))}`];
        };
        if (m !== "profit") o.scales.y.ticks.callback = (v) => F.lk(v, 0); else o.scales.y.ticks.callback = (v) => F.lk(v, 1);
        return { type: "line", data: { labels, datasets: ds }, options: o };
      });
      root.append(hero.root);

      /* annual comparison */
      const heads = ["INR lakh", "Last 12 months (actual)", "Traditional", "AI ensemble", "Hybrid"];
      const rows = [
        ["Sales", ...["last_12m_actual", "traditional", "ai", "hybrid"].map((k) => A[k].sales_lakh.toFixed(2))],
        ["Expenses", ...["last_12m_actual", "traditional", "ai", "hybrid"].map((k) => A[k].expenses_lakh.toFixed(2))],
        ["Operating profit", ...["last_12m_actual", "traditional", "ai", "hybrid"].map((k) => A[k].profit_lakh.toFixed(2))],
        ["Profit margin", ...["last_12m_actual", "traditional", "ai", "hybrid"].map((k) => F.pc(A[k].profit_margin))],
        ["Sales growth", "–", ...["traditional", "ai", "hybrid"].map((k) => F.sgn(A[k].sales_growth, (x) => F.pc(x)))],
        ["Profit growth", "–", ...["traditional", "ai", "hybrid"].map((k) => F.sgn(A[k].profit_growth, (x) => F.pc(x)))],
      ]; rows[2]._cls = "total";
      const tcard = card({ title: "Next-year forecast by method", sub: "Totals for Oct 2026 to Sep 2027 against the last 12 months of actuals.", height: 220, file: "annual-profit-by-method", table: false, legend: false });
      tcard.draw(() => {
        const c = col(); const keys = ["last_12m_actual", "traditional", "ai", "hybrid"]; const nm = ["Actual", "Trad.", "AI", "Hybrid"];
        return { type: "bar", data: { labels: nm, datasets: [{ label: "Operating profit (INR lakh)", data: keys.map((k) => A[k].profit_lakh * 1e5), backgroundColor: [c.actual, c.trad, c.ai, c.hyb], borderRadius: { topLeft: 4, topRight: 4 }, maxBarThickness: 54, fmt: (v) => F.lkU(v) }] },
          options: Object.assign(baseOpts({ type: "bar", x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0 } }, yTitle: "Operating profit, INR lakh", y: { beginAtZero: true, grid: { color: c.grid }, border: { display: false }, ticks: { callback: (v) => F.lk(v, 0) }, title: { display: true, text: "Operating profit, INR lakh", color: c.ink2 } } }), {}) };
      });
      const tw = h("div", { class: "tablewrap" }, tbl(heads, rows));
      root.append(h("div", { class: "grid g12" }, tcard.root, h("div", { class: "card" }, h("h2", { text: "The numbers behind it" }), h("p", { class: "sub", text: "The AI budget sits between last year and the trend line. The trend line promises the highest profit because it cannot see the spring dip." }), tw)));

      /* findings */
      const f = h("div", { class: "grid g3" });
      D.summary.findings.forEach((t) => {
        const m = t.match(/^\d+\.\s+([^.]+)\.\s+(.*)$/); const title = m ? m[1] : "Finding"; const body = m ? m[2] : t;
        f.append(h("div", { class: "finding" }, h("h3", { text: title }), h("p", { text: body })));
      });
      root.append(h("div", { class: "card" }, h("h2", { text: "What the analysis found" }), h("div", { style: { height: "10px" } }), f));
      root.append(h("div", { style: { height: "16px" } }), h("div", { class: "callout" }, h("h3", { text: "Recommendation" }), h("p", { text: D.summary.recommendation }), h("p", { class: "note", text: "Limits: " + D.summary.limits })));
    },
  };
  function X() { return D.budget_drivers.exact; }
})();
