/* Business and data: profile, mix, cost structure, seasonality, quality checks, explorer. */
(function () {
  const { D, h, F, M, col, alpha, card, baseOpts, tbl, seg } = Core;
  const det = D.detail, pm = D.product_mix;
  const labels = det.map((r) => F.mon(r.month));

  Sections.data = {
    title: "Business and data",
    head() { return { h1: "A single-outlet pharmacy with thin margins and a predictable season", p: "The 24 months of data behind every forecast: what the business sells, how its costs behave, and how the numbers were checked." }; },
    render(root) {
      /* profile */
      const cat = pm.categories;
      const prof = h("div", { class: "card" }, h("h2", { text: "Business profile" }),
        h("p", { class: "sub", text: "CityCare Pharmacy is hypothetical: a neighbourhood pharmacy of about 450 sq ft in a tier-2 Indian city, with a pharmacist-in-charge, two assistants and a home-delivery executive." }),
        h("p", { text: "Customers are repeat chronic-care patients (diabetes, hypertension), walk-ins and WhatsApp delivery orders. Demand peaks in the monsoon (Jul to Sep) and winter (Dec to Jan) and softens in Mar to May. Margins are thin and stock expires, so over-ordering turns into wastage and stock-outs lose repeat customers: forecasting accuracy matters." }),
        h("div", { class: "tablewrap" }, tbl(["Category", "Share of sales", "Purchase cost", "Gross margin", "Sales growth"], [
          ["Prescription (branded)", F.pc(cat[0].mix_year2), "82% of sales", F.pc(cat[0].gross_margin_year2), F.pc(cat[0].growth)],
          ["Generic medicines", F.pc(cat[1].mix_year2), "62% of sales", F.pc(cat[1].gross_margin_year2), F.pc(cat[1].growth)],
          ["OTC and wellness", F.pc(cat[2].mix_year2), "76% of sales", F.pc(cat[2].gross_margin_year2), F.pc(cat[2].growth)],
          Object.assign(["Total", "100%", "75.6% of sales", F.pc(cat[3].gross_margin_year2), F.pc(cat[3].growth)], { _cls: "total" })], { wrap: true })),
        h("p", { class: "note", text: "Latest 12 months (Oct 2025 to Sep 2026). Growth compares with the 12 months before." }));
      const costs = h("div", { class: "card" }, h("h2", { text: "How the costs behave" }),
        h("p", { class: "sub", text: "Cost-volume-profit analysis depends on knowing which costs move with sales and which do not." }),
        h("div", { class: "tablewrap" }, tbl(["Cost", "Type", "Behaviour"], [
          ["Medicine purchase cost", "Variable", "62 to 82% of category sales"],
          ["Payment charges", "Variable", "0.6% of sales"], ["Packaging", "Variable", "0.4% of sales"],
          ["Home delivery", "Variable", "1.0% rising to 1.5% of sales"], ["Wastage and expiry", "Variable", "0.8% of sales"],
          ["Rent", "Fixed", "INR 60,000 a month, +5% each April"], ["Salaries", "Fixed (step)", "INR 85,000 a month, +6% each April"],
          ["Utilities", "Fixed", "INR 11,000, +4,000 in Apr to Jun"], ["Licence and software", "Fixed", "INR 7,500 a month"],
          ["Marketing", "Fixed", "INR 9,000 a month"], ["Depreciation", "Fixed", "INR 6,500 a month"], ["Insurance and admin", "Fixed", "About INR 8,000 a month"]], { wrap: true })));
      root.append(h("div", { class: "grid g2" }, prof, costs));

      /* sales by category */
      const st = { mix: "inr" };
      const mixCard = card({ title: "Sales by category", height: 300, sub: "Generics grow faster than prescription medicines, which lifts the blended margin.",
        controls: [seg([{ v: "inr", label: "INR lakh" }, { v: "share", label: "Share of sales" }], st.mix, (v) => { st.mix = v; mixCard.draw(); }, "Units")] });
      mixCard.draw(() => {
        const c = col(), share = st.mix === "share";
        const f = (k) => det.map((r) => (share ? r[k] / r.total_sales : r[k]));
        const mk = (lab, k, color) => ({ label: lab, data: f(k), backgroundColor: color, borderColor: c.surface, borderWidth: 1.5, stack: "s", fmt: share ? (v) => F.pc(v) : (v) => F.lk(v) + " lakh" });
        const o = baseOpts({ type: "bar", yTitle: share ? "Share of sales" : "INR lakh", yFmt: share ? (v) => F.pc(v, 0) : (v) => F.lk(v, 0), x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } }, y: { stacked: true, grid: { color: c.grid }, border: { display: false }, max: share ? 1 : undefined, ticks: { callback: share ? (v) => F.pc(v, 0) : (v) => F.lk(v, 0) }, title: { display: true, text: share ? "Share of sales" : "INR lakh", color: c.ink2 } } });
        return { type: "bar", data: { labels, datasets: [mk("Prescription (branded)", "sales_rx", c.ai), mk("Generic", "sales_generic", c.trad), mk("OTC and wellness", "sales_otc", c.hyb)] }, options: o };
      });

      /* cost structure */
      const st2 = { c: "inr" };
      const costCard = card({ title: "Where each rupee of expenses goes", height: 300, sub: "Medicine purchase cost dominates; fixed costs step up every April.",
        controls: [seg([{ v: "inr", label: "INR lakh" }, { v: "share", label: "% of sales" }], st2.c, (v) => { st2.c = v; costCard.draw(); }, "Units")] });
      costCard.draw(() => {
        const c = col(), share = st2.c === "share";
        const g = (fn) => det.map((r) => (share ? fn(r) / r.total_sales : fn(r)));
        const mk = (lab, fn, color) => ({ label: lab, data: g(fn), backgroundColor: color, borderColor: c.surface, borderWidth: 1.5, stack: "s", fmt: share ? (v) => F.pc(v) : (v) => F.lk(v) + " lakh" });
        const yf = share ? (v) => F.pc(v, 0) : (v) => F.lk(v, 0);
        const o = baseOpts({ type: "bar", x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } }, y: { stacked: true, grid: { color: c.grid }, border: { display: false }, ticks: { callback: yf }, title: { display: true, text: share ? "% of sales" : "INR lakh", color: c.ink2 } } });
        return { type: "bar", data: { labels, datasets: [
          mk("Medicine purchase cost", (r) => r.total_direct_materials, c.ai), mk("Other variable", (r) => r.total_other_variable, c.hw),
          mk("Salaries", (r) => r.salaries, c.trad), mk("Rent", (r) => r.rent, c.hyb), mk("Other fixed", (r) => r.utilities + r.licence_software + r.marketing + r.depreciation + r.insurance_misc, c.naive)] }, options: o };
      });
      root.append(h("div", { class: "grid g2" }, mixCard.root, costCard.root));

      /* seasonality and profit */
      const seasonCard = card({ title: "Seasonal index by calendar month", height: 300,
        sub: "Each month's sales divided by that year's average (1.00 means an average month). The pattern repeats across both years; the Feb to May 2026 competitor shock shows as a deeper spring dip in year 2." });
      seasonCard.draw(() => {
        const c = col(); const ms = det.slice(0, 12).map((r) => F.mon(r.month).slice(0, 3));
        const idx = (rows) => { const avg = M.sum(rows.map((r) => r.total_sales)) / 12; return rows.map((r) => r.total_sales / avg); };
        const y1 = idx(det.slice(0, 12)), y2 = idx(det.slice(12, 24)), mean = y1.map((v, i) => (v + y2[i]) / 2);
        const f2 = (v) => v.toFixed(2);
        const o = baseOpts({ yFmt: (v) => v.toFixed(2), yTitle: "Seasonal index" }); o.scales.y.ticks.callback = (v) => v.toFixed(2);
        const mk = (lab, data, color, dash, w) => ({ label: lab, data, borderColor: color, backgroundColor: color, borderWidth: w, borderDash: dash, pointRadius: 3, pointHoverRadius: 5, tension: 0, fmt: f2 });
        return { type: "line", data: { labels: ms, datasets: [mk("Oct 24 to Sep 25", y1, c.ink2, [5, 4], 1.8), mk("Oct 25 to Sep 26", y2, c.trad, [], 2), mk("Average of the two years", mean, c.ai, [], 2.6)] }, options: o };
      });
      const profCard = card({ title: "Operating profit by month", height: 300, legend: false, sub: "Grey bars are year 1, blue bars year 2. Profit follows the sales season; the thin margin means small sales misses become large profit misses." });
      profCard.draw(() => {
        const c = col();
        const o = baseOpts({ type: "bar", yTitle: "INR thousand", yFmt: (v) => (v / 1e3).toFixed(0) });
        return { type: "bar", data: { labels, datasets: [{ label: "Operating profit", data: det.map((r) => r.operating_profit), backgroundColor: det.map((r, i) => (i < 12 ? alpha(c.ink2, 0.7) : c.ai)), borderRadius: { topLeft: 3, topRight: 3 }, fmt: (v) => "INR " + F.n0(v) }] },
          options: o };
      });
      root.append(h("div", { class: "grid g2" }, seasonCard.root, profCard.root));

      /* quality checks */
      const tol = 1; const rowsOK = (fn) => det.filter(fn).length;
      const checks = [
        ["Months present (Oct 2024 to Sep 2026)", det.length === 24 ? 24 : det.length, 24],
        ["Sales equal the sum of the three categories", rowsOK((r) => Math.abs(r.total_sales - (r.sales_rx + r.sales_generic + r.sales_otc)) <= tol), 24],
        ["Variable cost equals purchase cost plus other variable costs", rowsOK((r) => Math.abs(r.total_variable_cost - (r.total_direct_materials + r.total_other_variable)) <= tol), 24],
        ["Fixed cost equals the seven fixed lines", rowsOK((r) => Math.abs(r.total_fixed_cost - (r.rent + r.salaries + r.utilities + r.licence_software + r.marketing + r.depreciation + r.insurance_misc)) <= tol), 24],
        ["Expenses equal variable plus fixed cost", rowsOK((r) => Math.abs(r.total_expenses - (r.total_variable_cost + r.total_fixed_cost)) <= tol), 24],
        ["Profit equals sales minus expenses", rowsOK((r) => Math.abs(r.operating_profit - (r.total_sales - r.total_expenses)) <= tol), 24],
        ["Contribution margin equals sales minus variable cost", rowsOK((r) => Math.abs(r.contribution_margin - (r.total_sales - r.total_variable_cost)) <= tol), 24],
        ["No negative or zero sales", rowsOK((r) => r.total_sales > 0), 24],
      ].map(([n, ok, tot]) => [n, `${ok} of ${tot}`, { html: `<span class="fu ${ok === tot ? "f" : "u"}">${ok === tot ? "Pass" : "Check"}</span>` }]);
      const qa = h("div", { class: "card" }, h("h2", { text: "Data checks, run live on the data below" }),
        h("p", { class: "sub", text: "Every row reconciles. The competitor shock (Feb to May 2026) was kept in the data because a real manager would see it too." }),
        h("div", { class: "tablewrap" }, tbl(["Check", "Months passing", "Result"], checks, { wrap: true })),
        h("div", { style: { height: "10px" } }),
        h("p", { class: "note", html: "<b>How the data were made.</b> Base sales INR 11.5 lakh a month, 0.7% monthly growth, 12-month seasonality, 2.5% random noise, a competitor shock of -6%, -5%, -4% and -2% in Feb to May 2026, a shift to generics (20% to 25% of sales) and rising delivery cost. Random seed 2026; the Python script is in the data pack." }));

      /* explorer */
      const groups = {
        sales: { head: ["Month", "Prescription", "Generic", "OTC", "Total sales"], row: (r) => [F.monLong(r.month), F.n0(r.sales_rx), F.n0(r.sales_generic), F.n0(r.sales_otc), F.n0(r.total_sales)] },
        var: { head: ["Month", "Purchase cost", "Payment", "Packaging", "Delivery", "Wastage", "Total variable"], row: (r) => [F.monLong(r.month), F.n0(r.total_direct_materials), F.n0(r.payment_charges), F.n0(r.packaging), F.n0(r.delivery), F.n0(r.wastage), F.n0(r.total_variable_cost)] },
        fixed: { head: ["Month", "Rent", "Salaries", "Utilities", "Licence", "Marketing", "Depreciation", "Insurance", "Total fixed"], row: (r) => [F.monLong(r.month), F.n0(r.rent), F.n0(r.salaries), F.n0(r.utilities), F.n0(r.licence_software), F.n0(r.marketing), F.n0(r.depreciation), F.n0(r.insurance_misc), F.n0(r.total_fixed_cost)] },
        result: { head: ["Month", "Sales", "Variable cost", "Contribution margin", "Fixed cost", "Operating profit", "Margin"], row: (r) => [F.monLong(r.month), F.n0(r.total_sales), F.n0(r.total_variable_cost), F.n0(r.contribution_margin), F.n0(r.total_fixed_cost), F.n0(r.operating_profit), F.pc(r.profit_margin)] },
      };
      const exp = h("div", { class: "card" }); const holder = h("div", { class: "tablewrap", style: { maxHeight: "480px", overflow: "auto" } }); let cur = "result";
      function paint() {
        const g = groups[cur]; const rows = det.map((r) => { const x = g.row(r); x._cls = ""; return x; });
        const y = (a, b, fn) => M.sum(det.slice(a, b).map(fn));
        const tot = (a, b, name) => { const v = (g2) => g2; return null; };
        holder.replaceChildren(tbl(g.head, rows, { sortable: true }));
      }
      const yt = h("div", { class: "tablewrap" });
      function totals() {
        const y = (a, b, fn) => M.sum(det.slice(a, b).map(fn));
        const rowFor = (name, a, b) => [name, F.n0(y(a, b, (r) => r.total_sales)), F.n0(y(a, b, (r) => r.total_variable_cost)), F.n0(y(a, b, (r) => r.contribution_margin)), F.n0(y(a, b, (r) => r.total_fixed_cost)), F.n0(y(a, b, (r) => r.operating_profit)), F.pc(y(a, b, (r) => r.operating_profit) / y(a, b, (r) => r.total_sales))];
        const r1 = rowFor("Year 1 (Oct 24 to Sep 25)", 0, 12), r2 = rowFor("Year 2 (Oct 25 to Sep 26)", 12, 24); r1._cls = "total"; r2._cls = "total";
        yt.replaceChildren(tbl(["INR", "Sales", "Variable cost", "Contribution margin", "Fixed cost", "Operating profit", "Margin"], [r1, r2]));
      }
      exp.append(h("header", null, h("div", null, h("h2", { text: "Data explorer" }), h("p", { class: "sub", text: "All 24 months. Press a column heading to sort. Amounts are in INR." })),
        h("div", { class: "tools" }, h("button", { class: "smallbtn", type: "button", text: "Download CSV", on: { click: () => Core.download("monthly_detail.csv", Core.toCSV(Object.keys(det[0]), det.map((r) => Object.values(r)))) } }))),
        h("div", { class: "ctrl" }, seg([{ v: "result", label: "Result" }, { v: "sales", label: "Sales" }, { v: "var", label: "Variable costs" }, { v: "fixed", label: "Fixed costs" }], cur, (v) => { cur = v; paint(); }, "Columns")),
        holder, h("div", { style: { height: "10px" } }), yt);
      paint(); totals();
      root.append(h("div", { class: "grid g12" }, qa, exp));
    },
  };
})();
