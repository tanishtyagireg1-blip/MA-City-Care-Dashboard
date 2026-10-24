/* Accuracy: backtest metrics, benchmark, monthly errors, tracking signals. */
(function () {
  const { D, h, F, M, col, alpha, card, baseOpts, tbl, seg, kpi } = Core;
  const bm = D.backtest_metrics, dg = D.diagnostics;
  const get = (measure, metric) => bm.find((r) => r.measure === measure && r.metric === metric);

  Sections.accuracy = {
    title: "Accuracy",
    head() { return { h1: "Judged on months they never saw, AI beats the trend line on every measure, but not the seasonal-naive rule", p: "Each model was trained on the first 18 months and scored on April to September 2026. Lower errors are better. Press a button to change the measure or the metric." }; },
    render(root) {
      const s = get("Sales", "MAPE");
      root.append(h("div", { class: "kpis" },
        kpi("Sales error, traditional", F.pc(s.traditional), "MAPE on six unseen months", "bad"), kpi("Sales error, AI ensemble", F.pc(s.ai), F.pc(D.ai_vs_traditional.mape_reduction_sales, 0) + " lower than traditional", "good"),
        kpi("Profit error, AI ensemble", F.pc(get("Profit", "MAPE").ai), "Against " + F.pc(get("Profit", "MAPE").traditional) + " for traditional", "good"),
        kpi("Direction right, AI", F.pc(dg.direction_hit_rate.ai, 0), "Traditional: " + F.pc(dg.direction_hit_rate.traditional, 0) + " (only six months)", ""),
        kpi("Best simple benchmark", F.pc(dg.benchmark_sales[1].mape), "Same month last year plus growth", "")));

      /* methods x metric */
      const st = { measure: "Sales", metric: "MAPE" };
      const metricNames = { MAPE: "MAPE", MAE: "MAE (INR)", RMSE: "RMSE (INR)" };
      const c1 = card({ title: "Forecast error by method", height: 300, legend: false, file: "error-by-method",
        sub: "MAPE is the average miss as a share of the actual. MAE is the average miss in rupees. RMSE is like MAE but punishes big misses.",
        controls: [seg([{ v: "Sales", label: "Sales" }, { v: "Expenses", label: "Expenses" }, { v: "Profit", label: "Operating profit" }], st.measure, (v) => { st.measure = v; c1.draw(); }, "Measure"),
          seg([{ v: "MAPE", label: "MAPE" }, { v: "MAE", label: "MAE" }, { v: "RMSE", label: "RMSE" }], st.metric, (v) => { st.metric = v; c1.draw(); }, "Metric")] });
      c1.draw(() => {
        const c = col(); const r = get(st.measure, metricNames[st.metric]); const pct = st.metric === "MAPE";
        const f = pct ? (v) => F.pc(v) : (v) => "INR " + F.n0(v);
        const o = baseOpts({ type: "bar", mode: "nearest", intersect: true, yTitle: pct ? "Error (share of actual)" : "INR thousand" }); o.scales.y.beginAtZero = true; o.scales.y.ticks.callback = pct ? (v) => F.pc(v, 0) : (v) => (v / 1e3).toFixed(0);
        return { type: "bar", data: { labels: ["Traditional", "AI ensemble", "Hybrid"], datasets: [{ label: st.metric, data: [r.traditional, r.ai, r.hybrid], backgroundColor: [c.trad, c.ai, c.hyb], borderRadius: { topLeft: 4, topRight: 4 }, maxBarThickness: 90, fmt: f }] }, options: o };
      });

      /* benchmark */
      const st2 = { m: "mape" };
      const nm = { "Seasonal naive (same month last year)": "Same month last year", "Seasonal naive + growth": "Same month last year, plus growth", "Traditional (trend)": "Traditional trend line", "Holt-Winters": "Holt-Winters", "Ridge regression": "Ridge regression", "AI ensemble": "AI ensemble" };
      const c2 = card({ title: "Against simple benchmarks, sales", height: 300, legend: false, file: "benchmark",
        sub: "A forecasting method must beat a simple rule, or its complexity adds nothing. Sorted best to worst.",
        controls: [seg([{ v: "mape", label: "MAPE" }, { v: "mae", label: "MAE" }], st2.m, (v) => { st2.m = v; c2.draw(); }, "Metric")] });
      c2.draw(() => {
        const c = col(); const b = dg.benchmark_sales.slice().sort((x, y) => x[st2.m] - y[st2.m]);
        const colour = (m) => (m.startsWith("Traditional") ? c.trad : m === "AI ensemble" ? c.ai : m === "Holt-Winters" ? c.hw : m === "Ridge regression" ? c.ridge : c.naive);
        const pct = st2.m === "mape"; const o = baseOpts({ type: "bar", mode: "nearest", intersect: true }); o.indexAxis = "y";
        o.scales = { x: { beginAtZero: true, grid: { color: c.grid }, border: { display: false }, ticks: { callback: pct ? (v) => F.pc(v, 0) : (v) => F.lk(v, 1), color: c.ink2 }, title: { display: true, text: pct ? "Sales MAPE" : "Sales MAE, INR lakh", color: c.ink2 } }, y: { grid: { display: false }, border: { color: c.axis }, ticks: { color: c.ink2 } } };
        return { type: "bar", data: { labels: b.map((r) => nm[r.method]), datasets: [{ label: pct ? "MAPE" : "MAE", data: b.map((r) => r[st2.m]), backgroundColor: b.map((r) => colour(r.method)), borderRadius: { topRight: 4, bottomRight: 4 }, maxBarThickness: 30, fmt: pct ? (v) => F.pc(v, 2) : (v) => "INR " + F.n0(v) }] }, options: o };
      });
      root.append(h("div", { class: "grid g2" }, c1.root, c2.root));

      const bt = tbl(["Method (sales)", "MAE (INR)", "MAPE", "Bias (INR)", "Skill vs naive plus growth", "Rank by MAPE"], dg.benchmark_sales.slice().sort((a, b) => a.rank_by_mape - b.rank_by_mape).map((r) => [nm[r.method], F.n0(r.mae), F.pc(r.mape, 2), F.n0(r.bias), r.skill_vs_naive_growth === 0 ? "baseline" : F.pc(r.skill_vs_naive_growth, 0), r.rank_by_mape]));
      root.append(h("div", { class: "card" }, h("h2", { text: "Benchmark table" }),
        h("p", { class: "sub", html: `<b>Skill</b> = 1 minus the method's MAE divided by the benchmark's MAE; negative means worse than the benchmark. "Same month last year, plus growth" scores best because the simulated data are trend times seasonality. The AI's real gain is over the trend line; it does not beat a well-chosen seasonal rule.` }), h("div", { class: "tablewrap" }, bt),
        h("p", { class: "note", html: `The growth rate used by the benchmark is ${F.pc(dg.benchmark_growth_used, 1)} a year, taken from the first 18 months.` })));

      /* monthly errors */
      const st3 = { m: "sales" };
      const me = dg.monthly_error;
      const c3 = card({ title: "Error by month", height: 290, file: "monthly-error",
        sub: "Forecast minus actual. Bars above zero over-forecast. Both methods over-forecast in the spring, when the competitor opened; the trend line then under-forecasts the monsoon peak.",
        controls: [seg([{ v: "sales", label: "Sales, % of actual" }, { v: "expenses", label: "Expenses, % of actual" }, { v: "profit", label: "Profit, INR" }], st3.m, (v) => { st3.m = v; c3.draw(); }, "Measure")] });
      c3.draw(() => {
        const c = col(); const k = st3.m; const pct = k !== "profit"; const g = (w) => me.map((r) => r[(k === "profit" ? "profit_error_" : k + "_error_pct_") + w]);
        const o = baseOpts({ type: "bar", yTitle: pct ? "Error, % of actual" : "Error, INR thousand" }); o.scales.y.ticks.callback = pct ? (v) => F.pc(v, 0) : (v) => (v / 1e3).toFixed(0);
        const f = pct ? (v) => F.sgn(v, (x) => F.pc(x)) : (v) => F.sgn(v, F.n0);
        return { type: "bar", data: { labels: me.map((r) => F.mon(r.month)), datasets: [{ label: "Traditional", data: g("traditional"), backgroundColor: c.trad, borderRadius: 2, fmt: f }, { label: "AI ensemble", data: g("ai"), backgroundColor: c.ai, borderRadius: 2, fmt: f }] }, options: o };
      });
      const ts = dg.tracking_signal_sales;
      const c4 = card({ title: "Tracking signal, sales", height: 290, file: "tracking-signal",
        sub: "Cumulative error divided by the average miss. A signal beyond plus or minus 4 says a model is persistently biased and should be retrained. Neither crossed the limit." });
      c4.draw(() => {
        const c = col(); const o = baseOpts({ yTitle: "Tracking signal" }); o.scales.y.min = -5; o.scales.y.max = 5; o.scales.y.ticks.callback = (v) => v; o.scales.y.ticks.stepSize = 1;
        const L = (label, data, color, dash) => ({ label, data, borderColor: color, backgroundColor: color, borderWidth: 2.2, borderDash: dash || [], pointRadius: 3, pointHoverRadius: 5, tension: 0, fmt: (v) => v.toFixed(2) });
        const lim = (v) => ({ label: "Limit " + (v > 0 ? "+4" : "-4"), data: ts.map(() => v), borderColor: c.bad, backgroundColor: c.bad, borderWidth: 1.4, borderDash: [4, 4], pointRadius: 0, pointHoverRadius: 0, group: "limit", legendLabel: "Limit (plus or minus 4)", noTip: true, legendType: "dash", fmt: (x) => String(x) });
        return { type: "line", data: { labels: ts.map((r) => F.mon(r.month)), datasets: [L("Traditional", ts.map((r) => r.traditional), c.trad, [6, 4]), L("AI ensemble", ts.map((r) => r.ai), c.ai), lim(4), Object.assign(lim(-4), { noLegend: true })] }, options: o };
      });
      root.append(h("div", { class: "grid g2" }, c3.root, c4.root));

      /* bias & totals */
      const bias = ["Sales", "Expenses", "Profit"].map((m) => { const r = get(m, "Bias (INR)"); return [m, F.n0(r.traditional), F.n0(r.ai), F.n0(r.hybrid)]; });
      const tot = get("Total profit (6 months)", "Total profit error (INR)");
      root.append(h("div", { class: "grid g2" },
        h("div", { class: "card" }, h("h2", { text: "Bias: do the errors lean one way?" }), h("p", { class: "sub", text: "Average of forecast minus actual, in INR. A value near zero means over- and under-forecasts cancel; it says nothing about how big each miss was." }), h("div", { class: "tablewrap" }, tbl(["Measure", "Traditional", "AI ensemble", "Hybrid"], bias))),
        h("div", { class: "card" }, h("h2", { text: "Why totals can mislead" }), h("p", { class: "sub", text: "Over the six months, the net profit error looks alike for all three methods, because monthly misses cancel out." }),
          h("div", { class: "tablewrap" }, tbl(["Six-month total profit error", "Traditional", "AI ensemble", "Hybrid"], [["Actual minus forecast, INR", F.n0(tot.traditional), F.n0(tot.ai), F.n0(tot.hybrid)], ["Average monthly profit miss (MAE), INR", F.n0(get("Profit", "MAE (INR)").traditional), F.n0(get("Profit", "MAE (INR)").ai), F.n0(get("Profit", "MAE (INR)").hybrid)]], { wrap: true })),
          h("p", { class: "note", text: "The traditional method's average monthly profit miss is almost three times the AI's. Judge accuracy by MAPE, MAE and RMSE, not by net totals." }))));
    },
  };
})();
