/* Samsa Postası — tarih satırı ve gazete tramıyla basılmış dağ fotoğrafı */
(() => {
  "use strict";

  // Tarih ve sayı (yılın kaçıncı günü)
  const d = new Date();
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  document.getElementById("date").textContent = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${days[d.getDay()]}`;
  const start = new Date(d.getFullYear(), 0, 0);
  const doy = Math.floor((d - start) / 86400000);
  document.getElementById("issue").textContent = `Yıl ${d.getFullYear() - 2025} · Sayı ${doy}`;

  // ── Fotoğraf ──
  const M = window.SAMSA_MOUNTAIN;
  const canvas = document.getElementById("photo");
  let mask = null;

  function loadMask() {
    if (!M || !M.maskPng) return Promise.resolve(null);
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = M.gw; c.height = M.gh;
        const g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        mask = g.getImageData(0, 0, M.gw, M.gh).data;
        res(mask);
      };
      img.onerror = () => res(null);
      img.src = M.maskPng;
    });
  }

  function hash(x, y) {
    let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
    h ^= h >>> 13;
    return ((Math.imul(h, 1274126177) >>> 0) % 1000) / 1000;
  }

  function render() {
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Panoramadan kesit: 1500 px'in 1100'ü, alt 3/5'i dağ
    const span = 1050, x0 = 220;
    const k = W / span;
    const mTop = H - (M.h - M.yTop) * k * 1.05;
    const ridgeAt = (x) => {
      const sx = x0 + x / k;
      const n = M.ridge.length;
      let f = (sx / M.w) * n; f = ((f % n) + n) % n;
      const i = Math.floor(f), t = f - i;
      return mTop + (M.ridge[i] * (1 - t) + M.ridge[(i + 1) % n] * t - M.yTop) * k * 1.05;
    };
    const density = (x, y) => {
      const r = ridgeAt(x);
      if (y < r) {
        // gök: yukarıda koyu, ufukta açık + birkaç bulut gölgesi
        const t = y / r;
        let v = 0.28 - t * 0.2;
        v += Math.max(0, Math.sin(x * 0.012 + y * 0.03) * Math.sin(x * 0.004) - 0.55) * 0.25;
        return v;
      }
      if (!mask) return 0.6;
      const sy = M.yTop + (y - mTop) / (k * 1.05);
      const sx = x0 + x / k;
      const gx = ((Math.floor((sx / M.w) * M.gw) % M.gw) + M.gw) % M.gw;
      const gy = Math.max(0, Math.min(M.gh - 1, Math.floor(((sy - M.yTop) / (M.h - M.yTop)) * M.gh)));
      const o = (gy * M.gw + gx) * 4;
      const c0 = mask[o] / 255, c1 = mask[o + 1] / 255, c2 = mask[o + 2] / 255;
      return Math.min(1, 0.12 + c0 * 0.18 + c1 * 0.38 + c2 * 0.82 + (y - r < 3 ? 0.5 : 0));
    };

    g.fillStyle = "#efe9da";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#151414";
    const pitch = Math.max(3.4, W / 220); // ~ 85 lpi hissi
    const a = Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
    const R = Math.hypot(W, H);
    g.beginPath();
    for (let v = -R; v < R; v += pitch) {
      for (let u = -R; u < R; u += pitch) {
        const x = W / 2 + u * ca - v * sa;
        const y = H / 2 + u * sa + v * ca;
        if (x < -2 || y < -2 || x > W + 2 || y > H + 2) continue;
        const dv = density(x, y);
        if (dv < 0.04) continue;
        const r = Math.min(pitch * 0.72, Math.sqrt(dv) * pitch * 0.6) * (0.9 + hash(Math.round(x), Math.round(y)) * 0.2);
        g.moveTo(x + r, y);
        g.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    g.fill();

    // Baskı kusurları: mürekkep lekesi ve silik bant
    g.globalCompositeOperation = "destination-out";
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.62, "rgba(0,0,0,0.18)");
    grad.addColorStop(0.7, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "source-over";
  }

  loadMask().then(render);
  let t;
  window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(render, 150); });
})();
