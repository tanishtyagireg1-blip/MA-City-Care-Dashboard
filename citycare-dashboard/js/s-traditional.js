/* Traditional method: trend line, residuals, backtest, CVP lab. */
(function () {
  const { D, h, F, M, col, alpha, card, baseOpts, tbl, seg, slider, kpi } = Core;
  const det = D.detail, ser = D.series, TP = D.trad_params;
  const sales = det.map((r) => r.total_sales); const months = ser.map((r) => F.mon(r.month));

  Sections.traditional = {
    title: "Traditional method",
    head() { return { h1: "A straight line and a cost ratio: simple, transparent, and blind to the season", p: "The traditional budget fits a trend line to sales, applies the historical variable-cost ratio, and adds fixed costs including known April increases. Then CVP analysis shows break-even and risk." }; },
    render(root) {
      const st = { win: 24 };
      const fit = () => { const n = st.win; return Object.assign(M.ols(Array.from({ length: n }, (_, i) => i + 1), sales.slice(0, n)), { n }); };
      const eqBox = h("div", { class: "kpis", style: { gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", marginBottom: "6px" } });
      const trendCard = card({ title: "Trend line through monthly sales", height: 330, file: "trend-line",
        sub: "Choose how much history the line learns from. With 18 months it forecasts the six backtest months; with all 24 it forecasts the next year.",
        controls: [seg([{ v: 24, label: "All 24 months (forecast)" }, { v: 18, label: "First 18 months (backtest)" }], st.win, (v) => { st.win = +v; trendCard.draw(); resid.draw(); paintEq(); }, "Training window")] });
      trendCard.root.insertBefore(eqBox, trendCard.legend);
      function paintEq() {
        const f = fit(); const r2 = (() => { const y = sales.slice(0, f.n), my = M.sum(y) / f.n; const ss = M.sum(y.map((v) => (v - my) ** 2)); const sr = M.sum(y.map((v, i) => (v - (f.intercept + f.slope * (i + 1))) ** 2)); return 1 - sr / ss; })();
        eqBox.replaceChildren(kpi("Slope", "INR " + F.n0(f.slope) + " a month", "Sales rise this much each month", ""), kpi("Intercept", "INR " + F.n0(f.intercept), "Trend level at month 0", ""), kpi("Sales = a + b x t", F.lk(f.intercept) + " + " + F.lk(f.slope, 3) + " t", "In INR lakh, t = month number", ""), kpi("R squared", f.n === 24 ? r2.toFixed(2) : r2.toFixed(2), "Share of variation the line explains", ""));
      }
      trendCard.draw(() => {
        const c = col(), f = fit(); const T = Array.from({ length: 36 }, (_, i) => f.intercept + f.slope * (i + 1));
        const o = baseOpts({ yTitle: "INR lakh" });
        const first = f.n; const items = [];
        if (f.n === 18) items.push({ from: 18, to: 23, color: alpha(c.ink2, 0.10), label: "Backtest" }); else items.push({ from: 24, to: 35, color: alpha(c.ink2, 0.05), label: "Forecast" });
        o.plugins.regions = { items };
        return { type: "line", data: { labels: months, datasets: [
          { label: "Actual sales", data: sales.concat(Array(12).fill(null)), borderColor: c.actual, backgroundColor: c.actual, borderWidth: 2.3, pointRadius: 0, pointHoverRadius: 4, tension: 0, fmt: (v) => F.lk(v) + " lakh" },
          { label: "Trend line", data: T, borderColor: c.trad, backgroundColor: c.trad, borderWidth: 2.2, borderDash: [6, 4], pointRadius: 0, pointHoverRadius: 4, tension: 0, fmt: (v) => F.lk(v) + " lakh" }] }, options: o };
      });
      const resid = card({ title: "What the line misses: actual minus trend", height: 330, legend: false, file: "trend-residuals",
        sub: "The bars repeat each year: above the line in the monsoon and winter, below it in spring. A straight line cannot learn this, which is the gap AI closes." });
      resid.draw(() => {
        const c = col(), f = fit(); const r = sales.map((v, i) => v - (f.intercept + f.slope * (i + 1)));
        const o = baseOpts({ type: "bar", yTitle: "INR thousand", yFmt: (v) => (v / 1e3).toFixed(0) });
        return { type: "bar", data: { labels: months.slice(0, 24), datasets: [{ label: "Actual minus trend", data: r, backgroundColor: r.map((v, i) => (i >= f.n ? alpha(c.ink2, 0.45) : v >= 0 ? c.ai : c.trad)), borderRadius: 2, fmt: (v) => "INR " + F.n0(v) }] }, options: o };
      });
      root.append(h("div", { class: "grid g21" }, trendCard.root, resid.root)); paintEq();

      /* parameter and forecast tables */
      const p = TP.fc, bt = TP.bt;
      const params = h("div", { class: "card" }, h("h2", { text: "Parameters estimated from history" }), h("p", { class: "sub", text: "Backtest columns use months 1 to 18; forecast columns use all 24." }),
        h("div", { class: "tablewrap" }, tbl(["Parameter", "Backtest", "Forecast", "How it is set"], [
          ["Sales trend slope (INR a month)", F.n0(bt.slope), F.n0(p.slope), "Least-squares line"],
          ["Sales trend intercept (INR)", F.n0(bt.intercept), F.n0(p.intercept), "Sales = a + b x t"],
          ["Variable-cost ratio", F.pc(bt.vr, 2), F.pc(p.vr, 2), "Variable cost / sales in training months"],
          ["Contribution margin ratio", F.pc(1 - bt.vr, 2), F.pc(1 - p.vr, 2), "One minus the variable-cost ratio"],
          ["Rent run-rate (INR a month)", "63,000", F.n0(p.rent), "Latest month; +5% each April (lease)"],
          ["Salaries run-rate (INR a month)", "90,100", F.n0(p.salaries), "Latest month; +6% each April (HR policy)"],
          ["Other fixed costs (INR a month)", "43,105", F.n0(p.other_fixed), "Average of the last 12 months"]], { wrap: true })));
      const rows = ser.slice(24).map((r) => { const vc = r.traditional_sales * p.vr; const fx = r.traditional_expenses - vc; return [F.monLong(r.month), F.n0(r.traditional_sales), F.n0(vc), F.n0(fx), F.n0(r.traditional_expenses), F.n0(r.traditional_profit)]; });
      const T = (i) => M.sum(ser.slice(24).map((r) => [r.traditional_sales, r.traditional_sales * p.vr, r.traditional_expenses - r.traditional_sales * p.vr, r.traditional_expenses, r.traditional_profit][i]));
      const tot = ["Total", ...[0, 1, 2, 3, 4].map((i) => F.n0(T(i)))]; tot._cls = "total"; rows.push(tot);
      const fc = h("div", { class: "card" }, h("h2", { text: "Traditional budget, Oct 2026 to Sep 2027" }), h("p", { class: "sub", text: "INR. Sales climb in a straight line, so profit barely moves with the season." }),
        h("div", { class: "tablewrap" }, tbl(["Month", "Sales", "Variable cost", "Fixed cost", "Expenses", "Operating profit"], rows)));
      root.append(h("div", { class: "grid", style: { gridTemplateColumns: "minmax(0,1fr) minmax(0,1.45fr)" } }, params, fc));

      /* backtest */
      const btRows = ser.slice(18, 24).map((r) => { const e = (r.traditional_sales - r.actual_sales) / r.actual_sales; return [F.monLong(r.month), F.n0(r.actual_sales), F.n0(r.traditional_sales), F.n0(r.traditional_sales - r.actual_sales), { t: F.sgn(e, (x) => F.pc(x)), cls: Math.abs(e) > 0.05 ? "neg" : "" }]; });
      const A = ser.slice(18, 24).map((r) => r.actual_sales), Fc = ser.slice(18, 24).map((r) => r.traditional_sales);
      const btt = ["Average error", "", "", F.n0(M.mae(A, Fc)) + " (MAE)", F.pc(M.mape(A, Fc)) + " (MAPE)"]; btt._cls = "total"; btRows.push(btt);
      const btCard = h("div", { class: "card" }, h("h2", { text: "How it did on months it had not seen" }), h("p", { class: "sub", text: "The trend line over-forecasts the spring dip (Apr to Jun) and under-forecasts the monsoon peak (Jul to Sep). Errors beyond 5% are marked in red." }),
        h("div", { class: "tablewrap" }, tbl(["Month", "Actual sales", "Trend forecast", "Forecast minus actual", "Error"], btRows)));

      /* CVP lab */
      const base = { S: D.cvp.forecast_sales, vr: p.vr, F: D.cvp.fixed_costs }; const sv = { s: 1, v: base.vr, f: 0 };
      const out = h("div", { class: "kpis", style: { gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" } });
      const sens = h("div", { class: "tablewrap" });
      const cvp = card({ title: "CVP chart", height: 320, file: "cvp-chart", sub: "Where the revenue line crosses the total cost line, profit is zero. Move the sliders to see how the break-even point shifts." });
      const sliders = [
        slider({ label: "Annual sales, against the trend forecast", min: 0.7, max: 1.3, step: 0.01, value: 1, fmt: (v) => F.pc(v, 0) + " of INR " + F.lk(base.S, 1) + " lakh", onInput: (v) => { sv.s = v; calc(); } }),
        slider({ label: "Variable-cost ratio", min: 0.72, max: 0.86, step: 0.0025, value: sv.v, fmt: (v) => F.pc(v, 2), hint: "Medicines, payment, packaging, delivery and wastage as a share of sales", onInput: (v) => { sv.v = v; calc(); } }),
        slider({ label: "Fixed costs, change", min: -0.2, max: 0.2, step: 0.01, value: 0, fmt: (v) => F.sgn(v, (x) => F.pc(x, 0)) + " on INR " + F.lk(base.F, 1) + " lakh", onInput: (v) => { sv.f = v; calc(); } }),
      ];
      const reset = h("button", { class: "btn ghost", type: "button", text: "Reset to base", on: { click: () => { sliders[0].set(1, true); sliders[1].set(base.vr, true); sliders[2].set(0, true); sv.s = 1; sv.v = base.vr; sv.f = 0; calc(); } } });
      function calc() {
        const S = base.S * sv.s, Fx = base.F * (1 + sv.f), cm = 1 - sv.v, P = S * cm - Fx, be = Fx / cm, mos = (S - be) / S, dol = P > 0 ? (S * cm) / P : Infinity;
        out.replaceChildren(kpi("Operating profit", "INR " + F.lk(P) + " lakh", P >= 0 ? "Margin " + F.pc(P / S) : "A loss", P >= 0 ? "good" : "bad"), kpi("Contribution margin", F.pc(cm, 1), "INR " + F.lk(S * cm, 1) + " lakh in total", ""),
          kpi("Break-even sales", "INR " + F.lk(be, 1) + " lakh", "INR " + F.lk(be / 12) + " lakh a month", ""), kpi("Margin of safety", F.pc(mos, 1), "Sales can fall this far before a loss", mos > 0.15 ? "good" : "bad"), kpi("Operating leverage", isFinite(dol) ? F.x(dol, 2) : "n/a", "Profit change per 1% sales change", ""));
        const rows = [-0.1, -0.05, 0, 0.05, 0.1].map((x) => { const pr = S * (1 + x) * cm - Fx; return [F.sgn(x, (q) => F.pc(q, 0)).replace("+0%", "0%").replace("-0%", "0%"), F.lk(S * (1 + x)), F.lk(pr), x === 0 ? "–" : { t: F.sgn((pr - P) / P, (q) => F.pc(q, 1)), cls: pr >= P ? "pos" : "neg" }]; });
        rows[2]._cls = "hl"; sens.replaceChildren(tbl(["Sales change", "Sales (lakh)", "Profit (lakh)", "Profit change"], rows));
        cvp.S = S; cvp.Fx = Fx; cvp.cm = cm; cvp.be = be; cvp.draw();
      }
      cvp.draw(() => {
        const c = col(), S = cvp.S || base.S, Fx = cvp.Fx != null ? cvp.Fx : base.F, cm = cvp.cm || 1 - base.vr, be = cvp.be || Fx / cm; const mx = 25000000; const xs = Array.from({ length: 41 }, (_, i) => (mx * i) / 40);
        const pt = (fn) => xs.map((x) => ({ x, y: fn(x) })); const o = baseOpts({ mode: "x", yTitle: "INR lakh" });
        o.scales.x = { type: "linear", min: 0, max: mx, title: { display: true, text: "Annual sales, INR lakh", color: c.ink2 }, ticks: { callback: (v) => F.lk(v, 0), color: c.ink2 }, grid: { display: false }, border: { color: c.axis } };
        o.plugins.vlines = { items: [{ value: be, color: c.ink, dash: [5, 4], label: "Break-even " + F.lk(be, 0), row: 0 }, { value: S, color: c.ai, label: "Planned sales " + F.lk(S, 0), row: 1 }] };
        o.plugins.tooltip.callbacks.title = (it) => "Sales INR " + F.lk(it[0].parsed.x, 1) + " lakh"; o.plugins.crosshair = { on: false };
        return { type: "line", data: { datasets: [
          { label: "Revenue", data: pt((x) => x), borderColor: c.ai, backgroundColor: c.ai, borderWidth: 2.2, pointRadius: 0, pointHoverRadius: 4, fmt: (v) => F.lk(v) + " lakh" },
          { label: "Total cost", data: pt((x) => Fx + (1 - cm) * x), borderColor: c.trad, backgroundColor: c.trad, borderWidth: 2.2, pointRadius: 0, pointHoverRadius: 4, fmt: (v) => F.lk(v) + " lakh" },
          { label: "Fixed cost", data: pt(() => Fx), borderColor: c.ink2, backgroundColor: c.ink2, borderWidth: 1.6, borderDash: [4, 4], pointRadius: 0, pointHoverRadius: 3, fmt: (v) => F.lk(v) + " lakh" }] }, options: o };
      });
      const lab = h("div", { class: "card" }, h("h2", { text: "CVP lab" }), h("p", { class: "sub", text: "Try your own sales, cost ratio and fixed-cost assumptions." }), h("div", { style: { height: "8px" } }), ...sliders.map((s) => s.root), reset, h("div", { style: { height: "14px" } }), h("h3", { text: "Sensitivity of profit to sales" }), sens);
      root.append(h("div", { class: "grid g-lab" }, lab, h("div", { class: "stack" }, out, cvp.root)), btCard);
      calc();
    },
  };
})();
