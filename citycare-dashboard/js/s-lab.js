/* Budget lab: what-if sliders, bridge, heat map, tornado, scenario table. */
(function () {
  const { D, h, F, M, col, alpha, card, baseOpts, tbl, seg, slider, kpi, waterfall, Engine } = Core;
  const labels = D.budget_drivers.monthly_label.map(F.mon);
  const defs = D.scenarios.definitions; const X = Engine.X;
  const baseY = Engine.year({});
  const short = { "Base (AI forecast)": "Base", "Upside: strong demand": "Strong demand", "Downside: second competitor": "Second competitor", "Cost squeeze": "Cost squeeze", "Generic push": "Generic push" };

  Sections.lab = {
    title: "Budget lab",
    head() { return { h1: "Change the assumptions and watch next year's profit move", p: "The lab rebuilds the FY27 budget from drivers: sales by month, medicine purchase cost by category, other variable costs and fixed costs. Start from a scenario or drag the sliders." }; },
    render(root) {
      const lv = { s: 0, p: 0, m: 0, f: 0, o: 0 };
      const sl = {
        s: slider({ label: "Sales against the AI forecast", min: -0.2, max: 0.2, step: 0.01, value: 0, fmt: (v) => F.sgn(v, (x) => F.pc(x, 0)).replace(/^[+-]0%$/, "0%"), hint: "A second competitor is about -8%; a strong monsoon about +5%", onInput: (v) => { lv.s = v; calc(true); } }),
        p: slider({ label: "Medicine purchase cost, share of sales", min: -0.02, max: 0.03, step: 0.001, value: 0, fmt: (v) => F.sgn(v * 100, (x) => x.toFixed(1)) + " pts", hint: "Supplier prices and discounts", onInput: (v) => { lv.p = v; calc(true); } }),
        m: slider({ label: "Mix shift to generics", min: -0.1, max: 0.1, step: 0.005, value: 0, fmt: (v) => F.sgn(v * 100, (x) => x.toFixed(1)) + " pts of sales", hint: "Generics cost 62% of price against 82% for branded prescriptions", onInput: (v) => { lv.m = v; calc(true); } }),
        f: slider({ label: "Fixed costs", min: -0.1, max: 0.15, step: 0.01, value: 0, fmt: (v) => F.sgn(v, (x) => F.pc(x, 0)).replace(/^[+-]0%$/, "0%"), hint: "Rent, salaries, utilities, licence, marketing", onInput: (v) => { lv.f = v; calc(true); } }),
        o: slider({ label: "Other variable costs, share of sales", min: -0.005, max: 0.01, step: 0.001, value: 0, fmt: (v) => F.sgn(v * 100, (x) => x.toFixed(1)) + " pts", hint: "Payment, packaging, delivery, wastage", onInput: (v) => { lv.o = v; calc(true); } }),
      };
      const presetBox = h("div", { class: "preset", role: "group", "aria-label": "Scenario presets" });
      const presets = defs.map((d, i) => { const b = h("button", { class: "smallbtn", type: "button", "aria-pressed": "false", text: short[d.name] || d.name, title: d.description }); b.addEventListener("click", () => { setLv({ s: d.sales_change, p: d.purchase_cost_change, m: d.mix_shift_to_generics, f: d.fixed_cost_change, o: 0 }); b.setAttribute("aria-pressed", "true"); }); presetBox.append(b); return b; });
      const desc = h("p", { class: "note", text: defs[0].description });
      function setLv(v) { Object.assign(lv, v); Object.keys(sl).forEach((k) => sl[k].set(lv[k], true)); calc(false); }
      function matchPreset() { presets.forEach((b, i) => { const d = defs[i]; const on = Math.abs(lv.s - d.sales_change) < 1e-9 && Math.abs(lv.p - d.purchase_cost_change) < 1e-9 && Math.abs(lv.m - d.mix_shift_to_generics) < 1e-9 && Math.abs(lv.f - d.fixed_cost_change) < 1e-9 && Math.abs(lv.o) < 1e-9; b.setAttribute("aria-pressed", String(on)); if (on) desc.textContent = d.description; }); if (!presets.some((b) => b.getAttribute("aria-pressed") === "true")) desc.textContent = "Your own combination of assumptions."; }
      const reset = h("button", { class: "btn ghost", type: "button", text: "Reset to base", on: { click: () => setLv({ s: 0, p: 0, m: 0, f: 0, o: 0 }) } });
      const ctl = h("div", { class: "card", style: { position: "sticky", top: "12px" } }, h("h2", { text: "Assumptions" }), h("p", { class: "sub", text: "Start from a scenario:" }), presetBox, desc, h("div", { style: { height: "8px" } }), ...Object.values(sl).map((s) => s.root), reset);

      const kp = h("div", { class: "kpis", style: { gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" } });
      const monthly = card({ title: "Profit by month: base and your scenario", height: 280, file: "lab-monthly", sub: "INR thousand." });
      const bridge = card({ title: "What moved profit", height: 280, legend: false, file: "lab-bridge", sub: "Each lever applied in turn, from the base budget to your scenario." });
      let Y = baseY;
      monthly.draw(() => { const c = col(); const o = baseOpts({ type: "bar", yTitle: "INR thousand" }); o.scales.y.ticks.callback = (v) => (v / 1e3).toFixed(0);
        return { type: "bar", data: { labels, datasets: [{ label: "Base budget", data: baseY.profit, backgroundColor: alpha(c.ink2, 0.55), borderRadius: 2, fmt: (v) => "INR " + F.n0(v) }, { label: "Your scenario", data: Y.profit, backgroundColor: c.ai, borderRadius: 2, fmt: (v) => "INR " + F.n0(v) }] }, options: o }; });
      bridge.draw(() => {
        const c = col(); const steps = [["Base profit", null]]; let prev = baseY.P; const acc = {}; const out = [{ label: "Base profit", value: baseY.P, total: true }];
        [["s", "Sales"], ["p", "Purchase cost"], ["m", "Generic mix"], ["f", "Fixed costs"], ["o", "Other variable"]].forEach(([k, n]) => { acc[k] = lv[k]; const P = Engine.year(acc).P; out.push({ label: n, value: P - prev }); prev = P; });
        out.push({ label: "Your scenario", value: Y.P, total: true });
        const w = waterfall(out, { ink: c.ink2, ai: c.good, trad: c.bad }); const o = baseOpts({ type: "bar", mode: "nearest", intersect: true, yTitle: "INR thousand" }); o.scales.y.ticks.callback = (v) => (v / 1e3).toFixed(0); o.scales.y.beginAtZero = true; o.layout.padding.top = 22; o.scales.x.ticks = Object.assign(o.scales.x.ticks || {}, { autoSkip: false, maxRotation: 0 });
        o.plugins.tooltip.callbacks.label = (ctx) => { const i = ctx.dataIndex; return out[i].total ? "INR " + F.n0(out[i].value) : F.sgn(w.vals[i], (x) => "INR " + F.n0(x)); };
        const text = out.map((s, i) => (s.total ? F.lk(s.value) : (Math.abs(s.value) < 1 ? "0" : F.sgn(s.value, (x) => F.lk(x)))));
        return { type: "bar", data: { labels: w.labels, datasets: [{ label: "Profit", data: w.data, backgroundColor: w.bg, borderRadius: 3, maxBarThickness: 56, barText: text }] }, options: o, tableData: { head: ["Step", "INR"], rows: out.map((s) => [s.label, s.total ? F.n0(s.value) : F.sgn(s.value, F.n0)]) } };
      });

      /* heat map */
      const hm = h("div", { class: "card" }); const hmGrid = h("div", { class: "tablewrap" });
      const sRows = [-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15], pCols = [-0.01, -0.005, 0, 0.005, 0.01];
      function paintHeat() {
        const c = col(); const vals = sRows.map((s) => pCols.map((p) => Engine.year({ s, p, m: lv.m, f: lv.f, o: lv.o }).P)); const ref = baseY.P; const mx = Math.max(...vals.flat().map((v) => Math.abs(v - ref)));
        const t = h("table", { class: "hm" }); t.append(h("thead", null, h("tr", null, h("th", { text: "Sales vs purchase cost" }), ...pCols.map((p) => h("th", { text: F.sgn(p * 100, (x) => x.toFixed(1)) + " pts" })))));
        const tb = h("tbody"); sRows.forEach((s, i) => { const tr = h("tr", null, h("th", { text: F.sgn(s, (x) => F.pc(x, 0)).replace(/^[+-]0%$/, "0%") + " sales" })); pCols.forEach((p, j) => { const v = vals[i][j]; const dlt = (v - ref) / mx; const bg = dlt >= 0 ? alpha(c.ai, Math.min(0.62, Math.abs(dlt) * 0.62)) : alpha(c.trad, Math.min(0.62, Math.abs(dlt) * 0.62)); const td = h("td", { text: (v < 0 ? "-" : "") + F.lk(Math.abs(v)), style: { background: bg }, title: `Sales ${F.sgn(s, (x) => F.pc(x, 0))}, purchase cost ${F.sgn(p * 100, (x) => x.toFixed(1))} pts: profit INR ${F.n0(v)}`, tabindex: "0", role: "button", "aria-label": `Set sales ${s * 100} percent and purchase cost ${p * 100} points` }); if (Math.abs(s - lv.s) < 1e-9 && Math.abs(p - lv.p) < 1e-9) td.className = "sel"; const pick = () => { lv.s = s; lv.p = p; sl.s.set(s, true); sl.p.set(p, true); calc(false); }; td.addEventListener("click", pick); td.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } }); tr.append(td); }); tb.append(tr); });
        t.append(tb); hmGrid.replaceChildren(t);
      }
      hm.append(h("h2", { text: "Profit grid: sales against purchase cost" }), h("p", { class: "sub", text: "INR lakh. Blue cells beat the base budget, orange cells fall short. Other assumptions follow your sliders. Press a cell to load it into the lab." }), hmGrid);

      /* tornado */
      const tor = card({ title: "Which assumption matters most", height: 270, file: "tornado", sub: "Effect on base-budget profit of a plausible swing in each driver, one at a time." });
      tor.draw(() => {
        const c = col(); const shocks = [["Sales volume, +/-10%", { s: -0.1 }, { s: 0.1 }], ["Medicine purchase cost, +/-1 pt", { p: 0.01 }, { p: -0.01 }], ["Generic mix, -/+5 pts", { m: -0.05 }, { m: 0.05 }], ["Fixed costs, +/-5%", { f: 0.05 }, { f: -0.05 }], ["Delivery cost, +/-0.5 pt", { o: 0.005 }, { o: -0.005 }]]
          .map(([n, a, b]) => ({ n, a: Engine.year(a).P - baseY.P, b: Engine.year(b).P - baseY.P })).sort((x, y) => Math.abs(y.a) + Math.abs(y.b) - Math.abs(x.a) - Math.abs(x.b));
        const o = baseOpts({ type: "bar", mode: "nearest", intersect: false }); o.indexAxis = "y";
        o.scales = { x: { stacked: true, grid: { color: c.grid }, border: { display: false }, ticks: { callback: (v) => F.lk(v, 1), color: c.ink2 }, title: { display: true, text: "Change in profit, INR lakh", color: c.ink2 } }, y: { stacked: true, grid: { display: false }, border: { color: c.axis }, ticks: { color: c.ink2 } } };
        const lab = shocks.map((s) => s.n.split(", "));
        return { type: "bar", data: { labels: lab, datasets: [{ label: "Adverse swing", data: shocks.map((s) => s.a), backgroundColor: c.trad, borderColor: c.surface, borderWidth: 1.5, fmt: (v) => F.sgn(v, (x) => "INR " + F.n0(x)) }, { label: "Favourable swing", data: shocks.map((s) => s.b), backgroundColor: c.ai, borderColor: c.surface, borderWidth: 1.5, fmt: (v) => F.sgn(v, (x) => "INR " + F.n0(x)) }] }, options: o };
      });

      /* scenario table */
      const scTab = h("div", { class: "card" });
      const budTab = h("div", { class: "card" });
      function paintTables() {
        const mk = (name, l, hl) => { const y = Engine.year(l); const r = [name, F.lk(y.S), F.pc(y.vr, 2), F.lk(y.P), F.pc(y.margin), { t: F.sgn(y.P - baseY.P, (x) => F.lk(x)), cls: y.P - baseY.P >= 0 ? "pos" : "neg" }, F.lk(y.beMonthly), F.pc(y.mos, 0), F.sgn(y.P / X.last_year_profit - 1, (x) => F.pc(x, 0))]; if (hl) r._cls = "hl"; return r; };
        const rows = defs.map((d) => mk(short[d.name], { s: d.sales_change, p: d.purchase_cost_change, m: d.mix_shift_to_generics, f: d.fixed_cost_change })); rows.push(mk("Your scenario", lv, true));
        scTab.replaceChildren(h("h2", { text: "Scenario comparison" }), h("p", { class: "sub", text: "INR lakh unless shown. Operating leverage here is measured on the AI-based budget; the Traditional tab's 3.4x uses the trend forecast." }), h("div", { class: "tablewrap" }, tbl(["Scenario", "Sales", "Variable-cost ratio", "Profit", "Margin", "Change vs base", "Break-even a month", "Margin of safety", "Vs last year"], rows, { dense: true })));
        const body = Y.profit.map((p, i) => [labels[i], F.n0(Y.sales[i]), F.n0(Y.vc[i]), F.n0(Y.fixed[i]), F.n0(p)]); const tot = ["Total", F.n0(Y.S), F.n0(Y.V), F.n0(Y.Fx), F.n0(Y.P)]; tot._cls = "total"; body.push(tot);
        budTab.replaceChildren(h("header", null, h("div", null, h("h2", { text: "Your scenario as a monthly budget" }), h("p", { class: "sub", text: "INR. Ready to copy into a spreadsheet." })), h("div", { class: "tools" }, h("button", { class: "smallbtn", type: "button", text: "Download CSV", on: { click: () => Core.download("my_scenario_budget.csv", Core.toCSV(["month", "sales", "variable_cost", "fixed_cost", "operating_profit"], Y.profit.map((p, i) => [D.budget_drivers.monthly_label[i], Math.round(Y.sales[i]), Math.round(Y.vc[i]), Math.round(Y.fixed[i]), Math.round(p)]))) } }))), h("div", { class: "tablewrap" }, tbl(["Month", "Sales", "Variable cost", "Fixed cost", "Operating profit"], body)));
      }

      function calc(manual) {
        Y = Engine.year(lv); const d = Y.P - baseY.P;
        kp.replaceChildren(kpi("Operating profit", "INR " + F.lk(Y.P) + " lakh", F.sgn(d, (x) => "INR " + F.lk(x)) + " lakh against base (" + F.sgn(d / baseY.P, (x) => F.pc(x, 0)) + ")", d >= 0 ? "good" : "bad"),
          kpi("Profit margin", F.pc(Y.margin), "Base " + F.pc(baseY.margin), ""), kpi("Against last year", F.sgn(Y.P / X.last_year_profit - 1, (x) => F.pc(x, 0)), "Last year INR " + F.lk(X.last_year_profit) + " lakh", Y.P >= X.last_year_profit ? "good" : "bad"),
          kpi("Break-even sales", "INR " + F.lk(Y.beMonthly) + " lakh a month", "Planned INR " + F.lk(Y.S / 12) + " lakh a month", ""), kpi("Margin of safety", F.pc(Y.mos, 0), "Operating leverage " + (isFinite(Y.dol) ? F.x(Y.dol, 1) : "n/a"), Y.mos > 0.15 ? "good" : "bad"));
        if (manual) presets.forEach((b) => b.setAttribute("aria-pressed", "false")); matchPreset();
        monthly.draw(); bridge.draw(); paintHeat(); paintTables();
      }
      root.append(h("div", { class: "grid g-lab" }, ctl, h("div", { class: "stack" }, kp, h("div", { class: "grid g2", style: { marginBottom: 0 } }, monthly.root, bridge.root), hm)));
      root.append(h("div", { class: "grid g12", style: { marginTop: "16px" } }, tor.root, scTab), budTab);
      calc(false);
    },
  };
})();
