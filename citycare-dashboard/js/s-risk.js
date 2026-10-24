/* Risk: Monte Carlo distribution, target probability, live re-simulation. */
(function () {
  const { D, h, F, M, col, alpha, card, baseOpts, tbl, seg, slider, kpi, Engine } = Core;
  const MC = D.monte_carlo, P0 = MC.params, X = Engine.X;

  function simulate(n, seed, p) {
    const rnd = M.rng(seed); const normal = () => { let u = 0; while (u === 0) u = rnd(); const v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const S = Engine.baseSales, Fsum = M.sum(Engine.baseFixed); const profit = new Array(n), sales = new Array(n);
    for (let i = 0; i < n; i++) {
      const common = normal() * p.sd_common, vr = X.vr + normal() * p.sd_vc, fixed = Fsum * (1 + normal() * p.sd_fixed); let ss = 0, pr = 0;
      for (let m = 0; m < 12; m++) { const sm = S[m] * (1 + common) * (1 + normal() * p.sd_month); ss += sm; pr += sm * (1 - vr); }
      profit[i] = Math.round(pr - fixed); sales[i] = Math.round(ss);
    }
    return { profit, sales };
  }
  const stats = (arr) => { const s = arr.slice().sort((a, b) => a - b), n = s.length, mean = M.sum(s) / n, sd = Math.sqrt(M.sum(s.map((v) => (v - mean) ** 2)) / (n - 1)); return { s, n, mean, sd, p: (q) => M.pctile(s, q) }; };

  Sections.risk = {
    title: "Risk",
    head() { return { h1: "In 9 of 10 simulated years profit lands between INR 7.1 and 11.7 lakh, and none lost money", p: "A single forecast hides risk. The simulation shocks demand, monthly noise, variable-cost ratio and fixed costs at random, many times over. Set your own target profit to see how likely it is." }; },
    render(root) {
      const st = { src: "python", bins: 24, target: 1000000 }; let live = null;
      const par = { sd_common: P0.sd_common, sd_month: P0.sd_month, sd_vc: P0.sd_vc, sd_fixed: P0.sd_fixed }; const cfg = { n: 5000, seed: 2027 };
      const data = () => (st.src === "python" || !live ? { profit: MC.draws_profit, sales: MC.draws_sales } : live);
      const kp = h("div", { class: "kpis" });
      const tsl = slider({ label: "Target operating profit", min: 400000, max: 1500000, step: 10000, value: st.target, fmt: (v) => "INR " + F.lk(v, 2) + " lakh", hint: "Last year's actual was INR " + F.lk(X.last_year_profit) + " lakh; the base budget is INR " + F.lk(X.base_profit) + " lakh", onInput: (v) => { st.target = v; paint(); } });
      const hist = card({ title: "Distribution of next year's profit", height: 330, legend: false, file: "monte-carlo-histogram", controls: [seg([{ v: 12, label: "12 bars" }, { v: 24, label: "24 bars" }, { v: 40, label: "40 bars" }], 24, (v) => { st.bins = +v; hist.draw(); }, "Number of bars")], sub: "Each bar counts simulated years in that profit range. Bars at or above your target are dark blue." });
      const cdf = card({ title: "Probability of falling below a profit level", height: 300, legend: false, file: "monte-carlo-cdf", sub: "Read across from any profit on the bottom axis to the chance, on the left axis, of doing worse than it." });
      const sca = card({ title: "Profit against sales across the simulated years", height: 300, legend: false, file: "monte-carlo-scatter", sub: "A sample of 800 simulated years. Higher sales bring higher profit, but cost shocks widen the spread." });
      const ptab = h("div", { class: "card" });
      const srcSeg = seg([{ v: "python", label: "Python run, seed 2027, 5,000 years" }, { v: "live", label: "Run it live in this page" }], st.src, (v) => { st.src = v; if (v === "live" && !live) run(); livePanel.hidden = v !== "live"; paint(); }, "Source");

      const lsl = (k, label, min, max, step, fmt) => slider({ label, min, max, step, value: par[k], fmt, onInput: (v) => { par[k] = v; } });
      const sliders = [lsl("sd_common", "Demand level shock, standard deviation", 0, 0.15, 0.005, (v) => F.pc(v, 1)), lsl("sd_month", "Month-to-month noise, standard deviation", 0, 0.08, 0.0025, (v) => F.pc(v, 2)), lsl("sd_vc", "Variable-cost ratio shock, standard deviation", 0, 0.03, 0.0005, (v) => (v * 100).toFixed(2) + " pts"), lsl("sd_fixed", "Fixed-cost shock, standard deviation", 0, 0.1, 0.005, (v) => F.pc(v, 1))];
      const nSeg = seg([{ v: 1000, label: "1,000" }, { v: 5000, label: "5,000" }, { v: 20000, label: "20,000" }], cfg.n, (v) => { cfg.n = +v; }, "Simulated years");
      const seedIn = h("input", { type: "number", value: cfg.seed, min: 1, step: 1, "aria-label": "Random seed", style: { width: "92px" } }); seedIn.addEventListener("change", () => { cfg.seed = Math.max(1, Math.floor(+seedIn.value || 1)); });
      const runBtn = h("button", { class: "btn", type: "button", text: "Run simulation", on: { click: () => { run(); paint(); } } });
      const resetBtn = h("button", { class: "btn ghost", type: "button", text: "Reset shock sizes", on: { click: () => { ["sd_common", "sd_month", "sd_vc", "sd_fixed"].forEach((k, i) => { par[k] = P0[k]; sliders[i].set(P0[k], true); }); } } });
      const livePanel = h("div", { class: "card", hidden: true }, h("h2", { text: "Live simulation settings" }), h("p", { class: "sub", text: "The shock sizes are the assumptions behind the risk numbers. Widen them to stress-test the budget; the numbers come from a different random stream than the Python run, so they match only approximately." }), h("div", { style: { height: "8px" } }), h("div", { class: "grid g2", style: { marginBottom: 0 } }, h("div", null, sliders[0].root, sliders[1].root), h("div", null, sliders[2].root, sliders[3].root)),
        h("div", { class: "ctrl" }, h("span", { class: "t", text: "Years" }), nSeg, h("label", { class: "t", text: "Seed" }), seedIn, runBtn, resetBtn), h("p", { class: "note", id: "liveNote" }));
      function run() { const t0 = performance.now(); live = simulate(cfg.n, cfg.seed, par); const ms = Math.round(performance.now() - t0); const n = document.getElementById("liveNote"); if (n) n.textContent = `Simulated ${cfg.n.toLocaleString("en-US")} years in ${ms} ms.`; }

      hist.draw(() => {
        const c = col(), d = data(), s = stats(d.profit); const lo = Math.floor(s.s[0] / 1e4) * 1e4, hi = Math.ceil(s.s[s.n - 1] / 1e4) * 1e4, nb = st.bins, bw = (hi - lo) / nb;
        const cnt = new Array(nb).fill(0); d.profit.forEach((v) => { cnt[Math.min(nb - 1, Math.floor((v - lo) / bw))]++; });
        const ctr = cnt.map((_, i) => lo + bw * (i + 0.5)); const fx = (v) => (v - lo) / bw - 0.5;
        const o = baseOpts({ type: "bar", mode: "index", yTitle: "Simulated years" }); o.scales.y.ticks.callback = (v) => v.toLocaleString("en-US"); o.scales.x.ticks.callback = function (v) { return F.lk(ctr[v], 1); }; o.scales.x.title = { display: true, text: "Operating profit, INR lakh", color: c.ink2 };
        o.scales.x.ticks.autoSkip = true; o.scales.x.ticks.maxTicksLimit = 10;
        o.plugins.tooltip.callbacks.title = (it) => `INR ${F.lk(lo + bw * it[0].dataIndex, 2)} to ${F.lk(lo + bw * (it[0].dataIndex + 1), 2)} lakh`;
        o.plugins.vlines = { items: [{ value: fx(X.base_profit), color: c.ink2, dash: [4, 4], label: "Base budget " + F.lk(X.base_profit), row: 0 }, { value: fx(X.last_year_profit), color: c.trad, label: "Last year " + F.lk(X.last_year_profit), row: 1 }, { value: fx(st.target), color: c.good, label: "Target " + F.lk(st.target), row: 2 }] };
        return { type: "bar", data: { labels: ctr.map((v) => F.lk(v, 1)), datasets: [{ label: "Simulated years", data: cnt, backgroundColor: ctr.map((v) => (v >= st.target ? c.ai : alpha(c.ai, 0.35))), borderRadius: 2, categoryPercentage: 0.96, barPercentage: 1, fmt: (v) => v.toLocaleString("en-US") }] }, options: o,
          tableData: { head: ["Profit from (INR)", "to (INR)", "Simulated years"], rows: cnt.map((n, i) => [F.n0(lo + bw * i), F.n0(lo + bw * (i + 1)), n.toLocaleString("en-US")]) } };
      });
      cdf.draw(() => {
        const c = col(), s = stats(data().profit); const pts = Array.from({ length: 201 }, (_, i) => ({ x: s.p(i / 200), y: i / 200 }));
        const o = baseOpts({ mode: "nearest", intersect: false, yTitle: "Chance of doing worse" }); o.plugins.crosshair = { on: false };
        o.scales.x = { type: "linear", min: Math.floor(s.s[0] / 1e5) * 1e5, max: Math.ceil(s.s[s.n - 1] / 1e5) * 1e5, ticks: { callback: (v) => F.lk(v, 0), color: c.ink2 }, grid: { display: false }, border: { color: c.axis }, title: { display: true, text: "Operating profit, INR lakh", color: c.ink2 } };
        o.scales.y.min = 0; o.scales.y.max = 1; o.scales.y.ticks.callback = (v) => F.pc(v, 0);
        o.plugins.tooltip.callbacks.title = (it) => "Profit INR " + F.lk(it[0].parsed.x, 2) + " lakh";
        o.plugins.vlines = { items: [{ value: X.last_year_profit, color: c.trad, label: "Last year", row: 0 }, { value: st.target, color: c.good, label: "Target", row: 1 }] };
        return { type: "line", data: { datasets: [{ label: "Chance of a lower profit", data: pts, borderColor: c.ai, backgroundColor: c.ai, borderWidth: 2.4, pointRadius: 0, pointHoverRadius: 4, fmt: (v) => F.pc(v, 1) }] }, options: o };
      });
      sca.draw(() => {
        const c = col(), d = data(); const step = Math.max(1, Math.floor(d.profit.length / 800)); const pts = []; for (let i = 0; i < d.profit.length; i += step) pts.push({ x: d.sales[i], y: d.profit[i] });
        const o = baseOpts({ mode: "nearest", intersect: true, yTitle: "Operating profit, INR lakh" }); o.plugins.crosshair = { on: false };
        o.scales.x = { type: "linear", ticks: { callback: (v) => F.lk(v, 0), color: c.ink2 }, grid: { color: c.grid }, border: { color: c.axis }, title: { display: true, text: "Annual sales, INR lakh", color: c.ink2 } };
        o.scales.y.ticks.callback = (v) => F.lk(v, 1); o.plugins.tooltip.callbacks.title = () => "One simulated year"; o.plugins.tooltip.callbacks.label = (ctx) => `Sales INR ${F.lk(ctx.parsed.x)} lakh, profit INR ${F.lk(ctx.parsed.y)} lakh`;
        return { type: "scatter", data: { datasets: [{ label: "Simulated years", data: pts, backgroundColor: alpha(c.ai, 0.4), borderColor: "transparent", pointRadius: 3, pointHoverRadius: 5 }] }, options: o, tableData: { head: ["Sales (INR)", "Operating profit (INR)"], rows: pts.slice(0, 200).map((p) => [F.n0(p.x), F.n0(p.y)]) } };
      });

      function paint() {
        const d = data(), s = stats(d.profit), n = s.n; const below = (t) => d.profit.filter((v) => v < t).length / n; const atLeast = 1 - below(st.target);
        kp.replaceChildren(kpi("Chance of reaching the target", F.pc(atLeast, 0), "At least INR " + F.lk(st.target) + " lakh", atLeast >= 0.5 ? "good" : ""), kpi("Chance of beating last year", F.pc(1 - below(X.last_year_profit), 0), "Last year INR " + F.lk(X.last_year_profit) + " lakh", ""),
          kpi("Chance of a loss", F.pc(below(0), 1), "Operating profit below zero", ""), kpi("Typical year (median)", "INR " + F.lk(s.p(0.5)) + " lakh", "Mean INR " + F.lk(s.mean) + " lakh", ""), kpi("Bad year (5th percentile)", "INR " + F.lk(s.p(0.05)) + " lakh", "1 year in 20 is worse", "bad"), kpi("Good year (95th percentile)", "INR " + F.lk(s.p(0.95)) + " lakh", "1 year in 20 is better", "good"));
        hist.draw(); cdf.draw(); sca.draw();
        const rows = [["Mean", s.mean], ["Standard deviation", s.sd], ["Minimum", s.s[0]], ["5th percentile", s.p(0.05)], ["10th percentile", s.p(0.1)], ["25th percentile", s.p(0.25)], ["Median", s.p(0.5)], ["75th percentile", s.p(0.75)], ["90th percentile", s.p(0.9)], ["95th percentile", s.p(0.95)], ["Maximum", s.s[n - 1]]];
        const ps = stats(MC.draws_profit); const pyv = { Mean: ps.mean, "Standard deviation": ps.sd, Minimum: ps.s[0], "5th percentile": ps.p(0.05), "10th percentile": ps.p(0.1), "25th percentile": ps.p(0.25), Median: ps.p(0.5), "75th percentile": ps.p(0.75), "90th percentile": ps.p(0.9), "95th percentile": ps.p(0.95), Maximum: ps.s[ps.n - 1] };
        const showCmp = st.src === "live" && live;
        ptab.replaceChildren(h("h2", { text: "Profit statistics" }), h("p", { class: "sub", text: showCmp ? "INR. The live run is shown beside the Python run for reference." : "INR, from the Python run of 5,000 simulated years." }), h("div", { class: "tablewrap" }, tbl(showCmp ? ["Statistic", "This live run", "Python run"] : ["Statistic", "Operating profit (INR)"], rows.map(([k, v]) => (showCmp ? [k, F.n0(v), F.n0(pyv[k])] : [k, F.n0(v)])))),
          h("p", { class: "note", html: `<b>How to read this.</b> The base budget profit of INR ${F.lk(X.base_profit)} lakh is the middle of the distribution. The spread comes from four shocks: demand level (${F.pc(par.sd_common, 1)}), monthly noise (${F.pc(par.sd_month, 1)}), variable-cost ratio (${(par.sd_vc * 100).toFixed(2)} pts) and fixed costs (${F.pc(par.sd_fixed, 1)}), all treated as normal and independent.` }));
      }
      root.append(h("div", { class: "card" }, h("div", { class: "ctrl", style: { marginTop: 0 } }, srcSeg)), h("div", { style: { height: "16px" } }), livePanel, h("div", { style: { height: livePanel.hidden ? "0" : "16px" } }));
      root.append(kp, h("div", { class: "grid g21" }, hist.root, h("div", { class: "card" }, h("h2", { text: "Set your target" }), h("p", { class: "sub", text: "What profit does the owner need? Move the slider; the chart and chances update." }), h("div", { style: { height: "10px" } }), tsl.root, h("p", { class: "note", html: "<b>Rule of thumb.</b> A target near the base budget is reached about half the time. Targets well above it need better sales than the AI forecast." }))),
        h("div", { class: "grid g2" }, cdf.root, sca.root), ptab);
      paint();
    },
  };
})();
