/* ============================================================
   Tek Baskı — üç kalıplı pres
   1) açık mürekkep (gök, dağın açık tramı)
   2) vurgu mürekkebi (güneş, sıcak tarama, numaralar, çizgiler)
   3) anahtar mürekkep (yazı, bağlantılar, dağın koyu taraması)
   Her baskı: dağdan rastgele bir kesit + ziyaretçinin saatine göre gök
   + makineden gelen kayıt kayması. Bir daha aynısı basılmaz.
   ============================================================ */
(() => {
  "use strict";

  // Wada Sanzo kombinasyonları (Atölye paletlerinden) — roller: kâğıt / anahtar / vurgu / açık
  const INKS = [
    { id: "339", name: "Menekşe mavi · İngiliz kırmızısı", paper: "#F3EEE4", key: "#40456a", accent: "#d96629", tint: "#a5c8d1" },
    { id: "167", name: "Vandar Poel mavisi · Ekru", paper: "#F3EEE4", key: "#064f6e", accent: "#c2ae93", tint: "#a7d4e4" },
    { id: "341", name: "Zeytin · Mercan · Buz", paper: "#F3EEE4", key: "#253122", accent: "#f48067", tint: "#a5c8d1" },
    { id: "279", name: "Tyrian mavisi · Ham siyena", paper: "#F3EEE4", key: "#12354e", accent: "#bb7125", tint: "#c2ae93" },
    { id: "166", name: "Naples sarısı · Arduvaz · Mercan", paper: "#fbe6a0", key: "#112f2c", accent: "#f48067", tint: "#9fb59a" },
    { id: "345", name: "Nil mavisi · Kızıl kahve · Menekşe", paper: "#bce4e5", key: "#793327", accent: "#6450a1", tint: "#62c6bf" },
  ];

  const PHASES = {
    safak: "şafak",
    sabah: "sabah",
    ogle: "öğle",
    ikindi: "ikindi",
    aksam: "akşam",
    gece: "gece",
    geceyarisi: "gece yarısı",
  };
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const TAU = Math.PI * 2;

  const params = new URLSearchParams(location.search);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const AGE_SECONDS = params.get("yas") === "hizli" ? 60 : 1500;
  document.documentElement.style.setProperty("--age-dur", AGE_SECONDS + "s");

  const $ = (sel, root = document) => root.querySelector(sel);
  const bench = $(".bench");
  const bed = $("#bed");
  const pullBtn = $("#pull");
  const live = $("#live");
  const firstSheet = $("#sheet");
  const layoutTemplate = $(".layout", firstSheet).cloneNode(true);

  // ── Yardımcılar ───────────────────────────────────────────
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2(x, y) {
    let h = Math.imul(Math.round(x * 4) + 374761393, 668265263) ^ Math.imul(Math.round(y * 4) + 1274126177, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function newSeed() {
    try {
      return crypto.getRandomValues(new Uint32Array(1))[0];
    } catch (e) {
      return (Math.random() * 4294967296) >>> 0;
    }
  }

  function rgba(hex, a) {
    const c = hex.replace("#", "");
    return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`;
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const store = {
    get(k) {
      try { return localStorage.getItem(k); } catch (e) { return null; }
    },
    set(k, v) {
      try { localStorage.setItem(k, v); } catch (e) { /* özel pencere */ }
    },
  };

  // ── Dokular: kâğıt dişi, mürekkep boşlukları, tezgâh ─────
  function makeTexture(size, paint) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    paint(c.getContext("2d"), size);
    return `url("${c.toDataURL("image/png")}")`;
  }

  function buildTextures() {
    const root = document.documentElement.style;

    root.setProperty("--grain", makeTexture(220, (g, s) => {
      const img = g.createImageData(s, s);
      const d = img.data;
      const r = mulberry32(7109);
      for (let i = 0; i < d.length; i += 4) {
        const n = r() - 0.5;
        if (n < -0.2) {
          d[i] = 60; d[i + 1] = 48; d[i + 2] = 34;
          d[i + 3] = Math.min(22, Math.round((-n - 0.2) * 60));
        } else if (n > 0.24) {
          d[i] = 255; d[i + 1] = 253; d[i + 2] = 247;
          d[i + 3] = Math.min(24, Math.round((n - 0.24) * 70));
        }
      }
      g.putImageData(img, 0, 0);
      g.lineCap = "round";
      for (let i = 0; i < 46; i++) {
        const x = r() * s, y = r() * s, a = r() * Math.PI, len = 4 + r() * 10;
        g.strokeStyle = r() > 0.35 ? "rgba(70,55,38,0.07)" : "rgba(255,253,248,0.2)";
        g.lineWidth = 0.7;
        for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
          g.beginPath();
          g.moveTo(x + ox, y + oy);
          g.quadraticCurveTo(x + ox + Math.cos(a) * len * 0.5 + 1.2, y + oy + Math.sin(a) * len * 0.5 - 1.2,
            x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
          g.stroke();
        }
      }
    }));

    // Mürekkebin tutmadığı minik boşluklar (kalıp maskesi)
    root.setProperty("--speckle", makeTexture(170, (g, s) => {
      const r = mulberry32(2207);
      g.fillStyle = "#000";
      g.fillRect(0, 0, s, s);
      g.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 340; i++) {
        const x = r() * s, y = r() * s, rad = 0.35 + r() * r() * 1.25;
        g.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.6})`;
        for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
          g.beginPath();
          g.arc(x + ox, y + oy, rad, 0, TAU);
          g.fill();
        }
      }
    }));

    root.setProperty("--bench-grain", makeTexture(200, (g, s) => {
      const img = g.createImageData(s, s);
      const d = img.data;
      const r = mulberry32(31);
      for (let i = 0; i < d.length; i += 4) {
        const n = r();
        const v = n > 0.5 ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = Math.round(Math.abs(n - 0.5) * 16);
      }
      g.putImageData(img, 0, 0);
    }));
  }

  // ── Dağ maskesi (bg.jpg'den ayrıştırılmış 3 kanal) ────────
  let mask = null; // { px, gw, gh, ... }

  function loadMask() {
    const M = window.SAMSA_MOUNTAIN;
    if (!M || !M.maskPng) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = M.gw;
        c.height = M.gh;
        const g = c.getContext("2d", { willReadFrequently: true });
        g.drawImage(img, 0, 0);
        mask = { M, px: g.getImageData(0, 0, M.gw, M.gh).data };
        resolve(mask);
      };
      img.onerror = () => resolve(null);
      img.src = M.maskPng;
    });
  }

  // Kesit geometrisi: blok genişliği W, yüksekliği H (CSS px)
  function mountainGeometry(W, H, st) {
    if (!mask) {
      const flat = H * 0.62;
      return { ridgeAt: () => flat, sample: () => 0, mTop: flat, horizon: flat, ridgeTop: flat };
    }
    const { M, px } = mask;
    const kc = W / st.span;
    const mTop = H - (M.h - M.yTop) * kc;
    const nR = M.ridge.length;

    const ridgeAt = (x) => {
      const sx = st.x0 + x / kc;
      let f = (sx / M.w) * nR;
      f = ((f % nR) + nR) % nR;
      const i = Math.floor(f);
      const t = f - i;
      const y = lerp(M.ridge[i], M.ridge[(i + 1) % nR], t);
      return mTop + (y - M.yTop) * kc;
    };

    const sample = (x, y, ch) => {
      const sy = M.yTop + (y - mTop) / kc;
      if (sy < M.yTop || sy >= M.h) return 0;
      const sx = st.x0 + x / kc;
      const gx = ((Math.floor((sx / M.w) * M.gw) % M.gw) + M.gw) % M.gw;
      const gy = clamp(Math.floor(((sy - M.yTop) / (M.h - M.yTop)) * M.gh), 0, M.gh - 1);
      return px[(gy * M.gw + gx) * 4 + ch] / 255;
    };

    let sum = 0, top = Infinity, n = 0;
    for (let x = 0; x <= W; x += 4) {
      const y = ridgeAt(x);
      sum += y; n++;
      if (y < top) top = y;
    }
    return { ridgeAt, sample, mTop, horizon: sum / n, ridgeTop: top };
  }

  function skyPath(W, geo) {
    const p = new Path2D();
    p.moveTo(-4, -4);
    p.lineTo(W + 4, -4);
    for (let x = W + 4; x >= -4; x -= 2) p.lineTo(x, geo.ridgeAt(x) + 1.4);
    p.closePath();
    return p;
  }

  // ── Tram ve tarama ─────────────────────────────────────────
  function dotScreen(g, W, H, top, pitch, angDeg, f) {
    const a = (angDeg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const R = Math.hypot(W, H) * 0.55;
    const cx = W / 2, cy = H / 2;
    g.beginPath();
    for (let v = -R; v <= R; v += pitch) {
      for (let u = -R; u <= R; u += pitch) {
        const x = cx + u * ca - v * sa;
        const y = cy + u * sa + v * ca;
        if (x < -2 || x > W + 2 || y < top - 2 || y > H + 2) continue;
        const d = f(x, y);
        if (d < 0.12) continue;
        const r = Math.sqrt(d) * pitch * 0.5 * (0.88 + 0.24 * hash2(x, y));
        g.moveTo(x + r, y);
        g.arc(x, y, r, 0, TAU);
      }
    }
    g.fill();
  }

  // dir = +1 → "/" (y = c − x), dir = −1 → "\" (y = x + c)
  function hatch(g, W, H, top, pitch, dir, f, thr, w0, w1) {
    const step = 1.1;
    const cMin = dir > 0 ? top : top - W;
    const cMax = dir > 0 ? W + H : H;
    for (let c = cMin; c <= cMax; c += pitch) {
      let on = false, x0 = 0, maxV = 0;
      const flush = (xe) => {
        g.lineWidth = w0 + maxV * w1;
        g.beginPath();
        g.moveTo(x0, dir > 0 ? c - x0 : x0 + c);
        g.lineTo(xe, dir > 0 ? c - xe : xe + c);
        g.stroke();
      };
      for (let x = -2; x <= W + 2; x += step) {
        const y = dir > 0 ? c - x : x + c;
        const v = y < top || y > H ? 0 : f(x, y);
        const hit = v > thr && hash2(x + c, y) > 0.035;
        if (hit && !on) { on = true; x0 = x; maxV = v; }
        else if (hit) { if (v > maxV) maxV = v; }
        else if (on) { on = false; flush(x - step); }
      }
      if (on) flush(W + 2);
    }
  }

  // Merdane mürekkebi eşit dağıtmaz: genişlik boyunca hafif açlık bantları
  function starve(g, W, H, rng) {
    g.save();
    g.globalCompositeOperation = "destination-out";
    const grad = g.createLinearGradient(0, 0, W, 0);
    const stops = 6;
    for (let i = 0; i <= stops; i++) {
      grad.addColorStop(i / stops, `rgba(0,0,0,${(rng() * rng() * 0.22).toFixed(3)})`);
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    g.restore();
  }

  function roundBar(g, x, y, w, h) {
    const r = h / 2;
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    g.lineTo(x + r, y + h);
    g.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5);
    g.closePath();
    g.fill();
  }

  // Ay evresi: 0 yeni ay · 0.5 dolunay
  function moonPhase(date) {
    const syn = 29.530588853;
    const ref = Date.UTC(2000, 0, 6, 18, 14);
    let p = ((date.getTime() - ref) / 86400000 / syn) % 1;
    if (p < 0) p += 1;
    return p;
  }

  function moonShape(g, cx, cy, r, p) {
    g.save();
    g.translate(cx, cy);
    if (p > 0.5) g.scale(-1, 1);
    const k = Math.cos(TAU * p);
    g.beginPath();
    g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    g.ellipse(0, 0, Math.max(0.01, Math.abs(k) * r), r, 0, Math.PI / 2, -Math.PI / 2, k > 0);
    g.fill();
    g.restore();
  }

  function phaseOf(date) {
    const h = date.getHours() + date.getMinutes() / 60;
    if (h >= 5 && h < 7.5) return "safak";
    if (h >= 7.5 && h < 11) return "sabah";
    if (h >= 11 && h < 14) return "ogle";
    if (h >= 14 && h < 17) return "ikindi";
    if (h >= 17 && h < 20.5) return "aksam";
    if (h >= 20.5 || h < 0.5) return "gece";
    return "geceyarisi";
  }

  // ── Kalıpları çiz ───────────────────────────────────────────
  function renderPlates(sheet) {
    const st = sheet._st;
    const ink = INKS[st.inkIdx];
    const blocks = {
      tint: $(".plate--tint .block", sheet),
      accent: $(".plate--accent .block", sheet),
      key: $(".plate--key .block", sheet),
    };
    const W = blocks.key.offsetWidth;
    const H = blocks.key.offsetHeight;
    if (!W || !H) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const ctx = {};
    for (const k of ["tint", "accent", "key"]) {
      let c = blocks[k].querySelector("canvas");
      if (!c) {
        c = document.createElement("canvas");
        c.setAttribute("aria-hidden", "true");
        blocks[k].appendChild(c);
      }
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      const g = c.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      ctx[k] = g;
    }
    sheet._size = W + "x" + H;

    const rng = mulberry32(st.seed ^ 0x5eed);
    const geo = mountainGeometry(W, H, st);
    const sky = skyPath(W, geo);
    const phase = st.phase;
    const h = st.date.getHours() + st.date.getMinutes() / 60;
    const night = phase === "gece" || phase === "geceyarisi";
    const low = phase === "safak" || phase === "aksam";

    // Gök
    const T = ctx.tint, A = ctx.accent, K = ctx.key;
    [T, A, K].forEach((g) => { g.save(); g.clip(sky); });

    if (night) {
      T.fillStyle = rgba(ink.tint, 0.62);
      T.fillRect(0, 0, W, H);
      const gk = K.createLinearGradient(0, 0, 0, geo.horizon);
      gk.addColorStop(0, rgba(ink.key, 0.94));
      gk.addColorStop(0.55, rgba(ink.key, 0.5));
      gk.addColorStop(1, rgba(ink.key, 0.04));
      K.fillStyle = gk;
      K.fillRect(0, 0, W, H);

      // Ay: kâğıt boş bırakılır (iki kalıptan da oyulur)
      const tN = ((h - 20.5 + 24) % 24) / 8.5;
      const mx = W * (0.14 + 0.72 * clamp(tN, 0, 1));
      const my = geo.ridgeTop - Math.sin(Math.PI * clamp(tN, 0.05, 0.95)) * (geo.ridgeTop - H * 0.16) - W * 0.02;
      const mr = W * 0.058;
      const p = st.moon;
      for (const g of [T, K]) {
        g.globalCompositeOperation = "destination-out";
        g.fillStyle = "rgba(0,0,0,0.16)";
        g.beginPath();
        g.arc(mx, my, mr, 0, TAU);
        g.fill();
        if (p > 0.03 && p < 0.97) {
          g.fillStyle = "#000";
          moonShape(g, mx, my, mr, p);
        }
      }
      // Yıldızlar: anahtar kalıptan oyulmuş iğne delikleri
      K.fillStyle = "#000";
      for (let i = 0; i < 46; i++) {
        const x = rng() * W;
        const y = rng() * geo.ridgeTop * 0.7;
        if (Math.hypot(x - mx, y - my) < mr * 1.6) continue;
        const r = 0.45 + rng() * rng() * 1.1;
        K.beginPath();
        K.arc(x, y, r, 0, TAU);
        K.fill();
      }
      T.globalCompositeOperation = "source-over";
      K.globalCompositeOperation = "source-over";
    } else {
      // Güneş: saatine göre yay üzerinde
      const t = clamp((h - 5.5) / 14, 0, 1);
      const elev = Math.sin(Math.PI * t);
      const sx = W * (0.1 + 0.8 * t);
      const sr = W * lerp(0.105, 0.075, elev);
      const sy = geo.ridgeAt(sx) + sr * 0.35 - elev * (geo.ridgeAt(sx) - H * 0.2);

      if (low) {
        // Ufukta yoğunlaşan ters bokashi
        const gt = T.createLinearGradient(0, geo.horizon, 0, 0);
        gt.addColorStop(0, rgba(ink.tint, 0.95));
        gt.addColorStop(0.5, rgba(ink.tint, 0.3));
        gt.addColorStop(0.78, rgba(ink.tint, 0.16));
        gt.addColorStop(1, rgba(ink.tint, 0.5));
        T.fillStyle = gt;
        T.fillRect(0, 0, W, H);
      } else {
        const gt = T.createLinearGradient(0, 0, 0, geo.ridgeTop);
        gt.addColorStop(0, rgba(ink.tint, 0.98));
        gt.addColorStop(0.5, rgba(ink.tint, 0.42));
        gt.addColorStop(1, rgba(ink.tint, 0));
        T.fillStyle = gt;
        T.fillRect(0, 0, W, H);
        // Bulutlar: açık mürekkepten oyulmuş şeritler
        T.globalCompositeOperation = "destination-out";
        T.fillStyle = "#000";
        const groups = 2 + Math.floor(rng() * 2);
        for (let gi = 0; gi < groups; gi++) {
          const y0 = H * (0.06 + rng() * 0.22);
          const x0 = W * (rng() * 0.9 - 0.15);
          const len = W * (0.22 + rng() * 0.3);
          const bh = H * (0.016 + rng() * 0.012);
          const bars = 2 + Math.floor(rng() * 2);
          for (let b = 0; b < bars; b++) {
            roundBar(T, x0 + (rng() - 0.3) * W * 0.09, y0 + b * bh * 1.75, len * (0.55 + rng() * 0.5), bh);
          }
        }
        T.globalCompositeOperation = "source-over";
      }

      A.fillStyle = ink.accent;
      A.beginPath();
      A.arc(sx, sy, sr, 0, TAU);
      A.fill();

      if (low) {
        // Güneşin önünden geçen kâğıt bulut şeritleri
        A.globalCompositeOperation = "destination-out";
        A.fillStyle = "#000";
        const bh = sr * 0.15;
        const by = sy - sr * 0.15;
        roundBar(A, sx - sr * 1.6, by, sr * 2.1, bh);
        roundBar(A, sx - sr * 0.4, by + bh * 1.9, sr * 2.2, bh * 0.8);
        A.globalCompositeOperation = "source-over";
      }
    }
    [T, A, K].forEach((g) => g.restore());

    // Dağ: üç kanal, üç desen
    if (mask) {
      const top = geo.mTop;
      T.fillStyle = ink.tint;
      dotScreen(T, W, H, top, 4.3, 14, (x, y) => geo.sample(x, y, 0));

      A.strokeStyle = ink.accent;
      A.lineCap = "round";
      hatch(A, W, H, top, 3.7, +1, (x, y) => geo.sample(x, y, 1), 0.18, 0.55, 1.15);

      K.strokeStyle = ink.key;
      K.fillStyle = ink.key;
      K.lineCap = "round";
      hatch(K, W, H, top, 3.25, -1, (x, y) => geo.sample(x, y, 2), 0.25, 0.7, 1.45);
      for (let y = top; y < H; y += 2.3) {
        for (let x = 0; x < W; x += 2.3) {
          if (geo.sample(x, y, 2) > 0.72 && hash2(x + 7, y + 13) > 0.14) K.fillRect(x - 1, y - 1, 2.3, 2.3);
        }
      }
      K.lineWidth = 1.5;
      K.lineJoin = "round";
      K.beginPath();
      for (let x = -2; x <= W + 2; x += 2) {
        const y = geo.ridgeAt(x);
        if (x === -2) K.moveTo(x, y); else K.lineTo(x, y);
      }
      K.stroke();
    }

    starve(T, W, H, mulberry32(st.seed + 11));
    starve(A, W, H, mulberry32(st.seed + 23));
    starve(K, W, H, mulberry32(st.seed + 37));
  }

  // ── Baskı durumu ───────────────────────────────────────────
  function makeState(inkIdx) {
    const seed = newSeed();
    const r = mulberry32(seed);
    const M = window.SAMSA_MOUNTAIN;
    const date = new Date();
    // Önizleme: ?saat=21.5 gibi bir değerle göğü başka bir saate kurmak
    const forced = parseFloat(params.get("saat"));
    if (!Number.isNaN(forced)) {
      date.setHours(Math.floor(forced) % 24, Math.round((forced % 1) * 60), 0, 0);
    }
    const plates = {};
    for (const k of ["tint", "accent", "key"]) {
      const amp = k === "key" ? 0.5 : 1.9;
      plates[k] = {
        dx: (r() - 0.5) * 2 * amp,
        dy: (r() - 0.5) * 2 * amp,
        rot: (r() - 0.5) * (k === "key" ? 0.06 : 0.22),
      };
    }
    return {
      seed,
      inkIdx,
      date,
      phase: phaseOf(date),
      moon: moonPhase(date),
      x0: r() * (M ? M.w : 1500),
      span: 780 + r() * 300,
      plates,
      speckle: [Math.round(r() * 170), Math.round(r() * 170)],
    };
  }

  function foxing(r) {
    const spots = [];
    const n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const x = (r() * 100).toFixed(1), y = (r() * 100).toFixed(1), s = (0.6 + r() * 2.2).toFixed(2);
      spots.push(`radial-gradient(${s}% ${s}% at ${x}% ${y}%, rgba(140,90,40,0.55), transparent)`);
    }
    return spots.join(",");
  }

  function createSheet() {
    const s = document.createElement("article");
    s.className = "sheet";
    s.setAttribute("aria-label", "Baskı");
    const key = document.createElement("div");
    key.className = "plate plate--key";
    key.appendChild(layoutTemplate.cloneNode(true));
    s.appendChild(key);
    return s;
  }

  function clonePlate(keyPlate, cls) {
    const p = document.createElement("div");
    p.className = "plate " + cls;
    p.setAttribute("aria-hidden", "true");
    p.inert = true;
    const l = $(".layout", keyPlate).cloneNode(true);
    l.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
    l.querySelectorAll("canvas").forEach((e) => e.remove());
    p.appendChild(l);
    return p;
  }

  function prepareSheet(sheet, st) {
    const ink = INKS[st.inkIdx];
    sheet._st = st;
    sheet.style.setProperty("--paper", ink.paper);
    sheet.style.setProperty("--key", ink.key);
    sheet.style.setProperty("--accent", ink.accent);
    sheet.style.setProperty("--tint", ink.tint);

    const key = $(".plate--key", sheet);
    const tint = clonePlate(key, "plate--tint");
    const accent = clonePlate(key, "plate--accent");
    sheet.insertBefore(tint, key);
    sheet.insertBefore(accent, key);

    // Kayıt kayması: her kalıp kâğıda biraz farklı oturur
    const unit = sheet.offsetWidth / 576 || 1;
    for (const [k, el] of [["tint", tint], ["accent", accent], ["key", key]]) {
      const p = st.plates[k];
      el.style.translate = `${(p.dx * unit).toFixed(2)}px ${(p.dy * unit).toFixed(2)}px`;
      el.style.rotate = `${p.rot.toFixed(3)}deg`;
    }
    const sp = st.speckle;
    tint.style.maskPosition = `${sp[0]}px ${sp[1]}px`;
    accent.style.maskPosition = `${sp[1]}px ${sp[0] + 40}px`;
    key.style.maskPosition = `${sp[0] + 70}px ${sp[1] + 20}px`;

    const age = document.createElement("div");
    age.className = "age";
    age.setAttribute("aria-hidden", "true");
    age.style.setProperty("--foxing", foxing(mulberry32(st.seed + 5)));
    sheet.appendChild(age);

    const d = st.date;
    const pencil = document.createElement("div");
    pencil.className = "pencil";
    pencil.setAttribute("aria-hidden", "true");
    pencil.innerHTML =
      `<span class="ed">1/1</span>` +
      `<span class="ti">Dağ, ${PHASES[st.phase]} — ${d.getDate()}.${ROMAN[d.getMonth()]}.${d.getFullYear()}</span>` +
      `<span class="sig">O. Şahin</span>`;
    sheet.appendChild(pencil);

    // Fare üstündeki satır, vurgu kalıbında da tutuşsun
    key.querySelectorAll(".prog").forEach((li) => {
      const twin = accent.querySelector(`.prog[data-i="${li.dataset.i}"]`);
      const on = () => twin && twin.classList.add("is-hot");
      const off = () => twin && twin.classList.remove("is-hot");
      li.addEventListener("mouseenter", on);
      li.addEventListener("mouseleave", off);
      li.addEventListener("focusin", on);
      li.addEventListener("focusout", off);
    });

    renderPlates(sheet);
  }

  // ── Pres hareketleri ───────────────────────────────────────
  function rollPass(sheet, plate, color) {
    return new Promise((resolve) => {
      const H = sheet.offsetHeight;
      const rh = Math.max(16, sheet.offsetWidth * 0.052);
      const roller = document.createElement("div");
      roller.className = "roller";
      roller.style.height = rh + "px";
      roller.style.setProperty("--roll-ink", color);
      sheet.appendChild(roller);

      const duration = 640;
      const easing = "cubic-bezier(.5,.08,.42,1)";
      const reach = (H + rh / 2) / (H + rh);
      roller.animate(
        [{ transform: `translateY(${-rh}px)` }, { transform: `translateY(${H}px)` }],
        { duration, easing, fill: "forwards" }
      );
      const a = plate.animate(
        [
          { clipPath: `inset(0 0 ${H + rh / 2}px 0)`, offset: 0 },
          { clipPath: "inset(0 0 0px 0)", offset: reach },
          { clipPath: "inset(0 0 0px 0)", offset: 1 },
        ],
        { duration, easing }
      );
      a.onfinish = () => {
        plate.classList.add("is-inked");
        roller.remove();
        resolve();
      };
    });
  }

  function writePencil(sheet) {
    const pencil = $(".pencil", sheet);
    if (!pencil) return Promise.resolve();
    if (reduceMotion) {
      pencil.classList.add("is-written");
      return Promise.resolve();
    }
    const a = pencil.animate(
      [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }],
      { duration: 1100, easing: "cubic-bezier(.4,0,.6,1)" }
    );
    return a.finished.then(() => pencil.classList.add("is-written"));
  }

  let stackCount = 0;

  function sendToStack(old) {
    old.classList.add("is-stacked");
    old.removeAttribute("id");
    old.setAttribute("aria-hidden", "true");
    old.inert = true;
    const r = mulberry32(old._st.seed + 99);
    const side = stackCount % 2 === 0 ? -1 : 1;
    const pose = `translate(${(side * (2 + r() * 3)).toFixed(2)}%, ${(r() * 2.2 - 0.6).toFixed(2)}%) rotate(${(side * (1.4 + r() * 2.6)).toFixed(2)}deg)`;
    old.style.zIndex = String(10 + stackCount);
    stackCount++;
    if (reduceMotion) {
      old.style.transform = pose;
    } else {
      old.animate([{ transform: "none" }, { transform: pose }], { duration: 560, easing: "cubic-bezier(.22,1,.36,1)" })
        .finished.then(() => { old.style.transform = pose; });
      old.style.transform = pose;
    }

    // En fazla 4 eski baskı kalsın
    const stacked = bed.querySelectorAll(".sheet.is-stacked");
    if (stacked.length > 4) {
      const oldest = stacked[0];
      oldest.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).finished.then(() => oldest.remove());
    }
  }

  function enterSheet(sheet) {
    if (reduceMotion) return Promise.resolve();
    return sheet.animate(
      [
        { opacity: 0, transform: "translateY(-4%) scale(1.02)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 520, easing: "cubic-bezier(.22,1,.36,1)" }
    ).finished;
  }

  // ── İş fişi ────────────────────────────────────────────────
  let printedAt = 0;
  let ageTimer = null;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function updateTicket(sheet, no) {
    const st = sheet._st;
    const ink = INKS[st.inkIdx];
    const d = st.date;
    const night = st.phase === "gece" || st.phase === "geceyarisi";
    const illum = Math.round(((1 - Math.cos(TAU * st.moon)) / 2) * 100);

    // En büyük kalıp kayması (A4 genişliği 210 mm varsayımıyla)
    const unit = sheet.offsetWidth / 576 || 1;
    const k = st.plates.key;
    let max = 0;
    for (const p of [st.plates.tint, st.plates.accent]) {
      max = Math.max(max, Math.hypot(p.dx - k.dx, p.dy - k.dy) * unit);
    }
    const mm = (max * 210) / sheet.offsetWidth;

    setText("t-no", "№ " + String(no).padStart(4, "0"));
    setText("t-subject", "Dağ, " + PHASES[st.phase]);
    setText("t-time", `${pad2(d.getHours())}:${pad2(d.getMinutes())}`);
    setText("t-sky", night ? (illum < 3 ? "yeni ay, yıldızlar" : `ay · %${illum} aydınlık`) : "güneş");
    setText("t-ink", "Wada " + ink.id);
    setText("t-reg", mm.toFixed(1).replace(".", ",") + " mm");

    printedAt = Date.now();
    clearInterval(ageTimer);
    const tick = () => {
      const s = Math.floor((Date.now() - printedAt) / 1000);
      let txt;
      if (s < 60) txt = `${s} sn`;
      else if (s < 3600) txt = `${Math.floor(s / 60)} dk ${pad2(s % 60)} sn`;
      else txt = `${Math.floor(s / 3600)} sa ${pad2(Math.floor((s % 3600) / 60))} dk`;
      setText("t-age", txt);
    };
    tick();
    ageTimer = setInterval(tick, 1000);
  }

  // ── Mürekkep listesi ───────────────────────────────────────
  let inkIdx = 0;

  function buildInkList() {
    const list = $("#ink-list");
    INKS.forEach((ink, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ink";
      b.dataset.i = String(i);
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-label", `Wada ${ink.id} mürekkebiyle bas: ${ink.name}`);
      b.style.setProperty("--c-paper", ink.paper);
      b.style.setProperty("--c-key", ink.key);
      b.style.setProperty("--c-accent", ink.accent);
      b.style.setProperty("--c-tint", ink.tint);
      b.innerHTML =
        `<span class="ink-chip" aria-hidden="true"><i></i><i></i><i></i></span>` +
        `<span class="ink-text"><span class="ink-id">Wada ${ink.id}</span><span class="ink-name">${ink.name}</span></span>`;
      b.addEventListener("click", () => pull(i));
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  function markInk(i) {
    document.querySelectorAll(".ink").forEach((b) => {
      b.setAttribute("aria-pressed", b.dataset.i === String(i) ? "true" : "false");
    });
    const ink = INKS[i];
    const root = document.documentElement.style;
    root.setProperty("--bench-tint", ink.key);
    root.setProperty("--accent", ink.accent);
  }

  // ── Baskı çek ──────────────────────────────────────────────
  let current = null;
  let busy = false;

  async function pull(nextInk) {
    if (busy) return;
    busy = true;
    bench.classList.add("is-printing");
    pullBtn.setAttribute("aria-disabled", "true");

    if (typeof nextInk === "number") inkIdx = nextInk;
    markInk(inkIdx);
    store.set("tekbaski.murekkep", INKS[inkIdx].id);

    const no = (parseInt(store.get("tekbaski.no") || "0", 10) || 0) + 1;
    store.set("tekbaski.no", String(no));

    const st = makeState(inkIdx);
    let sheet;
    if (!current) {
      sheet = firstSheet;
    } else {
      sendToStack(current);
      sheet = createSheet();
      sheet.id = "sheet";
      bed.appendChild(sheet);
    }
    current = sheet;
    prepareSheet(sheet, st);

    const ink = INKS[st.inkIdx];
    const passes = [
      [".plate--tint", ink.tint],
      [".plate--accent", ink.accent],
      [".plate--key", ink.key],
    ];

    if (reduceMotion) {
      passes.forEach(([sel]) => $(sel, sheet).classList.add("is-inked"));
    } else {
      if (sheet !== firstSheet) await enterSheet(sheet);
      for (const [sel, color] of passes) {
        await rollPass(sheet, $(sel, sheet), color);
        await wait(70);
      }
    }
    sheet.classList.add("is-printed");
    updateTicket(sheet, no);
    live.textContent = `Baskı № ${no} hazır: Dağ, ${PHASES[st.phase]}, Wada ${ink.id} mürekkebi.`;
    await writePencil(sheet);

    busy = false;
    bench.classList.remove("is-printing");
    pullBtn.removeAttribute("aria-disabled");
  }

  // ── Gregor (Samsa) — arada bir tezgâhın kenarından geçer ──
  function gregor() {
    const el = $("#gregor");
    if (!el || reduceMotion) return;
    const fine = window.matchMedia("(pointer: fine) and (min-width: 901px)");
    const schedule = (ms) => setTimeout(walk, ms);
    function walk() {
      if (!fine.matches || document.hidden) return schedule(30000);
      const ltr = Math.random() > 0.35;
      const vw = window.innerWidth;
      const from = ltr ? -50 : vw + 20;
      const to = ltr ? vw + 20 : -50;
      el.classList.add("is-walking");
      const anim = el.animate(
        [
          { transform: `translateX(${from}px) scaleX(${ltr ? 1 : -1})` },
          { transform: `translateX(${to}px) scaleX(${ltr ? 1 : -1})` },
        ],
        { duration: 19000 + Math.random() * 7000, easing: "linear" }
      );
      const pause = () => anim.pause();
      const resume = () => anim.play();
      el.addEventListener("mouseenter", pause);
      el.addEventListener("mouseleave", resume);
      anim.finished.then(() => {
        el.classList.remove("is-walking");
        el.removeEventListener("mouseenter", pause);
        el.removeEventListener("mouseleave", resume);
        schedule(70000 + Math.random() * 90000);
      });
    }
    schedule(28000 + Math.random() * 20000);
  }

  // ── Başlat ─────────────────────────────────────────────────
  function initialInk() {
    const want = (params.get("palet") || params.get("wada") || "").trim();
    const fromParam = INKS.findIndex((i) => i.id === want);
    if (fromParam >= 0) return fromParam;
    // Yığın değil: her ziyaret, son seferkinden farklı bir mürekkeple başlar
    const last = INKS.findIndex((i) => i.id === store.get("tekbaski.murekkep"));
    let i = Math.floor(Math.random() * INKS.length);
    if (i === last) i = (i + 1) % INKS.length;
    return i;
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const k = e.key.toLowerCase();
    if (k === "b") {
      pull();
    } else if (k === "p") {
      pull((inkIdx + 1) % INKS.length);
    }
  }

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!current || !current._st) return;
      const b = $(".plate--key .block", current);
      if (b && b.offsetWidth + "x" + b.offsetHeight !== current._size) renderPlates(current);
    }, 160);
  }

  async function start() {
    window.__tekbaski = true;
    buildTextures();
    buildInkList();
    inkIdx = initialInk();
    markInk(inkIdx);

    pullBtn.addEventListener("click", () => pull());
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);

    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    await Promise.all([loadMask(), Promise.race([fontsReady, wait(900)])]);
    await pull(inkIdx);
    gregor();
  }

  start();
})();
