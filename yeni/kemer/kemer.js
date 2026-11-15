/* Kemer — pencereden görünen dağ: saate göre gök, katmanlı sırtlar, hafif paralaks */
(() => {
  "use strict";
  const M = window.SAMSA_MOUNTAIN;
  const canvas = document.getElementById("view");
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const params = new URLSearchParams(location.search);
  const now = new Date();
  const forced = parseFloat(params.get("saat"));
  const h = Number.isNaN(forced) ? now.getHours() + now.getMinutes() / 60 : forced;

  const SKIES = {
    gece: { top: "#0e1830", bot: "#2b3d5e", far: "#34476a", mid: "#24324d", near: "#141d2e", glow: null },
    safak: { top: "#5c6f9c", bot: "#f2c39b", far: "#8f8fa8", mid: "#5d6680", near: "#2f3647", glow: "#ffd9a8" },
    gun: { top: "#7fb0d4", bot: "#e6eef0", far: "#a9bfcf", mid: "#6f8aa0", near: "#344a5c", glow: "#fff6dc" },
    aksam: { top: "#3a4778", bot: "#f19a5e", far: "#9a7c8a", mid: "#5e5268", near: "#2a2635", glow: "#ffb070" },
  };
  const phase = h < 5 || h >= 20.5 ? "gece" : h < 7.5 ? "safak" : h < 17 ? "gun" : "aksam";
  const S = SKIES[phase];

  let px = 0, py = 0, tx = 0, ty = 0;

  function ridge(off, i) {
    const n = M.ridge.length;
    const f = ((off + i) % n + n) % n;
    const k = Math.floor(f), t = f - k;
    return M.ridge[k] * (1 - t) + M.ridge[(k + 1) % n] * t;
  }

  function draw() {
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(W * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Gök
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.75);
    g.addColorStop(0, S.top);
    g.addColorStop(1, S.bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Güneş / ay
    if (phase === "gece") {
      ctx.fillStyle = "#f3eedc";
      ctx.beginPath(); ctx.arc(W * 0.7 + px * 4, H * 0.2 + py * 3, W * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 60; i++) {
        const x = ((i * 97.13) % 1) * W, y = ((i * 0.6180339 * 13.7) % 1) * H * 0.5;
        ctx.fillRect((x + i * 37) % W, y, 1.2, 1.2);
      }
    } else {
      const t = Math.max(0, Math.min(1, (h - 5.5) / 14));
      const sx = W * (0.15 + 0.7 * t) + px * 4;
      const sy = H * 0.62 - Math.sin(Math.PI * t) * H * 0.45 + py * 3;
      const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, W * 0.4);
      rg.addColorStop(0, S.glow + "cc");
      rg.addColorStop(1, S.glow + "00");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = phase === "gun" ? "#fffaf0" : "#ffcf8a";
      ctx.beginPath(); ctx.arc(sx, sy, W * 0.045, 0, Math.PI * 2); ctx.fill();
    }

    // Sırtlar: uzak → yakın
    const layers = [
      { off: 140, base: 0.58, amp: 0.55, col: S.far, par: 6 },
      { off: 260, base: 0.72, amp: 0.85, col: S.mid, par: 14 },
      { off: 30, base: 0.9, amp: 0.55, col: S.near, par: 26 },
    ];
    layers.forEach((L) => {
      ctx.fillStyle = L.col;
      ctx.beginPath();
      ctx.moveTo(0, H);
      const span = 260;
      for (let x = 0; x <= W; x += 3) {
        const i = (x / W) * span + L.off + px * L.par * 0.3;
        const r = ridge(0, i); // 185..288
        const y = H * L.base - (288 - r) * (H / 500) * L.amp + py * L.par * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      // atmosfer: alta doğru sis
      const fog = ctx.createLinearGradient(0, H * L.base - H * 0.15, 0, H);
      fog.addColorStop(0, "rgba(255,255,255,0)");
      fog.addColorStop(1, phase === "gece" ? "rgba(20,30,50,0.25)" : "rgba(255,255,255,0.12)");
      ctx.fillStyle = fog;
      ctx.fill();
    });
  }

  function loop() {
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;
    draw();
    if (Math.abs(tx - px) > 0.002 || Math.abs(ty - py) > 0.002) requestAnimationFrame(loop);
    else running = false;
  }
  let running = false;
  function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }

  if (!reduce) {
    window.addEventListener("pointermove", (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * -1;
      ty = (e.clientY / window.innerHeight - 0.5) * -1;
      kick();
    });
  }
  window.addEventListener("resize", draw);
  draw();
})();
