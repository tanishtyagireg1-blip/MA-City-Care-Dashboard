/* Navigation, theme, downloads. */
(function () {
  const { $, $$, h, D, registry, F } = Core;
  const CFG = window.CONFIG || {};
  const order = ["overview", "data", "traditional", "ai", "accuracy", "variance", "lab", "risk", "learn"].filter((id) => window.Sections[id] && (id !== "learn" || CFG.showLearn !== false));
  const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = {
    overview: svg('<path d="M3 12l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
    data: svg('<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'),
    traditional: svg('<path d="M4 20L20 5"/><path d="M4 4v16h16"/>'),
    ai: svg('<path d="M3 17l5-6 4 4 4-8 5 6"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="16" cy="7" r="1"/>'),
    accuracy: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
    variance: svg('<path d="M5 20V10"/><path d="M12 20V4"/><path d="M19 20v-7"/>'),
    lab: svg('<path d="M9 3h6"/><path d="M10 3v6L4 20h16l-6-11V3"/>'),
    risk: svg('<path d="M3 20h18"/><path d="M5 20c1-9 4-14 7-14s6 5 7 14"/>'),
    learn: svg('<path d="M4 5h7a3 3 0 013 3v12a2 2 0 00-2-2H4z"/><path d="M20 5h-7a3 3 0 00-3 3"/><path d="M20 5v13h-6"/>'),
  };
  const nav = $("#nav"), main = $("#main"), head = $("#head");
  const rendered = {}; let current = null;

  order.forEach((id) => {
    const S = window.Sections[id];
    const b = h("button", { type: "button", "data-id": id, html: ICON[id] + "<span>" + S.title + "</span>" });
    b.addEventListener("click", () => show(id, true)); nav.append(b);
    main.append(h("section", { class: "tab", id: "s-" + id, hidden: true, "aria-label": S.title }));
  });

  function show(id, push) {
    if (!window.Sections[id]) id = order[0];
    current = id; const S = window.Sections[id], sec = $("#s-" + id);
    $$("section.tab").forEach((s) => (s.hidden = s.id !== "s-" + id));
    $$("button", nav).forEach((b) => b.toggleAttribute("aria-current", b.dataset.id === id)); $$("button", nav).forEach((b) => { if (b.dataset.id === id) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    const hd = S.head();
    head.replaceChildren(h("h1", { text: hd.h1 }), hd.p ? h("p", { text: hd.p }) : null,
      h("div", { class: "badges" }, h("span", { class: "badge warn", text: "Simulated data, hypothetical business" }), h("span", { class: "badge", text: "History Oct 2024 to Sep 2026" }), h("span", { class: "badge", text: "Backtest Apr to Sep 2026" }), h("span", { class: "badge", text: "Forecast Oct 2026 to Sep 2027" })));
    if (!rendered[id]) { rendered[id] = true; S.render(sec); }
    else registry.forEach((c) => { if (c.chart && sec.contains(c.canvas)) c.chart.resize(); });
    document.title = S.title + " | " + (CFG.title || "CityCare Pharmacy");
    if (push) history.replaceState(null, "", "#" + id);
    if (push) window.scrollTo({ top: 0 });
  }

  /* theme */
  const themes = ["system", "light", "dark"]; let ti = 0;
  try { const s = localStorage.getItem("theme"); if (themes.includes(s)) ti = themes.indexOf(s); } catch (e) { }
  function applyTheme() {
    const t = themes[ti]; if (t === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t);
    $("#themeBtn").textContent = "Theme: " + t; try { localStorage.setItem("theme", t); } catch (e) { }
    registry.forEach((c) => { if (c.build && c.canvas.isConnected) c.draw(); });
  }
  $("#themeBtn").addEventListener("click", () => { ti = (ti + 1) % themes.length; applyTheme(); });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (themes[ti] === "system") applyTheme(); });

  /* downloads */
  $("#dlBtn").addEventListener("click", () => {
    const m = D.series, d = D.detail;
    Core.download("monthly_series.csv", Core.toCSV(Object.keys(m[0]), m.map((r) => Object.values(r))));
    setTimeout(() => Core.download("monthly_detail.csv", Core.toCSV(Object.keys(d[0]), d.map((r) => Object.values(r)))), 250);
    setTimeout(() => Core.download("monte_carlo_draws.csv", Core.toCSV(["draw", "annual_sales", "annual_operating_profit"], D.monte_carlo.draws_profit.map((p, i) => [i + 1, D.monte_carlo.draws_sales[i], p]))), 500);
  });

  $("#brandName").textContent = (CFG.title || "CityCare Pharmacy").split(":")[0];
  $("#railNote").textContent = (CFG.author ? CFG.author + ". " : "") + (CFG.course || "");
  $("#foot").innerHTML = "<p><strong>About this dashboard.</strong> CityCare Pharmacy is hypothetical; the 24 months of data were simulated in Python (seed 2026) with seasonality, a competitor shock and a shift to generics. Forecasts come from a trend-and-CVP method and an AI ensemble of Holt-Winters and Ridge regression, built with Claude. Results show how the methods behave, not that AI always wins. Every figure matches the companion Excel model.</p>";
  applyTheme();
  const start = (location.hash || "").slice(1);
  show(order.includes(start) ? start : order[0], false);
  window.addEventListener("hashchange", () => { const id = location.hash.slice(1); if (order.includes(id) && id !== current) show(id, false); });
})();
