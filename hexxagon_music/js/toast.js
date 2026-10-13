// toast.js - всплывающие уведомления (ачивки, события).

const Toast = (() => {
  let container = null;

  function ensure() {
    if (container) return container;
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = [
      "position:fixed", "top:16px", "right:16px", "z-index:100",
      "display:flex", "flex-direction:column", "gap:8px",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(container);
    return container;
  }

  function show(text, opts) {
    const c = ensure();
    const el = document.createElement("div");
    const o = opts || {};
    const bg = o.bg || "rgba(20,20,50,0.95)";
    const col = o.color || "#2ecc71";
    el.style.cssText = [
      "padding:10px 16px", "background:" + bg,
      "border:1px solid " + col, "border-left:4px solid " + col,
      "border-radius:4px", "color:#e6e6ff",
      "font-family:inherit", "font-size:13px",
      "opacity:0", "transform:translateX(20px)",
      "transition:opacity .25s, transform .25s",
      "max-width:320px",
    ].join(";");
    el.textContent = text;
    c.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateX(0)";
    });
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(20px)";
      setTimeout(() => el.remove(), 300);
    }, o.dur || 2600);
  }

  // Слушать ачивки.
  window.addEventListener("achv", (e) => {
    const id = e.detail.id;
    if (typeof Achv !== "undefined") {
      const def = Achv.DEFS.find(d => d.id === id);
      if (def) show("🏆 " + def.name, { color: "#ffe66d" });
    }
  });

  return { show };
})();