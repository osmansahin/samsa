/* Kolaj — kesik harfler, riso dağ baskısı, sürüklenebilir parçalar */
(() => {
  "use strict";

  // ── Ad: dergiden kesilmiş harfler ──
  const STYLES = [
    { f: "'Abril Fatface'", bg: "#f3eee4", c: "#111" },
    { f: "'Anton'", bg: "#d96629", c: "#fff8ec", u: true },
    { f: "'Bodoni Moda'", bg: "#111", c: "#f3eee4", it: true },
    { f: "'Special Elite'", bg: "#e8dcc0", c: "#1d1d1d" },
    { f: "'Playfair Display'", bg: "#a7d4e4", c: "#064f6e", it: true },
    { f: "'Barlow Condensed'", bg: "#064f6e", c: "#f3eee4", u: true },
    { f: "'Libre Caslon Text'", bg: "#fbe6a0", c: "#112f2c" },
  ];
  const name = document.getElementById("name");
  const text = name.textContent;
  let seed = 7;
  const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const cutLetter = (ch) => {
    const s = STYLES[Math.floor(r() * STYLES.length)];
    const rot = ((r() - 0.5) * 12).toFixed(1);
    const dy = ((r() - 0.5) * 10).toFixed(0);
    const fs = (0.85 + r() * 0.35).toFixed(2);
    return `<span class="cut" aria-hidden="true" style="--r:${rot}deg;--dy:${dy}px;--fs:${fs};font-family:${s.f};background:${s.bg};color:${s.c};${s.it ? "font-style:italic;" : ""}${s.u ? "text-transform:uppercase;" : ""}">${ch}</span>`;
  };
  name.innerHTML = text.split(" ").map((w) => `<span class="word">${[...w].map(cutLetter).join("")}</span>`).join("");

  // ── Riso dağ baskısı ──
  const M = window.SAMSA_MOUNTAIN;
  const cv = document.getElementById("print");
  function paint() {
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !M) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#f3eee4";
    g.fillRect(0, 0, W, H);
    const n = M.ridge.length;
    const ry = (x, off, amp, base) => {
      const f = ((x / W) * 220 + off) % n;
      const i = Math.floor(f), t = f - i;
      const v = M.ridge[i] * (1 - t) + M.ridge[(i + 1) % n] * t;
      return H * base - (288 - v) * amp * (H / 300);
    };
    const layer = (off, amp, base, color, dx) => {
      g.save();
      g.globalCompositeOperation = "multiply";
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 2) g.lineTo(x + dx, ry(x, off, amp, base));
      g.lineTo(W, H);
      g.fill();
      g.restore();
    };
    // güneş
    g.fillStyle = "#d96629";
    g.beginPath(); g.arc(W * 0.7, H * 0.32, H * 0.15, 0, Math.PI * 2); g.fill();
    layer(120, 0.9, 0.62, "#a7d4e4", 3);
    layer(40, 1.1, 0.78, "#c2ae93", -2);
    layer(300, 0.8, 0.95, "#064f6e", 0);
    // tram: açık noktalar
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "rgba(0,0,0,0.35)";
    for (let y = 0; y < H; y += 5) for (let x = (y / 5) % 2 ? 2.5 : 0; x < W; x += 5) {
      g.beginPath(); g.arc(x, y, 0.9, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = "source-over";
  }
  paint();
  window.addEventListener("resize", paint);

  // ── Sürükle ──
  const board = document.getElementById("board");
  let z = 50;
  const wide = window.matchMedia("(min-width: 901px)");
  board.querySelectorAll(".piece:not(.paper)").forEach((el) => {
    let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, drag = false;
    el.addEventListener("pointerdown", (e) => {
      if (!wide.matches || e.button !== 0) return;
      drag = true; moved = false;
      sx = e.clientX; sy = e.clientY;
      ox = parseFloat(el.dataset.dx || 0); oy = parseFloat(el.dataset.dy || 0);
      el.style.zIndex = ++z;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true;
      el.classList.add("is-lifted");
      el.dataset.dx = ox + dx; el.dataset.dy = oy + dy;
      el.style.translate = `${ox + dx}px ${oy + dy}px`;
    });
    const end = () => { drag = false; el.classList.remove("is-lifted"); };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("click", (e) => { if (moved) { e.preventDefault(); moved = false; } });
  });
})();
