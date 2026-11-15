/* Grafik Standartlar Kılavuzu — renk kartelası, inşa ızgarası, sekme vurgusu */
(() => {
  "use strict";

  const COLORS = [
    { name: "Vandar Poel mavisi", role: "Ana renk", hex: "#064f6e", ink: "#fff" },
    { name: "Krem", role: "Zemin", hex: "#F3EEE4", ink: "#064f6e" },
    { name: "Buz", role: "Açık ton", hex: "#a7d4e4", ink: "#064f6e" },
    { name: "Ekru", role: "Destek", hex: "#c2ae93", ink: "#064f6e" },
    { name: "Menekşe mavi", role: "Koyu destek", hex: "#40456a", ink: "#fff" },
    { name: "İngiliz kırmızısı", role: "Vurgu", hex: "#d96629", ink: "#fff" },
  ];

  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const cmyk = ([r, g, b]) => {
    const R = r / 255, G = g / 255, B = b / 255;
    const k = 1 - Math.max(R, G, B);
    if (k >= 1) return [0, 0, 0, 100];
    return [(1 - R - k) / (1 - k), (1 - G - k) / (1 - k), (1 - B - k) / (1 - k), k].map((v) => Math.round(v * 100));
  };

  document.getElementById("chips").innerHTML = COLORS.map((c, i) => {
    const [r, g, b] = rgb(c.hex);
    const [C, M, Y, K] = cmyk([r, g, b]);
    return `<figure class="chip${i === 0 ? " chip--main" : ""}">
      <div class="chip-sw" style="background:${c.hex};color:${c.ink}"><span>${c.role}</span></div>
      <figcaption>
        <b>${c.name}</b>
        <dl>
          <div><dt>HEX</dt><dd>${c.hex.toUpperCase()}</dd></div>
          <div><dt>RGB</dt><dd>${r} ${g} ${b}</dd></div>
          <div><dt>CMYK</dt><dd>${C} ${M} ${Y} ${K}</dd></div>
        </dl>
      </figcaption>
    </figure>`;
  }).join("");

  // İnşa ızgarası (8 × 8 birim)
  const grid = [];
  for (let i = 0; i <= 8; i++) {
    grid.push(`<line x1="${i * 10}" y1="0" x2="${i * 10}" y2="88"/>`, `<line x1="0" y1="${i * 10}" x2="80" y2="${i * 10}"/>`);
  }
  document.getElementById("c-grid").innerHTML = grid.join("");

  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const d = new Date();
  document.getElementById("cover-date").textContent = `${months[d.getMonth()]} ${d.getFullYear()}`;

  // Görünen bölümün sekmesi öne çıkar
  const tabs = [...document.querySelectorAll(".tabs a")];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      tabs.forEach((t) => t.classList.toggle("is-on", t.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  document.querySelectorAll(".page[id]").forEach((p) => io.observe(p));
})();
