/* Variance analysis: static vs flexible budget, both budget bases. */
(function () {
  const { D, h, F, M, col, alpha, card, baseOpts, tbl, seg, kpi, fu, waterfall } = Core;
  const V = D.variance;
  Sections.variance = {
    title: "Variance analysis",
    head() { return { h1: "Restating the budget at actual sales shows that the misses were about demand, not cost control", p: "The static budget fixes sales in advance. The flexible budget restates it at the sales that actually happened, which splits the profit gap into a sales effect and two cost effects. F means favourable to profit, U means unfavourable." }; },
    render(root) {
      const st = { b: "traditional" };
      const kp = h("div", { class: "kpis" });
      const bs = seg([{ v: "traditional", label: "Traditional budget" }, { v: "ai", label: "AI budget" }], st.b, (v) => { st.b = v; paint(); }, "Budget basis");
      const wf = card({ title: "From budgeted to actual profit, Apr to Sep 2026", height: 320, legend: false, file: "variance-bridge", controls: [bs],
        sub: "Six months in total. Green steps raised profit, red steps lowered it." });
      const mc = card({ title: "Variance by month", height: 320, file: "variance-by-month", sub: "Each bar splits that month's profit variance. The dots show the month's net total." });
      const tb = h("div", { class: "card" });
      function paint() {
        const d = V[st.b], t = d.totals, a = d.sum_absolute;
        kp.replaceChildren(kpi("Static budget profit", "INR " + F.n0(t.static_budget_profit), "Six months, as budgeted", ""), kpi("Actual profit", "INR " + F.n0(t.actual_profit), "Six months, as it happened", ""),
          kpi("Net total variance", (t.total_variance >= 0 ? "F " : "U ") + "INR " + F.n0(Math.abs(t.total_variance)), t.total_variance >= 0 ? "Favourable overall" : "Unfavourable overall", t.total_variance >= 0 ? "good" : "bad"),
          kpi("Sales misses, absolute", "INR " + F.n0(a.sales_activity_variance), "Sum of each month's size, ignoring sign", ""), kpi("Cost misses, absolute", "INR " + F.n0(h2(d)), "Variable plus fixed, per month", ""));
        wf.draw(); mc.draw(); table();
      }
      const h2 = (d) => M.sum(d.months.map((m) => Math.abs(m.variable_cost_variance + m.fixed_cost_variance)));
      wf.draw(() => {
        const c = col(), t = V[st.b].totals;
        const w = waterfall([{ label: "Static budget profit", value: t.static_budget_profit, total: true }, { label: "Sales activity", value: t.sales_activity_variance }, { label: "Flexible budget profit", value: t.static_budget_profit + t.sales_activity_variance, total: true },
          { label: "Variable cost", value: t.variable_cost_variance }, { label: "Fixed cost", value: t.fixed_cost_variance }, { label: "Actual profit", value: t.actual_profit, total: true }], { ink: c.ink2, ai: c.good, trad: c.bad });
        const o = baseOpts({ type: "bar", mode: "nearest", intersect: true, yTitle: "INR thousand" }); o.scales.y.ticks.callback = (v) => (v / 1e3).toFixed(0); o.scales.y.beginAtZero = true; o.layout.padding.top = 22; o.scales.x.ticks = Object.assign(o.scales.x.ticks || {}, { autoSkip: false, maxRotation: 0 });
        o.plugins.tooltip.callbacks.label = (ctx) => { const i = ctx.dataIndex; return w.labels[i].includes("profit") ? "INR " + F.n0(w.data[i][1]) : (w.vals[i] >= 0 ? "F " : "U ") + "INR " + F.n0(Math.abs(w.vals[i])); };
        const rows = w.labels.map((l, i) => [l, w.labels[i].includes("profit") ? F.n0(w.data[i][1]) : F.sgn(w.vals[i], F.n0)]);
        return { type: "bar", data: { labels: w.labels.map((l) => l.split(" ").length > 2 ? [l.split(" ").slice(0, 2).join(" "), l.split(" ").slice(2).join(" ")] : l.split(" ").length === 2 ? l.split(" ") : l), datasets: [{ label: "Profit bridge", data: w.data, backgroundColor: w.bg, borderRadius: 3, maxBarThickness: 64, barText: w.labels.map((l, i) => (l.includes("profit") ? F.n0(w.data[i][1]) : F.sgn(w.vals[i], F.n0))) }] }, options: o, tableData: { head: ["Step", "INR"], rows } };
      });
      mc.draw(() => {
        const c = col(), ms = V[st.b].months; const o = baseOpts({ type: "bar", yTitle: "INR thousand" }); o.scales.y.ticks.callback = (v) => (v / 1e3).toFixed(0);
        o.scales.x.stacked = true; o.scales.y.stacked = true; const f = (v) => (v >= 0 ? "F " : "U ") + "INR " + F.n0(Math.abs(v));
        const b = (lab, key, color) => ({ type: "bar", label: lab, data: ms.map((m) => m[key]), backgroundColor: color, borderColor: c.surface, borderWidth: 1.2, stack: "v", fmt: f });
        return { type: "bar", data: { labels: ms.map((m) => F.mon(m.month)), datasets: [
          { type: "line", label: "Net total", data: ms.map((m) => m.total_variance), borderColor: "transparent", backgroundColor: c.ink, pointRadius: 5, pointHoverRadius: 7, showLine: false, fmt: f, order: 0, legendType: "dot", legendColor: c.ink },
          b("Sales activity", "sales_activity_variance", c.ai), b("Variable cost", "variable_cost_variance", c.hw), b("Fixed cost", "fixed_cost_variance", c.hyb)] }, options: o };
      });
      function table() {
        const d = V[st.b]; const num = (v) => ({ html: `<span class="fu ${v >= 0 ? "f" : "u"}">${v >= 0 ? "F" : "U"}</span> ${F.n0(Math.abs(v))}` });
        const rows = d.months.map((m) => [F.monLong(m.month), F.n0(m.actual_sales), F.n0(m.budget_sales), F.n0(m.static_budget_profit), F.n0(m.flexible_budget_profit), F.n0(m.actual_profit), num(m.sales_activity_variance), num(m.variable_cost_variance), num(m.fixed_cost_variance), num(m.total_variance)]);
        const T = d.totals; const tot = ["Net total", F.n0(M.sum(d.months.map((m) => m.actual_sales))), F.n0(M.sum(d.months.map((m) => m.budget_sales))), F.n0(T.static_budget_profit), F.n0(M.sum(d.months.map((m) => m.flexible_budget_profit))), F.n0(T.actual_profit), num(T.sales_activity_variance), num(T.variable_cost_variance), num(T.fixed_cost_variance), num(T.total_variance)]; tot._cls = "total";
        const A = d.sum_absolute; const ab = ["Sum of absolute amounts", "", "", "", "", "", F.n0(A.sales_activity_variance), F.n0(M.sum(d.months.map((m) => Math.abs(m.variable_cost_variance)))), F.n0(M.sum(d.months.map((m) => Math.abs(m.fixed_cost_variance)))), F.n0(M.sum(d.months.map((m) => Math.abs(m.total_variance))))]; ab._cls = "hl";
        tb.replaceChildren(h("h2", { text: "Variance table" }), h("p", { class: "sub", text: "INR. Variances compare actual profit with the budget; F raises profit, U lowers it. The last row ignores signs, so monthly misses cannot cancel out." }),
          h("div", { class: "tablewrap", style: { marginTop: "8px" } }, tbl(["Month", "Actual sales", "Budget sales", "Static profit", "Flexible profit", "Actual profit", "Sales activity", "Variable cost", "Fixed cost", "Total"], rows.concat([tot, ab]), { dense: true })));
      }
      root.append(kp, h("div", { class: "grid g2" }, wf.root, mc.root));
      paint();
      root.append(tb, h("div", { style: { height: "16px" } }), h("div", { class: "card" }, h("h2", { text: "How the three variances are calculated" }),
        h("div", { class: "tablewrap" }, tbl(["Variance", "Formula", "What it tells a manager"], [
          ["Sales activity", "Flexible budget profit minus static budget profit", "Profit lost or gained because sales differed from the plan, with costs flexing as they should"],
          ["Variable cost", "Flexible budget variable cost minus actual variable cost", "Whether purchasing, delivery and wastage cost more or less than the budgeted ratio at actual sales"],
          ["Fixed cost", "Budgeted fixed cost minus actual fixed cost", "Whether rent, salaries and overheads stayed within budget"],
          ["Total", "Actual profit minus static budget profit", "The sum of the three above"]], { text: true })),
        h("p", { class: "note", html: "<b>Net totals hide the story.</b> The traditional budget looks nearly on target in total (a small favourable variance) because monthly sales misses of opposite signs cancel: too high in the spring, too low in the monsoon. Switch to the AI budget to see the sales misses shrink." })));
    },
  };
})();
