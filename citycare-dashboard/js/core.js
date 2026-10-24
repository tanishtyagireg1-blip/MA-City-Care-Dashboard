/* Shared helpers: DOM, formatting, maths, chart framework, UI components. */
(function () {
  const D = window.DASH;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === false || v == null) continue;
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k === "text") e.textContent = v;
      else if (k === "style") Object.assign(e.style, v);
      else if (k === "on") for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; e.append(kid.nodeType ? kid : document.createTextNode(kid)); }
    return e;
  }

  /* ---------- formatting ---------- */
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const F = {
    n0: (x) => (x == null || isNaN(x) ? "–" : Math.round(x).toLocaleString("en-US")),
    lk: (x, d = 2) => (x == null || isNaN(x) ? "–" : (x / 1e5).toFixed(d)),
    lkU: (x, d = 2) => (x == null || isNaN(x) ? "–" : "INR " + (x / 1e5).toFixed(d) + " lakh"),
    pc: (x, d = 1) => (x == null || isNaN(x) ? "–" : (x * 100).toFixed(d) + "%"),
    sgn: (x, f) => (x > 0 ? "+" : x < 0 ? "-" : "") + f(Math.abs(x)),
    mon: (m) => MON[parseInt(m.slice(5, 7), 10) - 1] + " " + m.slice(2, 4),
    monLong: (m) => MON[parseInt(m.slice(5, 7), 10) - 1] + " " + m.slice(0, 4),
    x: (x, d = 2) => x.toFixed(d) + "x",
  };

  /* ---------- maths ---------- */
  const M = {
    ols(xs, ys) {
      const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
      let sxy = 0, sxx = 0;
      xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
      const slope = sxy / sxx; return { slope, intercept: my - slope * mx };
    },
    mae: (a, f) => a.reduce((s, v, i) => s + Math.abs(v - f[i]), 0) / a.length,
    mape: (a, f) => a.reduce((s, v, i) => s + Math.abs(v - f[i]) / Math.abs(v), 0) / a.length,
    rmse: (a, f) => Math.sqrt(a.reduce((s, v, i) => s + (v - f[i]) ** 2, 0) / a.length),
    sum: (a) => a.reduce((s, v) => s + v, 0),
    pctile(sorted, p) { const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo); },
    rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
  };

  /* ---------- theme-aware colours ---------- */
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const col = () => ({
    ink: css("--ink"), ink2: css("--ink2"), muted: css("--muted"), grid: css("--grid"), axis: css("--axis"), surface: css("--surface"), wash: css("--wash"),
    ai: css("--c-ai"), trad: css("--c-trad"), hyb: css("--c-hyb"), hw: css("--c-hw"), ridge: css("--c-ridge"), actual: css("--c-actual"), naive: css("--c-naive"),
    good: css("--good"), bad: css("--bad"),
  });
  const alpha = (hex, a) => {
    hex = hex.trim(); if (!hex.startsWith("#")) return hex;
    const v = hex.length === 4 ? hex.slice(1).split("").map((c) => c + c).join("") : hex.slice(1);
    return `rgba(${parseInt(v.slice(0, 2), 16)},${parseInt(v.slice(2, 4), 16)},${parseInt(v.slice(4, 6), 16)},${a})`;
  };
  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- chart plugins ---------- */
  const Plugins = {
    bg: { id: "bg", beforeDraw(c) { const x = c.ctx; x.save(); x.globalCompositeOperation = "destination-over"; x.fillStyle = css("--surface"); x.fillRect(0, 0, c.width, c.height); x.restore(); } },
    crosshair: {
      id: "crosshair",
      afterDatasetsDraw(chart, _a, o) {
        if (!o || !o.on) return; const act = chart.tooltip && chart.tooltip.getActiveElements();
        if (!act || !act.length) return; const x = act[0].element.x, a = chart.chartArea;
        const ctx = chart.ctx; ctx.save(); ctx.strokeStyle = css("--axis"); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(x, a.top); ctx.lineTo(x, a.bottom); ctx.stroke(); ctx.restore();
      },
    },
    regions: {
      id: "regions",
      beforeDatasetsDraw(chart, _a, o) {
        if (!o || !o.items) return; const { ctx, chartArea: a, scales: { x } } = chart; if (!x) return;
        const w = chart.data.labels.length > 1 ? x.getPixelForValue(1) - x.getPixelForValue(0) : 0;
        ctx.save();
        o.items.forEach((r) => {
          const x0 = Math.max(a.left, x.getPixelForValue(r.from) - w / 2), x1 = Math.min(a.right, x.getPixelForValue(r.to) + w / 2);
          if (x1 <= x0) return; ctx.fillStyle = r.color; ctx.fillRect(x0, a.top, x1 - x0, a.bottom - a.top);
          if (r.label) { ctx.fillStyle = css("--ink2"); ctx.font = `12px ${css("--font-body")}`; ctx.textAlign = "left"; ctx.fillText(r.label, x0 + 6, a.top + 14); }
        });
        ctx.restore();
      },
    },
    barlabels: {
      id: "barlabels",
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx; ctx.save(); ctx.font = `600 12px ${css("--font-body")}`; ctx.fillStyle = css("--ink"); ctx.textBaseline = "middle";
        chart.data.datasets.forEach((ds, di) => {
          if (!ds.barText || !chart.isDatasetVisible(di)) return; const meta = chart.getDatasetMeta(di); const horiz = chart.options.indexAxis === "y";
          meta.data.forEach((el, i) => { const t = ds.barText[i]; if (t == null || t === "") return; const p = el.getProps(["x", "y", "base"], true);
            if (horiz) { ctx.textAlign = "left"; ctx.fillText(t, Math.max(p.x, p.base) + 6, p.y); }
            else { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(t, p.x, Math.min(p.y, p.base) - 4); ctx.textBaseline = "middle"; } });
        });
        ctx.restore();
      },
    },
    vlines: {
      id: "vlines",
      afterDatasetsDraw(chart, _a, o) {
        if (!o || !o.items) return; const { ctx, chartArea: a, scales: { x } } = chart; if (!x) return;
        ctx.save(); ctx.font = `12px ${css("--font-body")}`;
        o.items.forEach((l) => {
          const px = x.getPixelForValue(l.value); if (px < a.left - 1 || px > a.right + 1) return;
          ctx.strokeStyle = l.color; ctx.lineWidth = 2; ctx.setLineDash(l.dash || []); ctx.beginPath(); ctx.moveTo(px, a.top); ctx.lineTo(px, a.bottom); ctx.stroke();
          ctx.setLineDash([]); ctx.fillStyle = css("--ink"); ctx.textAlign = px > a.left + (a.right - a.left) * 0.8 ? "right" : "left";
          ctx.fillText(l.label, px + (ctx.textAlign === "left" ? 5 : -5), a.top + 13 + (l.row || 0) * 15);
        });
        ctx.restore();
      },
    },
  };

  function applyDefaults() {
    const C = window.Chart, c = col();
    C.defaults.font.family = css("--font-body"); C.defaults.font.size = 12.5; C.defaults.color = c.ink2;
    C.defaults.borderColor = c.grid;
  }

  function baseOpts(o = {}) {
    const c = col();
    return {
      responsive: true, maintainAspectRatio: false, animation: { duration: reduce() ? 0 : 300 },
      interaction: { mode: o.mode || "index", intersect: o.intersect || false },
      layout: { padding: { top: 4, right: 8 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: c.surface, titleColor: c.ink, bodyColor: c.ink2, borderColor: c.axis, borderWidth: 1, padding: 10, boxPadding: 4, usePointStyle: true,
          titleFont: { weight: "600", size: 13 }, bodyFont: { size: 12.5 }, itemSort: (a, b) => a.datasetIndex - b.datasetIndex,
          filter: (item) => !item.dataset.noTip,
          callbacks: {
            label(ctx) {
              const ds = ctx.dataset, v = ctx.raw; const f = ds.fmt || F.n0;
              if (Array.isArray(v)) return `${ds.label}: ${f(v[0])} to ${f(v[1])}`;
              if (v && typeof v === "object" && "y" in v) return `${ds.label}: ${f(v.y)}`;
              return `${ds.label}: ${f(v)}`;
            },
          },
        },
        crosshair: { on: o.crosshair !== false && (o.type || "line") === "line" },
      },
      scales: {
        x: Object.assign({ grid: { display: false }, border: { color: c.axis }, ticks: { maxRotation: 0, autoSkip: true, color: c.ink2 } }, o.x || {}),
        y: Object.assign({ grid: { color: c.grid }, border: { display: false }, ticks: { color: c.ink2, callback: o.yFmt || ((v) => F.lk(v, 0)), maxTicksLimit: 7 },
          title: { display: !!o.yTitle, text: o.yTitle || "", color: c.ink2 } }, o.y || {}),
      },
    };
  }

  /* ---------- card with chart, legend, table view ---------- */
  const registry = [];
  function card(o) {
    const root = h("div", { class: "card" + (o.class ? " " + o.class : "") });
    const head = h("header", null, h("div", null, o.title ? h("h2", { text: o.title }) : null, o.sub ? h("p", { class: "sub", html: o.sub }) : null));
    const tools = h("div", { class: "tools" });
    head.append(tools); root.append(head);
    if (o.controls) { const ctrl = h("div", { class: "ctrl" }, o.controls); root.append(ctrl); }
    const legend = h("div", { class: "legend", "aria-label": "Chart legend, press to show or hide a series" });
    const cvWrap = h("div", { class: "cv", style: { height: (o.height || 300) + "px" } });
    const canvas = h("canvas", { role: "img", "aria-label": o.title || "chart" });
    cvWrap.append(canvas);
    const tview = h("div", { class: "tview tablewrap", hidden: true });
    const noteEl = o.note ? h("p", { class: "note", html: o.note }) : null;
    root.append(legend, cvWrap, tview); if (noteEl) root.append(noteEl);
    const api = { root, canvas, legend, tview, chart: null, hidden: new Set(), build: null, tableMode: false, noteEl, tools };
    registry.push(api);
    if (o.table !== false) {
      const tb = h("button", { class: "smallbtn", "aria-pressed": "false", type: "button", text: "Table view" });
      tb.addEventListener("click", () => { api.tableMode = !api.tableMode; tb.setAttribute("aria-pressed", api.tableMode); cvWrap.hidden = api.tableMode; legend.hidden = api.tableMode; tview.hidden = !api.tableMode; if (api.tableMode) api.renderTable(); else if (api.chart) api.chart.resize(); });
      tools.append(tb);
    }
    if (o.png !== false) {
      const pb = h("button", { class: "smallbtn", type: "button", text: "Save image" });
      pb.addEventListener("click", () => { if (!api.chart) return; const a = document.createElement("a"); a.href = api.chart.toBase64Image("image/png", 1); a.download = (o.file || (o.title || "chart").toLowerCase().replace(/[^a-z0-9]+/g, "-")) + ".png"; a.click(); });
      tools.append(pb);
    }
    const keyOf = (ds) => ds.group || ds.label;
    api.draw = function (build) {
      if (build) api.build = build;
      applyDefaults();
      const cfg = api.build(); cfg.plugins = (cfg.plugins || []).concat([Plugins.bg, Plugins.crosshair, Plugins.regions, Plugins.vlines, Plugins.barlabels]);
      cfg.data.datasets.forEach((ds) => { if (api.hidden.has(keyOf(ds))) ds.hidden = true; });
      if (api.chart) { api.chart.destroy(); api.chart = null; }
      api.cfg = cfg; api.chart = new window.Chart(canvas, cfg);
      api.renderLegend(); if (api.tableMode) api.renderTable();
      return api.chart;
    };
    api.renderLegend = function () {
      legend.replaceChildren(); const seen = new Set();
      if (o.legend === false) { legend.hidden = true; return; }
      api.cfg.data.datasets.forEach((ds) => {
        if (ds.noLegend) return; const k = keyOf(ds); if (seen.has(k)) return; seen.add(k);
        const type = ds.legendType || (ds.type === "bar" || api.cfg.type === "bar" ? "box" : ds.borderDash && ds.borderDash.length ? "dash" : "line");
        const swatch = ds.legendColor || (type === "box" ? (Array.isArray(ds.backgroundColor) ? ds.backgroundColor[0] : ds.backgroundColor) : ds.borderColor);
        const btn = h("button", { class: "chip", type: "button", "aria-pressed": api.hidden.has(k) ? "false" : "true", style: { color: swatch } },
          h("i", { class: type === "dash" ? "dash" : type === "dot" ? "dot" : type === "box" ? "box" : "" }), h("span", { text: ds.legendLabel || ds.label, style: { color: css("--ink2") } }));
        btn.addEventListener("click", () => {
          const hide = !api.hidden.has(k); if (hide) api.hidden.add(k); else api.hidden.delete(k);
          btn.setAttribute("aria-pressed", String(!hide));
          api.chart.data.datasets.forEach((d, i) => { if (keyOf(d) === k) api.chart.setDatasetVisibility(i, !hide); });
          api.chart.update();
          if (o.onLegend) o.onLegend(api);
        });
        legend.append(btn);
      });
    };
    api.renderTable = function () {
      const cfg = api.cfg; let head, rows;
      if (cfg.tableData) { head = cfg.tableData.head; rows = cfg.tableData.rows; }
      else {
        const ds = cfg.data.datasets.filter((d) => !d.noTable && !api.hidden.has(keyOf(d)));
        head = ["", ...ds.map((d) => d.legendLabel || d.label)];
        rows = cfg.data.labels.map((lab, i) => [lab, ...ds.map((d) => { const v = d.data[i]; const f = d.fmt || F.n0; if (v == null) return "–"; if (Array.isArray(v)) return f(v[1] - v[0]); if (typeof v === "object") return f(v.y); return f(v); })]);
      }
      tview.replaceChildren(tbl(head, rows));
    };
    return api;
  }

  /* ---------- table ---------- */
  function tbl(head, rows, opt = {}) {
    const t = h("table", { class: [opt.wrap ? "wrap" : "", opt.text ? "text" : "", opt.dense ? "dense" : ""].join(" ").trim() }); const th = h("thead"); const trh = h("tr");
    head.forEach((x, i) => {
      const cell = h("th", { class: "n" + (opt.sortable && i > 0 ? " sortable" : ""), text: typeof x === "object" ? x.t : x, scope: "col", title: typeof x === "object" ? x.title : null });
      if (opt.sortable) { cell.addEventListener("click", () => { const dir = cell.dataset.dir === "asc" ? "desc" : "asc"; $$("th", trh).forEach((z) => delete z.dataset.dir); cell.dataset.dir = dir; sortBy(i, dir); }); cell.tabIndex = 0; }
      trh.append(cell);
    });
    th.append(trh); t.append(th); const tb = h("tbody"); t.append(tb);
    let data = rows.slice();
    function paint() { tb.replaceChildren(...data.map((r) => { const tr = h("tr", { class: r._cls || "" }); r.forEach((c, i) => { const isO = c && typeof c === "object" && !c.nodeType; const td = h("td", { class: "n" + (isO && c.cls ? " " + c.cls : "") }); if (isO && c.html != null) td.innerHTML = c.html; else if (c && c.nodeType) td.append(c); else td.textContent = isO ? c.t : c; tr.append(td); }); return tr; })); }
    function sortBy(i, dir) { const val = (r) => { const c = r[i]; const s = typeof c === "object" && c ? (c.v != null ? c.v : c.t) : c; const n = parseFloat(String(s).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? String(s) : n; }; data = rows.slice().sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * (dir === "asc" ? 1 : -1); }); paint(); }
    paint(); return t;
  }

  /* ---------- controls ---------- */
  function seg(options, value, onChange, label) {
    const root = h("div", { class: "seg", role: "group", "aria-label": label || "" });
    function paint(v) { $$("button", root).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(v)))); }
    options.forEach((op) => { const b = h("button", { type: "button", "data-v": op.v, text: op.label, "aria-pressed": "false" }); b.addEventListener("click", () => { paint(op.v); onChange(op.v); }); root.append(b); });
    paint(value); root.set = paint; return root;
  }
  function slider(o) {
    const out = h("output", { text: o.fmt(o.value) });
    const inp = h("input", { type: "range", min: o.min, max: o.max, step: o.step, value: o.value, "aria-label": o.label });
    const root = h("div", { class: "slider" }, h("div", { class: "row" }, h("label", { text: o.label }), out), inp, o.hint ? h("div", { class: "hint", text: o.hint }) : null);
    inp.addEventListener("input", () => { out.textContent = o.fmt(+inp.value); o.onInput && o.onInput(+inp.value); });
    return { root, get: () => +inp.value, set(v, silent) { inp.value = v; out.textContent = o.fmt(+inp.value); if (!silent) o.onInput && o.onInput(+inp.value); }, inp };
  }
  function kpi(label, value, delta, tone) {
    return h("div", { class: "kpi" }, h("div", { class: "l", text: label }), h("div", { class: "v", text: value }), h("div", { class: "d " + (tone || ""), text: delta || "" }));
  }
  function fu(v, f) { return h("span", { class: "fu " + (v >= 0 ? "f" : "u") }, v >= 0 ? "▲ F" : "▼ U", " ", f ? f(Math.abs(v)) : F.n0(Math.abs(v))); }

  /* ---------- waterfall ---------- */
  function waterfall(steps, colors, fmt) {
    let run = 0; const lo = [], hi = [], bg = [], vals = [];
    steps.forEach((s) => {
      if (s.total) { run = s.value; lo.push(0); hi.push(s.value); bg.push(colors.ink); vals.push(s.value); }
      else { const a = run, b = run + s.value; lo.push(Math.min(a, b)); hi.push(Math.max(a, b)); bg.push(s.value >= 0 ? colors.ai : colors.trad); run = b; vals.push(s.value); }
    });
    return { labels: steps.map((s) => s.label), data: lo.map((l, i) => [l, hi[i]]), bg, vals, end: run };
  }

  /* ---------- downloads ---------- */
  function download(name, text, type) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type || "text/csv" })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
  function toCSV(head, rows) { const q = (x) => { x = x == null ? "" : String(x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }; return [head, ...rows].map((r) => r.map(q).join(",")).join("\n"); }

  /* ---------- the what-if engine used by Budget lab, tornado, heat map and Monte Carlo ---------- */
  const X = D.budget_drivers.exact;
  const Engine = {
    baseSales: D.budget_drivers.monthly_sales, baseFixed: D.budget_drivers.monthly_fixed, X,
    // levers: s = sales change, p = purchase cost change (share of sales), m = mix shift to generics (share), f = fixed cost change, o = other variable cost change (share of sales)
    vr: (l) => X.vr + (l.p || 0) + (l.m || 0) * (X.purchase_cost[1] - X.purchase_cost[0]) + (l.o || 0),
    year(l) {
      const vr = Engine.vr(l); const sales = Engine.baseSales.map((v) => v * (1 + (l.s || 0)));
      const fixed = Engine.baseFixed.map((v) => v * (1 + (l.f || 0)));
      const vc = sales.map((v) => v * vr); const profit = sales.map((v, i) => v - vc[i] - fixed[i]);
      const S = M.sum(sales), V = M.sum(vc), Fx = M.sum(fixed), P = S - V - Fx;
      const cm = 1 - vr, be = cm > 0 ? Fx / cm : Infinity;
      return { vr, sales, fixed, vc, profit, S, V, Fx, P, margin: P / S, be, beMonthly: be / 12, mos: (S - be) / S, dol: P > 0 ? (S * cm) / P : Infinity, cm };
    },
  };

  window.Core = { registry, D, $, $$, h, F, M, col, css, alpha, Plugins, baseOpts, card, tbl, seg, slider, kpi, fu, waterfall, download, toCSV, Engine, reduce, applyDefaults };
  window.Sections = {};
})();
