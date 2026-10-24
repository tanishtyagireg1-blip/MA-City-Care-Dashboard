/* Learn: concepts with live numbers, viva practice, two-minute explanation. */
(function () {
  const { D, h, F } = Core; const L = D.learn;
  Sections.learn = {
    title: "Learn",
    head() { return { h1: "The ideas behind the numbers, in plain English", p: "Concepts with this project's own figures, practice questions a professor could ask, and a two-minute summary. Hide this tab before submission by setting showLearn to false in js/config.js." }; },
    render(root) {
      /* quiz me */
      const q = h("div", { class: "card" }); const qBox = h("div"); let cur = -1;
      function ask() { let i; do { i = Math.floor(Math.random() * L.qa.length); } while (i === cur && L.qa.length > 1); cur = i; const ans = h("p", { class: "note", hidden: true, text: L.qa[i].a, style: { fontSize: "14.5px", maxWidth: "60em" } });
        qBox.replaceChildren(h("h3", { text: L.qa[i].q, style: { fontSize: "18px", margin: "8px 0 10px" } }), h("div", { class: "ctrl" }, h("button", { class: "btn", type: "button", text: "Show the model answer", on: { click: () => { ans.hidden = !ans.hidden; } } }), h("button", { class: "btn ghost", type: "button", text: "Another question", on: { click: ask } })), ans); }
      q.append(h("h2", { text: "Test yourself" }), h("p", { class: "sub", text: "Answer out loud first, then check the model answer." }), qBox); ask();
      root.append(q, h("div", { style: { height: "16px" } }));

      /* concepts */
      const wrap = h("div"); const search = h("input", { type: "search", placeholder: "Filter concepts, for example margin or variance", "aria-label": "Filter concepts" });
      function paint() { const t = search.value.trim().toLowerCase(); wrap.replaceChildren(...L.concepts.filter((c) => !t || (c.name + " " + c.plain + " " + c.formula).toLowerCase().includes(t)).map((c) => h("div", { class: "concept" }, h("div", null, h("h3", { text: c.name }), h("span", { class: "f", text: c.formula })), h("div", null, h("p", { text: c.plain, style: { margin: "0 0 4px", color: "var(--ink2)" } }), h("p", { class: "live", html: "<b>In this project:</b> " + c.number }))))); if (!wrap.children.length) wrap.append(h("p", { class: "note", text: "No concept matches that filter. Clear it to see all " + L.concepts.length + "." })); }
      search.addEventListener("input", paint);
      root.append(h("div", { class: "card" }, h("h2", { text: "Core concepts" }), h("p", { class: "sub", text: "Each card shows the formula and the figure it produces here." }), h("div", { class: "ctrl" }, search), wrap)); paint();
      root.append(h("div", { style: { height: "16px" } }));

      /* Q&A */
      const qa = h("div"); const qs = h("input", { type: "search", placeholder: "Search the questions", "aria-label": "Search questions" });
      function paintQA() { const t = qs.value.trim().toLowerCase(); qa.replaceChildren(...L.qa.filter((x) => !t || (x.q + " " + x.a).toLowerCase().includes(t)).map((x) => h("details", { class: "qa" }, h("summary", { text: x.q }), h("p", { text: x.a })))); }
      qs.addEventListener("input", paintQA);
      root.append(h("div", { class: "card" }, h("h2", { text: "Viva practice" }), h("p", { class: "sub", text: "Thirteen questions a professor could ask, with model answers." }), h("div", { class: "ctrl" }, qs), qa), h("div", { style: { height: "16px" } })); paintQA();
      root.append(h("div", { class: "callout" }, h("h3", { text: "The project in two minutes" }), h("p", { text: L.script })));
    },
  };
})();
