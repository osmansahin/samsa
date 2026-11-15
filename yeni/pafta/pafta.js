/* ============================================================
   Samsa paftası — 1:25 000 topografik harita
   Yükseklik alanı → eş yükselti eğrileri (marching squares),
   dereler (priority-flood + akış birikimi), göller, orman,
   eğime göre en ucuz patika (Dijkstra), patika kesiti.
   Harita 8 × 6 km; ızgara 25 m.
   ============================================================ */
(() => {
  "use strict";

  const KW = 8, KH = 6;            // km
  const GW = 321, GH = 241;        // ızgara düğümleri
  const DX = KW / (GW - 1);        // km / hücre
  const E0 = 566, N0 = 4547;       // UTM km (sol üst)

  // ── Gürültü ──
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(4128);
  const PERM = new Float32Array(512 * 512).map(() => rnd());
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const at = (i, j) => PERM[((j & 511) << 9) | (i & 511)];
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct = 5) {
    let s = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f + 31.7 * i, y * f - 17.3 * i); f *= 2.03; amp *= 0.5; }
    return s;
  }
  function ridged(x, y, oct = 5) {
    let s = 0, amp = 0.55, f = 1, w = 1;
    for (let i = 0; i < oct; i++) {
      let n = 1 - Math.abs(vnoise(x * f + 11.1 * i, y * f + 5.3 * i) * 2 - 1);
      n = n * n * w;
      w = Math.min(1, n * 1.6);
      s += n * amp; f *= 2.1; amp *= 0.5;
    }
    return s;
  }
  const g = (x, y, cx, cy, s) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s));
  const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  // ── Yerler (bağlantılar) ──
  const PLACES = [
    { id: "blog", kind: "summit", name: "Blog Tepesi", x: 5.95, y: 1.45, href: "https://blog.sahinosman.com", what: "blog.sahinosman.com" },
    { id: "vsco", kind: "view", name: "VSCO Seyir Tepesi", x: 2.25, y: 1.2, href: "https://vsco.co/samsaninsirtinayapisanelma/", what: "fotoğraflar" },
    { id: "youtube", kind: "plateau", name: "YouTube Yaylası", x: 4.05, y: 2.75, href: "https://www.youtube.com/user/sahinosman58", what: "sahinosman58" },
    { id: "github", kind: "mine", name: "GitHub Maden Ocağı", x: 6.75, y: 3.5, href: "https://github.com/osmansahin", what: "osmansahin" },
    { id: "pinterest", kind: "forest", name: "Pinterest Korusu", x: 2.05, y: 3.65, href: "https://tr.pinterest.com/osuranboga/", what: "osuranboga" },
    { id: "tezgah", kind: "village", name: "Tezgâh", x: 1.05, y: 5.05, href: "https://www.youtube.com/@Tezgah-b", what: "@Tezgah-b" },
    { id: "eposta", kind: "town", name: "Samsa", x: 5.0, y: 5.15, href: "mailto:sahinosman.58@gmail.com?Subject=Merhabaa", what: "PTT · e-posta" },
  ];
  const P = Object.fromEntries(PLACES.map((p) => [p.id, p]));

  // ── Yükseklik alanı ──
  const H = new Float32Array(GW * GH);
  function heightAt(x, y) {
    let h = 900
      + 1700 * g(x, y, 5.95, 1.45, 1.45)
      + 1050 * g(x, y, 2.25, 1.2, 1.05)
      + 650 * g(x, y, 4.05, 2.75, 1.3)
      + 620 * g(x, y, 6.9, 3.3, 1.0)
      + 380 * g(x, y, 0.4, 2.6, 1.2)
      - 120 * y;
    const relief = 0.35 + 0.65 * smooth(960, 2160, h);
    h += 520 * (ridged(x * 0.62 + 3, y * 0.62 + 7) - 0.32) * relief;
    h += 90 * (fbm(x * 1.7, y * 1.7) - 0.5);
    // Yayla: düzlük
    const wy = smooth(0.95, 0.35, Math.hypot(x - 4.05, y - 2.75));
    h = h * (1 - wy * 0.85) + 1900 * wy * 0.85;
    return h;
  }
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) H[j * GW + i] = heightAt(i * DX, j * DX);
  const idx = (x, y) => Math.round(y / DX) * GW + Math.round(x / DX);
  const hAt = (x, y) => {
    const fx = Math.max(0, Math.min(GW - 1.001, x / DX)), fy = Math.max(0, Math.min(GH - 1.001, y / DX));
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const a = H[j * GW + i], b = H[j * GW + i + 1], c = H[(j + 1) * GW + i], d = H[(j + 1) * GW + i + 1];
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };

  // Zirveye tam oturt: yerel en yüksek nokta
  for (const p of PLACES.filter((q) => q.kind === "summit" || q.kind === "view")) {
    let best = -1, bi = 0, bj = 0;
    const ci = Math.round(p.x / DX), cj = Math.round(p.y / DX);
    for (let j = cj - 14; j <= cj + 14; j++) for (let i = ci - 14; i <= ci + 14; i++) {
      const v = H[j * GW + i];
      if (v > best) { best = v; bi = i; bj = j; }
    }
    p.x = bi * DX; p.y = bj * DX;
  }
  // Köyler vadide kurulur: çevredeki en alçak, göl olmayan nokta
  for (const p of PLACES.filter((q) => q.kind === "village" || q.kind === "town")) {
    let best = Infinity, bi = 0, bj = 0;
    const ci = Math.round(p.x / DX), cj = Math.round(p.y / DX);
    for (let j = cj - 20; j <= cj + 20; j++) for (let i = ci - 20; i <= ci + 20; i++) {
      if (i < 8 || j < 8 || i > GW - 9 || j > GH - 9) continue;
      const v = H[j * GW + i] + Math.hypot(i - ci, j - cj) * 4;
      if (v < best) { best = v; bi = i; bj = j; }
    }
    p.x = bi * DX; p.y = bj * DX;
  }
  PLACES.forEach((p) => { p.h = Math.round(hAt(p.x, p.y)); });

  // ── Küçük ikili yığın ──
  class Heap {
    constructor() { this.k = []; this.v = []; }
    push(key, val) {
      const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
      while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= k[i]) break; [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]]; i = p; }
    }
    pop() {
      const k = this.k, v = this.v; const top = v[0]; const lk = k.pop(), lv = v.pop();
      if (k.length) {
        k[0] = lk; v[0] = lv; let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < k.length && k[l] < k[m]) m = l;
          if (r < k.length && k[r] < k[m]) m = r;
          if (m === i) break;
          [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]]; i = m;
        }
      }
      return top;
    }
    get size() { return this.k.length; }
  }
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  // ── Hidroloji: priority-flood → alıcı hücre, birikim, göller ──
  const F = new Float32Array(H);
  const recv = new Int32Array(GW * GH).fill(-1);
  const order = [];
  (() => {
    const closed = new Uint8Array(GW * GH);
    const heap = new Heap();
    for (let i = 0; i < GW; i++) for (const j of [0, GH - 1]) { const c = j * GW + i; closed[c] = 1; heap.push(H[c], c); }
    for (let j = 1; j < GH - 1; j++) for (const i of [0, GW - 1]) { const c = j * GW + i; closed[c] = 1; heap.push(H[c], c); }
    while (heap.size) {
      const c = heap.pop();
      order.push(c);
      const ci = c % GW, cj = (c / GW) | 0;
      for (const [di, dj] of NB) {
        const ni = ci + di, nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
        const n = nj * GW + ni;
        if (closed[n]) continue;
        closed[n] = 1;
        F[n] = Math.max(H[n], F[c] + 0.0005);
        recv[n] = c;
        heap.push(F[n], n);
      }
    }
  })();
  const ACC = new Float32Array(GW * GH).fill(1);
  for (let k = order.length - 1; k >= 0; k--) { const c = order[k]; if (recv[c] >= 0) ACC[recv[c]] += ACC[c]; }

  // ── Orman alanı ──
  const forestAt = (x, y, h) => {
    if (h > 2080 || h < 300) return false;
    const n = fbm(x * 1.15 + 40, y * 1.15 + 9, 4);
    const pin = g(x, y, 2.05, 3.65, 0.9) * 0.22;
    return n + pin > 0.52 + smooth(1760, 2080, h) * 0.2;
  };

  // ── Patikalar: eğim maliyetli Dijkstra ──
  function route(a, b) {
    const start = idx(a.x, a.y), goal = idx(b.x, b.y);
    const dist = new Float32Array(GW * GH).fill(Infinity);
    const prev = new Int32Array(GW * GH).fill(-1);
    const heap = new Heap();
    dist[start] = 0; heap.push(0, start);
    while (heap.size) {
      const c = heap.pop();
      if (c === goal) break;
      const ci = c % GW, cj = (c / GW) | 0;
      for (const [di, dj] of NB) {
        const ni = ci + di, nj = cj + dj;
        if (ni < 1 || nj < 1 || ni >= GW - 1 || nj >= GH - 1) continue;
        const n = nj * GW + ni;
        const run = Math.hypot(di, dj) * DX * 1000;
        const grade = Math.abs(H[n] - H[c]) / run;
        const wet = F[n] - H[n] > 3 ? 40 : 0;
        const w = run * (1 + grade * grade * 90 + (grade > 0.35 ? 30 : 0) + wet);
        const nd = dist[c] + w;
        if (nd < dist[n]) { dist[n] = nd; prev[n] = c; heap.push(nd, n); }
      }
    }
    const pts = [];
    for (let c = goal; c !== -1; c = prev[c]) pts.push([(c % GW) * DX, ((c / GW) | 0) * DX]);
    pts.reverse();
    // sadeleştir + Chaikin yumuşatma
    let s = pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1);
    for (let it = 0; it < 2; it++) {
      const o = [s[0]];
      for (let i = 0; i < s.length - 1; i++) {
        const [x0, y0] = s[i], [x1, y1] = s[i + 1];
        o.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25], [x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]);
      }
      o.push(s[s.length - 1]);
      s = o;
    }
    return s;
  }
  const ROADS = [
    { kind: "road", pts: route(P.eposta, P.tezgah) },
    { kind: "path", pts: route(P.eposta, P.youtube), main: true },
    { kind: "path", pts: route(P.youtube, P.blog), main: true },
    { kind: "path", pts: route(P.youtube, P.vsco) },
    { kind: "path", pts: route(P.eposta, P.github) },
  ];

  // ── Çizim ──
  const face = document.getElementById("face");
  const cT = document.getElementById("terrain");
  const cC = document.getElementById("contours");
  const svg = document.getElementById("overlay");
  const COL = {
    paper: [247, 244, 234],
    forest: [214, 230, 196],
    lake: [170, 211, 236],
    contour: "#b06a33",
    water: "#2a78b4",
  };

  function drawTerrain(W, Hh, dpr) {
    cT.width = Math.round(W * dpr); cT.height = Math.round(Hh * dpr);
    const ctx = cT.getContext("2d");
    const img = ctx.createImageData(cT.width, cT.height);
    const d = img.data;
    const sx = KW / cT.width, sy = KH / cT.height;
    const L = [-0.62, -0.62, 0.48]; // kuzeybatı ışığı
    for (let py = 0; py < cT.height; py++) {
      for (let px = 0; px < cT.width; px++) {
        const x = px * sx, y = py * sy;
        const fx = Math.min(GW - 2, x / DX), fy = Math.min(GH - 2, y / DX);
        const i = Math.floor(fx), j = Math.floor(fy);
        const c = j * GW + i;
        const h = hAt(x, y);
        let r = COL.paper[0], gg = COL.paper[1], b = COL.paper[2];
        const lake = F[c] - H[c] > 3.5 && F[c + GW + 1] - H[c + GW + 1] > 3.5;
        if (lake) { [r, gg, b] = COL.lake; }
        else if (forestAt(x, y, h)) { [r, gg, b] = COL.forest; }
        // tepe gölgelendirme (çok hafif)
        const dzx = (H[c + 1] - H[c]) / (DX * 1000), dzy = (H[c + GW] - H[c]) / (DX * 1000);
        const nl = Math.hypot(dzx, dzy, 1);
        const shade = (-dzx * L[0] - dzy * L[1] + L[2]) / nl / 1.0;
        const k = lake ? 1 : Math.max(0.78, Math.min(1.04, 0.62 + shade * 0.62));
        const o = (py * cT.width + px) * 4;
        d[o] = Math.min(255, r * k); d[o + 1] = Math.min(255, gg * k); d[o + 2] = Math.min(255, b * k * 1.01); d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.setTransform(dpr * W / KW, 0, 0, dpr * Hh / KH, 0, 0);
    const pxk = KW / W; // km / css px

    // Ağaç işaretleri
    const tr = mulberry32(77);
    ctx.fillStyle = "rgba(96,140,72,0.55)";
    for (let y = 0.05; y < KH; y += 15 * pxk) {
      for (let x = 0.05; x < KW; x += 15 * pxk) {
        const jx = x + (tr() - 0.5) * 8 * pxk, jy = y + (tr() - 0.5) * 8 * pxk;
        const h = hAt(jx, jy);
        const c = idx(jx, jy);
        if (F[c] - H[c] > 3.5 || !forestAt(jx, jy, h)) continue;
        ctx.beginPath(); ctx.arc(jx, jy, 2 * pxk, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Kaya / çıplak zirve noktalaması
    ctx.fillStyle = "rgba(90,70,55,0.35)";
    for (let y = 0; y < KH; y += 7 * pxk) for (let x = 0; x < KW; x += 7 * pxk) {
      const h = hAt(x, y);
      if (h > 2300 && tr() < smooth(2300, 2560, h) * 0.8) ctx.fillRect(x, y, 1.1 * pxk, 1.1 * pxk);
    }

    // Dereler
    ctx.strokeStyle = COL.water;
    ctx.lineCap = "round";
    const TH = 160;
    for (let c = 0; c < GW * GH; c++) {
      const a = ACC[c];
      if (a < TH || recv[c] < 0) continue;
      if (F[c] - H[c] > 3.5) continue;
      const r = recv[c];
      ctx.lineWidth = (0.55 + Math.log(a / TH) * 0.42) * pxk;
      ctx.beginPath();
      ctx.moveTo((c % GW) * DX, ((c / GW) | 0) * DX);
      ctx.lineTo((r % GW) * DX, ((r / GW) | 0) * DX);
      ctx.stroke();
    }
    // UTM ızgarası
    ctx.strokeStyle = "rgba(30,40,60,0.35)";
    ctx.lineWidth = 0.6 * pxk;
    for (let k = 1; k < KW; k++) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, KH); ctx.stroke(); }
    for (let k = 1; k < KH; k++) { ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(KW, k); ctx.stroke(); }
  }

  function marching(level, emit) {
    for (let j = 0; j < GH - 1; j++) {
      for (let i = 0; i < GW - 1; i++) {
        const c = j * GW + i;
        const a = H[c], b = H[c + 1], cc = H[c + GW + 1], d = H[c + GW];
        let code = 0;
        if (a > level) code |= 8; if (b > level) code |= 4; if (cc > level) code |= 2; if (d > level) code |= 1;
        if (code === 0 || code === 15) continue;
        const x = i * DX, y = j * DX;
        const t = (p, q) => (level - p) / (q - p);
        const top = [x + t(a, b) * DX, y], right = [x + DX, y + t(b, cc) * DX];
        const bot = [x + t(d, cc) * DX, y + DX], left = [x, y + t(a, d) * DX];
        switch (code) {
          case 1: case 14: emit(left, bot); break;
          case 2: case 13: emit(bot, right); break;
          case 3: case 12: emit(left, right); break;
          case 4: case 11: emit(top, right); break;
          case 5: emit(left, top); emit(bot, right); break;
          case 6: case 9: emit(top, bot); break;
          case 7: case 8: emit(left, top); break;
          case 10: emit(top, right); emit(left, bot); break;
        }
      }
    }
  }

  function drawContours(W, Hh, dpr) {
    cC.width = Math.round(W * dpr); cC.height = Math.round(Hh * dpr);
    const ctx = cC.getContext("2d");
    ctx.setTransform(dpr * W / KW, 0, 0, dpr * Hh / KH, 0, 0);
    const pxk = KW / W;
    ctx.strokeStyle = COL.contour;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    let lo = Infinity, hi = -Infinity;
    for (const v of H) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const candidates = [];
    const step = W < 640 ? 40 : 20;
    for (let L = Math.ceil(lo / step) * step; L <= hi; L += step) {
      const index = L % 100 === 0;
      ctx.lineWidth = (index ? 1.25 : 0.55) * pxk;
      ctx.globalAlpha = index ? 0.95 : 0.75;
      ctx.beginPath();
      let n = 0;
      marching(L, (p, q) => {
        ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
        if (index && (n++ % 23 === 0)) candidates.push({ L, x: (p[0] + q[0]) / 2, y: (p[1] + q[1]) / 2, a: Math.atan2(q[1] - p[1], q[0] - p[0]) });
      });
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Eğri rakamları: eğriyi kes, rakamı yaz
    const r = mulberry32(9);
    candidates.sort(() => r() - 0.5);
    const placed = [];
    const avoid = PLACES.map((p) => [p.x, p.y]);
    const per = {};
    const minD = 95 * pxk;
    ctx.font = `600 ${(W < 640 ? 8.5 : 10.5) * pxk}px "Barlow Condensed", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const c of candidates) {
      if (placed.length > 22) break;
      if ((per[c.L] || 0) >= 2) continue;
      if (c.x < 0.25 || c.x > KW - 0.25 || c.y < 0.25 || c.y > KH - 0.25) continue;
      if (placed.some(([x, y]) => Math.hypot(x - c.x, y - c.y) < minD)) continue;
      if (avoid.some(([x, y]) => Math.hypot(x - c.x, y - c.y) < 70 * pxk)) continue;
      let a = c.a;
      if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(a);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillRect(-13 * pxk, -5 * pxk, 26 * pxk, 10 * pxk);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = COL.contour;
      ctx.fillText(String(c.L), 0, 0.5 * pxk);
      ctx.restore();
      placed.push([c.x, c.y]);
      per[c.L] = (per[c.L] || 0) + 1;
    }
  }

  // ── SVG katmanı: yollar, yerler ──
  const S = 100; // km → viewBox
  const pathD = (pts) => "M" + pts.map(([x, y]) => `${(x * S).toFixed(1)} ${(y * S).toFixed(1)}`).join("L");
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  function symbol(p) {
    switch (p.kind) {
      case "summit":
        return `<path class="sym-fill" d="M0 -7 L6.5 4.5 H-6.5 Z"/>`;
      case "view":
        return `<circle class="sym-ring" r="4"/><circle class="sym-fill" r="1.6"/>` +
          [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const t = (a * Math.PI) / 180;
            return `<line class="sym-line" x1="${(Math.cos(t) * 5.5).toFixed(1)}" y1="${(Math.sin(t) * 5.5).toFixed(1)}" x2="${(Math.cos(t) * 8).toFixed(1)}" y2="${(Math.sin(t) * 8).toFixed(1)}"/>`;
          }).join("");
      case "plateau":
        return [[-9, -2], [-2, 3], [5, -3], [10, 4]].map(([x, y]) =>
          `<path class="sym-fill" d="M${x - 2.5} ${y + 2} V${y - 1} L${x} ${y - 3.5} L${x + 2.5} ${y - 1} V${y + 2} Z"/>`).join("");
      case "mine":
        return `<g class="sym-line-b"><path d="M-6 6 L6 -6 M6 6 L-6 -6"/><path d="M3 -8 L8 -3 M-3 -8 L-8 -3"/></g>`;
      case "forest":
        return `<circle class="sym-tree" r="3.2" cx="-4"/><circle class="sym-tree" r="3.2" cx="4" cy="-1"/><circle class="sym-tree" r="3.2" cy="4"/>`;
      case "village":
        return [[-6, -3], [1, -6], [5, 1], [-2, 3], [-8, 4]].map(([x, y]) => `<rect class="sym-fill" x="${x}" y="${y}" width="4.2" height="4.2"/>`).join("");
      case "town":
        return [[-12, -6], [-6, -9], [1, -7], [7, -10], [-9, 1], [-2, -1], [5, -2], [11, -4], [-5, 7], [2, 5], [9, 4], [-12, 8]]
          .map(([x, y]) => `<rect class="sym-fill" x="${x}" y="${y}" width="4.6" height="4.6"/>`).join("") +
          `<rect class="sym-ptt" x="14" y="-1" width="17" height="9" rx="1"/><text class="ptt" x="22.5" y="5.6" text-anchor="middle">PTT</text>`;
    }
    return "";
  }

  function label(p) {
    const n = esc(p.name);
    const h = p.h;
    switch (p.kind) {
      case "summit": return `<text class="lb-peak" x="0" y="-12" text-anchor="middle">${n}</text><text class="lb-h" x="0" y="17" text-anchor="middle">${h}</text>`;
      case "view": return `<text class="lb-peak" x="11" y="-6">${n}</text><text class="lb-h" x="11" y="8">${h}</text>`;
      case "plateau": return `<text class="lb-nature" x="0" y="-13" text-anchor="middle">${n}</text><text class="lb-h" x="0" y="18" text-anchor="middle">${h}</text>`;
      case "mine": return `<text class="lb-site" x="12" y="4">${n}</text>`;
      case "forest": return `<text class="lb-forest" x="0" y="-11" text-anchor="middle">${n}</text>`;
      case "village": return `<text class="lb-village" x="0" y="-12" text-anchor="middle">${n.toLocaleUpperCase("tr-TR")}</text>`;
      case "town": return `<text class="lb-town" x="0" y="-16" text-anchor="middle">${n.toLocaleUpperCase("tr-TR")}</text>`;
    }
    return "";
  }

  function drawOverlay() {
    const out = [];
    for (const r of ROADS) {
      const d = pathD(r.pts);
      if (r.kind === "road") out.push(`<path class="road-o" d="${d}"/><path class="road-i" d="${d}"/>`);
      else out.push(`<path class="path${r.main ? " path--main" : ""}" d="${d}"/>`);
    }
    // Su adları
    out.push(`<text class="lb-water" transform="translate(${(3.1 * S)} ${(4.6 * S)}) rotate(-18)">Samsa Deresi</text>`);
    for (const p of PLACES) {
      const ext = p.href.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener noreferrer"';
      out.push(`<a class="place place--${p.kind}" data-id="${p.id}" href="${p.href}"${ext} aria-label="${esc(p.name)} — ${esc(p.what)}">
        <g transform="translate(${(p.x * S).toFixed(1)} ${(p.y * S).toFixed(1)})">
          <circle class="hit" r="26"/>
          <g class="sym">${symbol(p)}</g>
          <g class="lbl">${label(p)}</g>
          <text class="lb-tip" x="0" y="${p.kind === "town" ? 30 : 32}" text-anchor="middle">${esc(p.what)} ↗</text>
        </g></a>`);
    }
    svg.innerHTML = out.join("");
  }

  // ── Kenar: koordinat tikleri, dizin, ölçek, kesit ──
  function drawTicks() {
    const t = document.getElementById("ticks");
    const out = [];
    for (let k = 0; k <= KW; k++) {
      const e = E0 + k;
      const txt = `<small>${String(e).slice(0, 1)}</small>${String(e).slice(1)}`;
      out.push(`<span class="tk tk--top" style="left:${(k / KW) * 100}%">${txt}</span>`);
      out.push(`<span class="tk tk--bot" style="left:${(k / KW) * 100}%">${txt}</span>`);
    }
    for (let k = 0; k <= KH; k++) {
      const n = N0 - k;
      const txt = `<small>${String(n).slice(0, 2)}</small>${String(n).slice(2)}`;
      out.push(`<span class="tk tk--left" style="top:${(k / KH) * 100}%">${txt}</span>`);
      out.push(`<span class="tk tk--right" style="top:${(k / KH) * 100}%">${txt}</span>`);
    }
    out.push(`<span class="geo geo--tl">41°07′30″ · 28°52′30″</span><span class="geo geo--br">41°04′15″ · 28°58′15″</span>`);
    t.innerHTML = out.join("");
  }

  function gridRef(p) {
    const e = Math.floor(E0 + p.x), n = Math.floor(N0 - p.y);
    return `${String(e).slice(-2)}${String(n).slice(-2)}`;
  }

  function drawGazetteer() {
    const tb = document.getElementById("gazetteer");
    const order = ["blog", "tezgah", "youtube", "vsco", "pinterest", "github", "eposta"];
    tb.innerHTML = order.map((id) => {
      const p = P[id];
      const ext = p.href.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener noreferrer"';
      const name = p.kind === "town" ? "Samsa PTT" : p.kind === "village" ? "Tezgâh köyü" : p.name;
      return `<tr data-id="${id}"><td><a href="${p.href}"${ext}>${esc(name)}</a><span class="what">${esc(p.what)}</span></td><td class="r">${p.h}</td><td class="r">${gridRef(p)}</td></tr>`;
    }).join("");
  }

  function drawScale() {
    const gEl = document.getElementById("scalebar");
    const unit = 110; // 1 km
    const out = [];
    for (let i = 0; i < 4; i++) out.push(`<rect x="${10 + (i * unit) / 4}" y="8" width="${unit / 4}" height="6" class="${i % 2 ? "w" : "b"}"/>`);
    out.push(`<rect x="${10 + unit}" y="8" width="${unit}" height="6" class="b"/>`);
    out.push(`<rect x="10" y="8" width="${unit * 2}" height="6" class="frame"/>`);
    [[0, "1"], [unit / 4 * 2, "500"], [unit, "0"], [unit * 2, "1 km"]].forEach(([x, t]) => out.push(`<text x="${10 + x}" y="28" text-anchor="middle">${t}</text>`));
    out.push(`<text x="${10 + unit}" y="42" text-anchor="middle" class="m">metre</text>`);
    gEl.innerHTML = out.join("");
  }

  function drawProfile() {
    const pts = [...ROADS[1].pts, ...ROADS[2].pts.slice(1)];
    let dist = 0;
    const prof = [[0, hAt(pts[0][0], pts[0][1])]];
    for (let i = 1; i < pts.length; i++) {
      dist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      prof.push([dist, hAt(pts[i][0], pts[i][1])]);
    }
    let lo = Infinity, hi = -Infinity, up = 0;
    prof.forEach(([, h], i) => { lo = Math.min(lo, h); hi = Math.max(hi, h); if (i) up += Math.max(0, h - prof[i - 1][1]); });
    const X = (d) => (d / dist) * 556 + 2;
    const Y = (h) => 84 - ((h - lo) / (hi - lo)) * 74;
    const line = prof.map(([d, h]) => `${X(d).toFixed(1)} ${Y(h).toFixed(1)}`).join("L");
    const svgP = document.getElementById("profile");
    const grid = [];
    for (let h = Math.ceil(lo / 500) * 500; h < hi; h += 500) grid.push(`<line class="pg" x1="0" x2="560" y1="${Y(h)}" y2="${Y(h)}"/><text class="pt" x="4" y="${Y(h) - 2}">${h}</text>`);
    svgP.innerHTML = grid.join("") + `<path class="pf" d="M${X(0)} 90L${line}L${X(dist)} 90Z"/><path class="pl" d="M${line}"/>`;
    const fmt = (n) => n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
    document.getElementById("profile-meta").textContent =
      `${fmt(dist)} km · ${Math.round(up)} m tırmanış · ${Math.round(lo)} → ${Math.round(hi)} m`;
  }

  function wireHover() {
    const all = document.querySelectorAll("[data-id]");
    const set = (id, on) => all.forEach((el) => el.dataset.id === id && el.classList.toggle("is-hot", on));
    all.forEach((el) => {
      ["mouseenter", "focusin"].forEach((e) => el.addEventListener(e, () => set(el.dataset.id, true)));
      ["mouseleave", "focusout"].forEach((e) => el.addEventListener(e, () => set(el.dataset.id, false)));
    });
  }

  let lastW = 0;
  function render() {
    const W = face.clientWidth, Hh = face.clientHeight;
    if (!W || Math.abs(W - lastW) < 2) return;
    lastW = W;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    drawTerrain(W, Hh, dpr);
    drawContours(W, Hh, dpr);
  }

  document.getElementById("year").textContent = new Date().getFullYear();
  drawOverlay();
  drawTicks();
  drawGazetteer();
  drawScale();
  drawProfile();
  wireHover();
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([ready, new Promise((r) => setTimeout(r, 1200))]).then(render);
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(render, 200); });
})();
