/* Samsa arşivi — dosya seç, kalksın, evrak açılsın */
(() => {
  "use strict";
  const folders = [...document.querySelectorAll(".folder")];
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  document.querySelectorAll(".today").forEach((el) => { el.textContent = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; });

  folders.forEach((f) => {
    const id = "doc-" + f.dataset.doc;
    f.setAttribute("aria-controls", id);
    f.id = "tab-" + f.dataset.doc;
    document.getElementById(id).setAttribute("aria-labelledby", f.id);
  });

  function open(f, focusDoc) {
    folders.forEach((o) => {
      const on = o === f;
      o.setAttribute("aria-selected", on ? "true" : "false");
      o.tabIndex = on ? 0 : -1;
      const doc = document.getElementById("doc-" + o.dataset.doc);
      doc.hidden = !on;
      if (on) {
        doc.style.setProperty("--r", `${(Math.random() - 0.5) * 3}deg`);
        doc.classList.remove("is-in");
        void doc.offsetWidth;
        doc.classList.add("is-in");
        if (focusDoc && window.innerWidth <= 900) doc.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  folders.forEach((f, i) => {
    f.addEventListener("click", () => open(f, true));
    f.addEventListener("keydown", (e) => {
      let j = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") j = (i + 1) % folders.length;
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") j = (i - 1 + folders.length) % folders.length;
      if (e.key === "Home") j = 0;
      if (e.key === "End") j = folders.length - 1;
      if (j !== null) { e.preventDefault(); folders[j].focus(); open(folders[j]); }
    });
  });
  open(folders[0]);
})();
