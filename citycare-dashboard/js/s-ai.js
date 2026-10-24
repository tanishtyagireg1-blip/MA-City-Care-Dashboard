/* AI forecast: the two models, the ensemble weight lab, forecast table, parameters. */
(function () {
  const { D, h, F, M, col, alpha, card, baseOpts, tbl, seg, slider, kpi } = Core;
  const ser = D.series, mo = D.models, bt = mo.backtest, fc = mo.forecast;
  const idx = (k, m) => [...bt[k][m], ...fc[k][m]]; // 18 months: Apr 2026 to Sep 2027
  const HW = { s: idx("sales", "holt_winters"), v: idx("var_cost", "holt_winters"), f: idx("fixed_cost", "holt_winters") };
  const RG = { s: idx("sales", "ridge"), v: idx("var_cost", "ridge"), f: idx("fixed_cost", "ridge") };
  const rows18 = ser.slice(18); const labels = rows18.map((r) => F.mon(r.month));
  const actS = ser.slice(18, 24).map((r) => r.actual_sales); const tradS = ser.slice(18, 24).map((r) => r.traditional_sales);
  const ens = (w, k, n) => Array.from({ length: n }, (_, i) => w * HW[k][i] + (1 - w) * RG[k][i]);
  const metricArr = (src, m) => (m === "sales" ? src.s : m === "expenses" ? src.s.map((_, i) => src.v[i] + src.f[i]) : src.s.map((_, i) => src.s[i] - src.v[i] - src.f[i]));

  Sections.ai = {
    title: "AI forecast",
    head() { return { h1: "Two standard models learn the season; their average is the AI forecast", p: "Holt-Winters tracks level, trend and a 12-month season. Ridge regression fits a trend plus a pattern for each calendar month. The ensemble averages them with equal weights, fixed before testing." }; },
    render(root) {
      const info = h("div", { class: "grid g3" },
        h("div", { class: "card" }, h("h3", { text: "Holt-Winters smoothing" }), h("p", { class: "sub", text: "Keeps a running estimate of the level, a damped trend and 12 seasonal factors, and updates them as each month arrives. Strong on seasonal data with steady growth." }), h("p", { class: "note", text: "Backtest sales error: " + F.pc(D.ai_model_detail_sales[0].mape) })),
        h("div", { class: "card" }, h("h3", { text: "Ridge regression" }), h("p", { class: "sub", text: "A regression on time plus one indicator for each calendar month, fitted on the log scale so seasons scale with sales. A penalty keeps it from over-fitting 18 months." }), h("p", { class: "note", text: "Backtest sales error: " + F.pc(D.ai_model_detail_sales[1].mape) })),
        h("div", { class: "card" }, h("h3", { text: "Ensemble (the AI forecast)" }), h("p", { class: "sub", text: "The simple average of the two, for sales, variable cost and fixed cost. Averaging cancels each model's quirks. Expenses are variable plus fixed cost; profit is sales minus expenses." }), h("p", { class: "note", text: "Backtest sales error: " + F.pc(D.ai_model_detail_sales[2].mape) })));
      root.append(info);

      const st = { m: "sales", w: 0.5 };
      const mseg = seg([{ v: "sales", label: "Sales" }, { v: "expenses", label: "Expenses" }, { v: "profit", label: "Operating profit" }], st.m, (v) => { st.m = v; main.draw(); }, "Measure");
      const main = card({ title: "Backtest and forecast by model", height: 360, file: "ai-models",
        sub: "From April 2026. The first six months are the backtest, where the models had not seen the actuals. Press a legend item to compare.", controls: [mseg] });
      main.draw(() => {
        const c = col(), m = st.m; const N = 18;
        const trad = rows18.map((r) => r["traditional_" + m]); const hyb = rows18.map((r) => r["hybrid_" + m]);
        const E = { s: ens(st.w, "s", N), v: ens(st.w, "v", N), f: ens(st.w, "f", N) };
        const act = ser.slice(18).map((r) => r["actual_" + m]);
        const o = baseOpts({ yTitle: "INR lakh" }); o.plugins.regions = { items: [{ from: 0, to: 5, color: alpha(c.ink2, 0.1), label: "Backtest" }, { from: 6, to: 17, color: alpha(c.ink2, 0.045), label: "Forecast" }] };
        o.scales.y.ticks.callback = (v) => F.lk(v, m === "profit" ? 1 : 0);
        const L = (label, data, color, dash, w, extra) => Object.assign({ label, data, borderColor: color, backgroundColor: color, borderWidth: w, borderDash: dash, pointRadius: 0, pointHoverRadius: 4, tension: 0, fmt: (v) => F.lk(v) + " lakh" }, extra || {});
        return { type: "line", data: { labels, datasets: [
          L("Actual", act, c.actual, [], 2.4), L("Traditional", trad, c.trad, [6, 4], 2),
          L("Holt-Winters", metricArr(HW, m), c.hw, [3, 3], 1.8), L("Ridge regression", metricArr(RG, m), c.ridge, [8, 3, 2, 3], 1.8),
          L("AI ensemble" + (st.w === 0.5 ? "" : " (weight " + Math.round(st.w * 100) + "% Holt-Winters)"), metricArr(E, m), c.ai, [], 2.6, { legendLabel: "AI ensemble" }), L("Hybrid", hyb, c.hyb, [2, 3], 1.8)] }, options: o };
      });
      root.append(main.root);

      /* weight lab */
      const wl = h("div", { class: "card" });
      const stats = h("div", { class: "kpis", style: { gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" } });
      const curve = card({ title: "Backtest sales error by weight", height: 230, legend: false, file: "weight-curve", table: true,
        sub: "Each point is the six-month sales error if the ensemble put this share on Holt-Winters." });
      const wsl = slider({ label: "Share of the ensemble on Holt-Winters", min: 0, max: 1, step: 0.01, value: 0.5, fmt: (v) => Math.round(v * 100) + "% Holt-Winters, " + Math.round((1 - v) * 100) + "% Ridge", onInput: (v) => { st.w = v; upd(); } });
      const mapeAt = (w) => M.mape(actS, ens(w, "s", 6));
      let best = 0.5, bestV = 1; for (let i = 0; i <= 100; i++) { const v = mapeAt(i / 100); if (v < bestV) { bestV = v; best = i / 100; } }
      function upd() {
        const e = ens(st.w, "s", 6);
        stats.replaceChildren(kpi("Ensemble MAPE", F.pc(M.mape(actS, e), 2), "At this weight", ""), kpi("Ensemble MAE", "INR " + F.n0(M.mae(actS, e)), "Average miss", ""), kpi("Ensemble RMSE", "INR " + F.n0(M.rmse(actS, e)), "Large misses weigh more", ""), kpi("Traditional MAPE", F.pc(M.mape(actS, tradS), 2), "For comparison", "bad"), kpi("Forecast profit", "INR " + F.lk(M.sum(metricArr({ s: ens(st.w, "s", 18).slice(6), v: ens(st.w, "v", 18).slice(6), f: ens(st.w, "f", 18).slice(6) }, "profit"))) + " lakh", "Oct 2026 to Sep 2027", ""));
        main.draw(); curve.draw(); fillTable();
      }
      curve.draw(() => {
        const c = col(); const xs = Array.from({ length: 101 }, (_, i) => i);
        const o = baseOpts({ mode: "x", yTitle: "Sales MAPE" }); o.scales.x = { type: "linear", min: 0, max: 100, ticks: { callback: (v) => v + "%", color: c.ink2 }, grid: { display: false }, title: { display: true, text: "Weight on Holt-Winters", color: c.ink2 }, border: { color: c.axis } };
        o.scales.y.ticks.callback = (v) => F.pc(v, 1); o.plugins.crosshair = { on: false };
        o.plugins.vlines = { items: [{ value: 50, color: c.ink2, dash: [4, 4], label: "Equal weights (used)", row: 0 }, { value: st.w * 100, color: c.ai, label: "Your weight", row: 1 }, { value: best * 100, color: c.trad, dash: [2, 3], label: "Hindsight best", row: 2 }] };
        o.plugins.tooltip.callbacks.title = (it) => it[0].parsed.x + "% Holt-Winters";
        return { type: "line", data: { datasets: [{ label: "Sales MAPE", data: xs.map((x) => ({ x, y: mapeAt(x / 100) })), borderColor: c.ai, backgroundColor: c.ai, borderWidth: 2.2, pointRadius: 0, pointHoverRadius: 3, fmt: (v) => F.pc(v, 2) }] }, options: o };
      });
      wl.append(h("h2", { text: "Ensemble weight lab" }), h("p", { class: "sub", text: "Slide the weight and watch the error. The project used equal weights, decided before looking at the test months." }), h("div", { style: { height: "10px" } }), wsl.root, stats,
        h("p", { class: "note", html: `<b>A warning about hindsight.</b> The best weight on these six test months is ${Math.round(best * 100)}% Holt-Winters (MAPE ${F.pc(bestV, 2)}), but picking it after seeing the answers would flatter the model. Weights chosen on the test months are not a fair test; that is why equal weights were fixed in advance.` }));
      root.append(h("div", { class: "grid g12" }, wl, curve.root));

      /* forecast table */
      const tableHolder = h("div", { class: "tablewrap" });
      function fillTable() {
        const E = { s: ens(st.w, "s", 18), v: ens(st.w, "v", 18), f: ens(st.w, "f", 18) };
        const rows = rows18.slice(6).map((r, k) => { const i = k + 6; const sales = E.s[i], exp = E.v[i] + E.f[i], p = sales - exp;
          return [F.monLong(r.month), F.n0(HW.s[i]), F.n0(RG.s[i]), F.n0(sales), F.n0(r.ai_sales_lower_80), F.n0(r.ai_sales_upper_80), F.n0(exp), F.n0(p), { t: F.sgn(sales - r.traditional_sales, F.n0), cls: sales >= r.traditional_sales ? "pos" : "neg" }]; });
        const sum = (j) => M.sum(rows18.slice(6).map((r, k) => [HW.s[k + 6], RG.s[k + 6], E.s[k + 6], r.ai_sales_lower_80, r.ai_sales_upper_80, E.v[k + 6] + E.f[k + 6], E.s[k + 6] - E.v[k + 6] - E.f[k + 6], E.s[k + 6] - r.traditional_sales][j]));
        const tot = ["Total", ...[0, 1, 2].map((j) => F.n0(sum(j))), "", "", F.n0(sum(5)), F.n0(sum(6)), F.sgn(sum(7), F.n0)]; tot._cls = "total"; rows.push(tot);
        tableHolder.replaceChildren(tbl(["Month", "Holt-Winters sales", "Ridge sales", "Ensemble sales", "80% low", "80% high", "Expenses", "Operating profit", "Sales vs traditional"], rows));
      }
      root.append(h("div", { class: "card" }, h("header", null, h("div", null, h("h2", { text: "The AI budget, month by month" }), h("p", { class: "sub", text: "INR. Uses the ensemble weight chosen above (equal weights by default). The 80% range is the forecast plus or minus 1.28 times the backtest RMSE of INR 52,326." })),
        h("div", { class: "tools" }, h("button", { class: "smallbtn", type: "button", text: "Download CSV", on: { click: () => Core.download("ai_forecast.csv", Core.toCSV(["month", "holt_winters_sales", "ridge_sales", "ensemble_sales", "low80", "high80", "expenses", "profit"], rows18.slice(6).map((r, k) => { const i = k + 6, E = { s: ens(st.w, "s", 18), v: ens(st.w, "v", 18), f: ens(st.w, "f", 18) }; return [r.month, HW.s[i], RG.s[i], E.s[i], r.ai_sales_lower_80, r.ai_sales_upper_80, E.v[i] + E.f[i], E.s[i] - E.v[i] - E.f[i]]; }))) } }))), tableHolder));
      upd();

      /* parameters */
      const P = mo.params_forecast, pb = mo.params_backtest;
      const f3 = (v) => (v == null ? "–" : (+v < 0.0005 ? "0.000" : (+v).toFixed(3)));
      const pr = (name, run, o) => [name, run, f3(o.hw_params.smoothing_level), f3(o.hw_params.smoothing_trend), f3(o.hw_params.smoothing_seasonal), f3(o.hw_params.damping_trend), String(o.ridge_alpha)];
      const prow = [];
      [["Sales", "sales"], ["Variable cost", "var_cost"], ["Fixed cost", "fixed_cost"]].forEach(([n, k]) => { prow.push(pr(n, "Backtest (18 months)", pb[k])); prow.push(pr(n, "Forecast (24 months)", P[k])); });
      const pcard = h("div", { class: "card" }, h("h2", { text: "Estimated model parameters" }), h("p", { class: "sub", text: "Smoothing values for level, trend and season near zero mean the optimiser kept the starting level and seasonal factors, so Holt-Winters here behaves like a trend-and-season projection. Fixed cost, which steps up each April, gets higher weights. The Ridge penalty was chosen by leave-one-out cross-validation." }),
        h("div", { class: "tablewrap" }, tbl(["Series", "Run", "Level (alpha)", "Trend (beta)", "Season (gamma)", "Damping (phi)", "Ridge penalty"], prow)));
      root.append(pcard);
    },
  };
})();
