/* ============================================================
   Samsa Riso / Letterpress Baskı Motoru (Yüksek Başarım Sürümü)
   Atölye Wada Sanzo paletleri & Riso tram/tarama ön-birleştirme
   ============================================================ */

(() => {
  "use strict";

  // Osman onaylı Wada Sanzo paletleri (dev/atolye/marka/paletler.json)
  const PALETTES = [
    { id: "167", name: "Krem · Vandar Poel · Ekru", paper: "#F3EEE4", ink1: "#064f6e", ink2: "#c2ae93", ink3: "#a7d4e4" },
    { id: "139", name: "Krem · Derin Çivit · Adaçayı", paper: "#F2F0EA", ink1: "#051230", ink2: "#97acc8", ink3: "#b6bfc1" },
    { id: "339", name: "Krem · Menekşe Mavi · İngiliz Kırmızısı", paper: "#F3EEE4", ink1: "#40456a", ink2: "#d96629", ink3: "#a5c8d1" },
    { id: "202", name: "Turkuaz Yeşil · Arduvaz · Kobalt", paper: "#b5decc", ink1: "#34454c", ink2: "#96d1aa", ink3: "#749e91" },
    { id: "208", name: "Sülfür Sarısı · Antwarp · Deniz Yeşili", paper: "#f5ecc2", ink1: "#007190", ink2: "#099197", ink3: "#82b7b3" },
    { id: "343", name: "Fildişi Deve Tüyü · Yanık Siyena", paper: "#ebd3a2", ink1: "#064f6e", ink2: "#ae5224", ink3: "#635a3a" },
    { id: "166", name: "Naples Sarısı · Arduvaz Yeşili · Mercan", paper: "#fbe6a0", ink1: "#112f2c", ink2: "#f48067", ink3: "#9fb59a" },
    { id: "341", name: "Krem · Zeytin · Mercan · Buz", paper: "#F3EEE4", ink1: "#253122", ink2: "#f48067", ink3: "#a5c8d1" },
    { id: "279", name: "Krem · Tyrian Mavisi · Ham Siyena", paper: "#F3EEE4", ink1: "#12354e", ink2: "#bb7125", ink3: "#c2ae93" },
    { id: "345", name: "Nil Mavisi · Kızıl Kahve · Menekşe", paper: "#bce4e5", ink1: "#793327", ink2: "#6450a1", ink3: "#62c6bf" },
  ];

  const Y_CROP_TOP = 168; // mountain-data.js yTop=176 üstü boş gökyüzü; yalnız aktif dağ şeridi basılır
  const PLATE_SCALE = 1.2; // 1500x332 -> 1800x398 keskin ön-baskı kalıbı

  // Deterministik sözde-rasgele üreteç
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Periyodik uzamsal özet (x=0 ve x=W dikişlerinde birebir aynı değer)
  function hashPeriodic(x, y, W) {
    const period = Math.round(W * 2);
    const wx = ((Math.round(x * 2) % period) + period) % period;
    const wy = Math.round(y * 2);
    let h = Math.imul(wx + 374761393, 668265263) ^ Math.imul(wy + 1274126177, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }

  // Kâğıt dişi + ince elyaf dokusu (256x256 saydam dikişsiz katman — blend readback yok)
  function buildPaperGrain() {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(size, size);
    const data = img.data;
    const rng = mulberry32(7109);

    for (let i = 0; i < data.length; i += 4) {
      const n = rng() - 0.5;
      if (n < -0.18) {
        data[i] = 52;
        data[i + 1] = 42;
        data[i + 2] = 30;
        data[i + 3] = Math.min(18, Math.round((-n - 0.18) * 46));
      } else if (n > 0.22) {
        data[i] = 255;
        data[i + 1] = 252;
        data[i + 2] = 245;
        data[i + 3] = Math.min(18, Math.round((n - 0.22) * 54));
      }
    }
    ctx.putImageData(img, 0, 0);

    // Tek tük kâğıt lifleri (elyaf)
    ctx.lineCap = "round";
    for (let i = 0; i < 40; i++) {
      const x = rng() * size;
      const y = rng() * size;
      const angle = rng() * Math.PI;
      const len = 4 + rng() * 9;
      const bend = (rng() - 0.5) * 3;
      const dark = rng() > 0.3;
      ctx.strokeStyle = dark ? "rgba(58, 46, 32, 0.052)" : "rgba(255, 253, 248, 0.16)";
      ctx.lineWidth = 0.7;
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          ctx.beginPath();
          ctx.moveTo(x + ox, y + oy);
          ctx.quadraticCurveTo(
            x + ox + Math.cos(angle) * len * 0.5 + bend,
            y + oy + Math.sin(angle) * len * 0.5 - bend,
            x + ox + Math.cos(angle) * len,
            y + oy + Math.sin(angle) * len
          );
          ctx.stroke();
        }
      }
    }

    const el = document.getElementById("paper-grain");
    if (el) {
      el.style.backgroundImage = `url("${canvas.toDataURL("image/png")}")`;
    }
  }

  // Samsa'nın 3 çapraz ışık bandını Riso 45° nokta tramı + ince çizgi olarak bas
  function renderDiagonalOverlay(palette) {
    const canvas = document.getElementById("overlay-canvas");
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    canvas.width = Math.max(1, Math.round(vw * dpr));
    canvas.height = Math.max(1, Math.round(vh * dpr));

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);

    const [pr, pg, pb] = hexToRgb(palette.paper);
    const [r3, g3, b3] = hexToRgb(palette.ink3);
    const [r1, g1, b1] = hexToRgb(palette.ink1);

    // Kâğıtla çarpımsal ön-karışım: GPU multiply maliyetine girmeden aynı mürekkep tonu
    const mr3 = Math.round((r3 * pr) / 255);
    const mg3 = Math.round((g3 * pg) / 255);
    const mb3 = Math.round((b3 * pb) / 255);

    const bands = [-0.35, 0.0, 0.35];
    const pitch = 9.8;
    const step = pitch * Math.SQRT1_2; // ~6.93px kafes adımı

    ctx.fillStyle = `rgba(${mr3}, ${mg3}, ${mb3}, 0.54)`;
    ctx.beginPath();

    // Doğrudan görünür 45° kafes sınırları (400k yerine ~10k nokta — ~40x daha hızlı)
    const sMin = Math.floor(-pitch / step);
    const sMax = Math.ceil((vh + pitch) / step);
    for (let s = sMin; s <= sMax; s++) {
      const cy = s * step;
      const ny = cy / vh;
      const maxX = Math.min(vw + pitch, (ny + 0.35) * vw + 1);
      if (maxX < -pitch) continue;

      let dMin = Math.ceil(-pitch / step);
      if (((dMin ^ s) & 1) !== 0) dMin += 1;
      const dMax = Math.floor(maxX / step);

      for (let d = dMin; d <= dMax; d += 2) {
        const cx = d * step;
        const nx = cx / vw;
        let density = 0;
        if (nx <= ny - 0.35) density = 3;
        else if (nx <= ny) density = 2;
        else if (nx <= ny + 0.35) density = 1;
        else break;

        const radius = (0.68 + density * 0.38) * (0.9 - nx * 0.25);
        if (radius > 0.25) {
          ctx.moveTo(cx + radius, cy);
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        }
      }
    }
    ctx.fill();

    // 3 ince çapraz mürekkep çizgisi (overlay.svg <line> karşılığı)
    ctx.strokeStyle = `rgba(${r1}, ${g1}, ${b1}, 0.17)`;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    for (const offset of bands) {
      ctx.moveTo(offset * vw, 0);
      ctx.lineTo((1 + offset) * vw, vh);
    }
    ctx.stroke();
  }

  function sampleChannel(px, meta, x, y, channel) {
    if (y < meta.yTop || y >= meta.h) return 0;
    const wx = ((Math.round((x / meta.w) * meta.gw) % meta.gw) + meta.gw) % meta.gw;
    const gy = Math.min(meta.gh - 1, Math.max(0, Math.round(((y - meta.yTop) / (meta.h - meta.yTop)) * meta.gh)));
    return px[(gy * meta.gw + wx) * 4 + channel] / 255;
  }

  // Ön-baskı kalıp geometrisi bir kez çözülüp seyrek piksel tamponunda önbelleklenir
  let plateCache = null;
  let maskCallbacks = null;
  let lastTileCount = 0;

  function neededTiles() {
    const vh = Math.max(window.innerHeight || 900, 320);
    const approxBgSize = window.innerWidth <= 736
      ? Math.max(480, Math.min(840, 0.92 * vh))
      : Math.max(540, Math.min(1660, 1.40 * vh));
    return window.innerWidth > approxBgSize * 1.9 ? 4 : 3;
  }

  function stampMountainStrip(cache) {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas || !cache) return;
    const tiles = neededTiles();
    const { cw, ch, compCanvas } = cache;

    if (canvas.width !== cw * tiles || canvas.height !== ch) {
      canvas.width = cw * tiles;
      canvas.height = ch;
    }
    if (lastTileCount !== tiles) {
      lastTileCount = tiles;
      document.documentElement.style.setProperty("--bg-tiles", String(tiles));
    }

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let t = 0; t < tiles; t++) {
      ctx.drawImage(compCanvas, t * cw, 0);
    }
  }

  function ensurePlateCache(cb) {
    if (plateCache) {
      cb(plateCache);
      return;
    }
    if (maskCallbacks) {
      maskCallbacks.push(cb);
      return;
    }
    maskCallbacks = [cb];

    const meta = window.SAMSA_MOUNTAIN;
    const img = new Image();
    img.onload = () => {
      const mCanvas = document.createElement("canvas");
      mCanvas.width = meta.gw;
      mCanvas.height = meta.gh;
      const mCtx = mCanvas.getContext("2d");
      mCtx.drawImage(img, 0, 0);
      const px = mCtx.getImageData(0, 0, meta.gw, meta.gh).data;

      const W = meta.w;
      const H = meta.h;
      const Hcrop = H - Y_CROP_TOP;
      const scale = PLATE_SCALE;
      const cw = Math.round(W * scale);
      const ch = Math.round(Hcrop * scale);

      // 1) Kalıp 3 maskesi: 14.04° dikişsiz nokta tramı
      const cCool = document.createElement("canvas");
      cCool.width = cw;
      cCool.height = ch;
      const gCool = cCool.getContext("2d");
      gCool.scale(scale, scale);
      gCool.translate(0, -Y_CROP_TOP);
      gCool.fillStyle = "#000";

      const dx = W / 255;
      const dy = dx / 4;
      gCool.beginPath();
      for (let v = -75; v < 75; v++) {
        for (let u = -25; u < 285; u++) {
          const cx = u * dx - v * dy;
          const cy = meta.yTop - 8 + u * dy + v * dx;
          if (cx < -6 || cx > W + 6 || cy < meta.yTop - 2 || cy > H + 4) continue;
          const d = sampleChannel(px, meta, cx, cy, 0);
          if (d < 0.14) continue;
          const radius = Math.sqrt(d) * 2.52 * (0.94 + hashPeriodic(cx, cy, W) * 0.12);
          gCool.moveTo(cx + radius, cy);
          gCool.arc(cx, cy, radius, 0, Math.PI * 2);
        }
      }
      gCool.fill();

      // 2) Kalıp 2 maskesi: 45° mimari tarama çizgileri
      const cWarm = document.createElement("canvas");
      cWarm.width = cw;
      cWarm.height = ch;
      const gWarm = cWarm.getContext("2d");
      gWarm.scale(scale, scale);
      gWarm.translate(0, -Y_CROP_TOP);
      gWarm.strokeStyle = "#000";
      gWarm.lineCap = "round";

      const stepWarm = 6;
      const yMin = meta.yTop;
      const kMin = Math.floor((yMin - 10) / stepWarm);
      const kMax = Math.ceil((W + H + 10) / stepWarm);

      for (let k = kMin; k <= kMax; k++) {
        const s = k * stepWarm;
        const xStart = Math.max(-8, s - H);
        const xEnd = Math.min(W + 8, s - yMin);
        if (xEnd <= xStart) continue;

        let drawing = false;
        let segX0 = 0;
        let segY0 = 0;
        let maxW = 0;

        for (let x = xStart; x <= xEnd; x += 2.5) {
          const y = s - x;
          const wVal = sampleChannel(px, meta, x, y, 1);
          const hit = wVal > 0.18 && hashPeriodic(x, y, W) > 0.04;
          if (hit && !drawing) {
            drawing = true;
            segX0 = x;
            segY0 = y;
            maxW = wVal;
          } else if (hit && drawing) {
            if (wVal > maxW) maxW = wVal;
          } else if (!hit && drawing) {
            drawing = false;
            gWarm.lineWidth = 0.85 + maxW * 1.15;
            gWarm.beginPath();
            gWarm.moveTo(segX0, segY0);
            gWarm.lineTo(x - 2.5, s - (x - 2.5));
            gWarm.stroke();
          }
        }
        if (drawing) {
          gWarm.lineWidth = 0.85 + maxW * 1.15;
          gWarm.beginPath();
          gWarm.moveTo(segX0, segY0);
          gWarm.lineTo(xEnd, s - xEnd);
          gWarm.stroke();
        }
      }

      // 3) Kalıp 1 maskesi: -45° derin tarama + ezilme cepleri + keskin siluet konturu
      const cDark = document.createElement("canvas");
      cDark.width = cw;
      cDark.height = ch;
      const gDark = cDark.getContext("2d");
      gDark.scale(scale, scale);
      gDark.translate(0, -Y_CROP_TOP);
      gDark.strokeStyle = "#000";
      gDark.fillStyle = "#000";
      gDark.lineCap = "round";
      gDark.lineJoin = "round";

      const stepDark = 5;
      const kdMin = Math.floor((-H - 10) / stepDark);
      const kdMax = Math.ceil((W - yMin + 10) / stepDark);

      for (let k = kdMin; k <= kdMax; k++) {
        const s = k * stepDark;
        const xStart = Math.max(-8, s + yMin);
        const xEnd = Math.min(W + 8, s + H);
        if (xEnd <= xStart) continue;

        let drawing = false;
        let segX0 = 0;
        let segY0 = 0;
        let maxD = 0;

        for (let x = xStart; x <= xEnd; x += 2) {
          const y = x - s;
          const dVal = sampleChannel(px, meta, x, y, 2);
          const hit = dVal > 0.25 && hashPeriodic(x + 17, y + 31, W) > 0.03;
          if (hit && !drawing) {
            drawing = true;
            segX0 = x;
            segY0 = y;
            maxD = dVal;
          } else if (hit && drawing) {
            if (dVal > maxD) maxD = dVal;
          } else if (!hit && drawing) {
            drawing = false;
            gDark.lineWidth = 1.05 + maxD * 1.95;
            gDark.beginPath();
            gDark.moveTo(segX0, segY0);
            gDark.lineTo(x - 2, (x - 2) - s);
            gDark.stroke();
          }
        }
        if (drawing) {
          gDark.lineWidth = 1.05 + maxD * 1.95;
          gDark.beginPath();
          gDark.moveTo(segX0, segY0);
          gDark.lineTo(xEnd, xEnd - s);
          gDark.stroke();
        }
      }

      for (let y = meta.yTop; y < H; y += 3) {
        for (let x = 0; x < W; x += 3) {
          const dVal = sampleChannel(px, meta, x, y, 2);
          if (dVal > 0.72 && hashPeriodic(x + 7, y + 13, W) > 0.14) {
            gDark.fillRect(x - 1.2, y - 1.2, 2.5, 2.5);
          }
        }
      }

      const ridge = meta.ridge;
      const nR = ridge.length;
      gDark.lineWidth = 2.15;
      gDark.beginPath();
      for (let i = -2; i <= nR + 2; i++) {
        const idx = ((i % nR) + nR) % nR;
        const x = (i / nR) * W;
        const y = ridge[idx];
        if (i === -2) {
          gDark.moveTo(x, y);
        } else {
          const prevIdx = (((i - 1) % nR) + nR) % nR;
          const px0 = ((i - 1) / nR) * W;
          const py0 = ridge[prevIdx];
          const mx = (px0 + x) * 0.5;
          const my = (py0 + y) * 0.5;
          gDark.quadraticCurveTo(px0, py0, mx, my);
        }
      }
      gDark.stroke();

      // Alfa kanallarını Riso kayıt kaymasıyla (-2,+2) & (+2.5,+1.5) paketle (yalnız dolu pikseller)
      const dCool = gCool.getImageData(0, 0, cw, ch).data;
      const dWarm = gWarm.getImageData(0, 0, cw, ch).data;
      const dDark = gDark.getImageData(0, 0, cw, ch).data;

      const sxCool = Math.round(-2 * scale);
      const syCool = Math.round(2 * scale);
      const sxWarm = Math.round(2.5 * scale);
      const syWarm = Math.round(1.5 * scale);

      const total = cw * ch;
      const tmpIdx = new Uint32Array(total);
      const tmpC1 = new Uint8Array(total);
      const tmpC2 = new Uint8Array(total);
      const tmpC3 = new Uint8Array(total);
      let count = 0;

      for (let y = 0; y < ch; y++) {
        const yC = y - syCool;
        const yW = y - syWarm;
        const validC = yC >= 0 && yC < ch;
        const validW = yW >= 0 && yW < ch;
        const rowOff = y * cw;
        const rowC = yC * cw;
        const rowW = yW * cw;

        for (let x = 0; x < cw; x++) {
          const p = rowOff + x;
          const a3 = dDark[p * 4 + 3];
          let a1 = 0;
          if (validC) {
            const xC = (x - sxCool + cw) % cw;
            a1 = dCool[(rowC + xC) * 4 + 3];
          }
          let a2 = 0;
          if (validW) {
            const xW = (x - sxWarm + cw) % cw;
            a2 = dWarm[(rowW + xW) * 4 + 3];
          }

          if ((a1 | a2 | a3) !== 0) {
            tmpIdx[count] = p;
            tmpC1[count] = a1;
            tmpC2[count] = a2;
            tmpC3[count] = a3;
            count++;
          }
        }
      }

      const compCanvas = document.createElement("canvas");
      compCanvas.width = cw;
      compCanvas.height = ch;
      const compCtx = compCanvas.getContext("2d");

      plateCache = {
        cw,
        ch,
        count,
        idx: tmpIdx.slice(0, count),
        c1: tmpC1.slice(0, count),
        c2: tmpC2.slice(0, count),
        c3: tmpC3.slice(0, count),
        compCanvas,
        compCtx,
        compImg: compCtx.createImageData(cw, ch),
      };

      const pending = maskCallbacks;
      maskCallbacks = null;
      for (const fn of pending) fn(plateCache);
    };
    img.src = meta.maskPng;
  }

  // Ön-baskısı birleştirilmiş tek kalıp oluştur: CSS multiply ile bit-birebir renk karışımı (senkron <canvas> şeridi)
  function renderMountainComposite(palette) {
    ensurePlateCache((cache) => {
      const [pr, pg, pb] = hexToRgb(palette.paper);
      const [r1, g1, b1] = hexToRgb(palette.ink1);
      const [r2, g2, b2] = hexToRgb(palette.ink2);
      const [r3, g3, b3] = hexToRgb(palette.ink3);

      const n1r = 1 - r1 / 255, n1g = 1 - g1 / 255, n1b = 1 - b1 / 255;
      const n2r = 1 - r2 / 255, n2g = 1 - g2 / 255, n2b = 1 - b2 / 255;
      const n3r = 1 - r3 / 255, n3g = 1 - g3 / 255, n3b = 1 - b3 / 255;

      const { count, idx, c1: arr1, c2: arr2, c3: arr3, compCtx, compImg } = cache;
      const out = compImg.data;

      for (let k = 0; k < count; k++) {
        const c1 = arr1[k] / 255;
        const c2 = arr2[k] / 255;
        const c3 = arr3[k] / 255;
        const aT = 1 - (1 - c1) * (1 - c2) * (1 - c3);
        const q = idx[k] * 4;

        if (aT <= 0.002) {
          out[q + 3] = 0;
          continue;
        }

        const tr = (1 - c1 * n3r) * (1 - c2 * n2r) * (1 - c3 * n1r);
        const tg = (1 - c1 * n3g) * (1 - c2 * n2g) * (1 - c3 * n1g);
        const tb = (1 - c1 * n3b) * (1 - c2 * n2b) * (1 - c3 * n1b);

        const invA = 1 / aT;
        out[q]     = Math.round(pr * Math.max(0, Math.min(1, 1 - (1 - tr) * invA)));
        out[q + 1] = Math.round(pg * Math.max(0, Math.min(1, 1 - (1 - tg) * invA)));
        out[q + 2] = Math.round(pb * Math.max(0, Math.min(1, 1 - (1 - tb) * invA)));
        out[q + 3] = Math.round(aT * 255);
      }

      compCtx.putImageData(compImg, 0, 0);
      stampMountainStrip(cache);
    });
  }

  let currentIndex = 0;
  let printTimer = null;

  function applyPalette(index, animatePress) {
    currentIndex = ((index % PALETTES.length) + PALETTES.length) % PALETTES.length;
    const p = PALETTES[currentIndex];
    const root = document.documentElement;

    if (animatePress) {
      document.body.classList.add("printing");
      clearTimeout(printTimer);
    }

    root.style.setProperty("--paper", p.paper);
    root.style.setProperty("--ink-1", p.ink1);
    root.style.setProperty("--ink-2", p.ink2);
    root.style.setProperty("--ink-3", p.ink3);
    document.body.setAttribute("data-palette", p.id);

    renderDiagonalOverlay(p);
    renderMountainComposite(p);

    if (animatePress) {
      printTimer = setTimeout(() => {
        document.body.classList.remove("printing");
      }, 90);
    }
  }

  function resolveInitialPalette() {
    const params = new URLSearchParams(window.location.search);
    const req = params.get("palet") || params.get("wada");
    if (req) {
      const found = PALETTES.findIndex((p) => p.id === req.trim());
      if (found >= 0) return found;
    }
    return 0; // Varsayılan: Wada 167
  }

  // Başlat
  window.addEventListener("DOMContentLoaded", () => {
    buildPaperGrain();
    applyPalette(resolveInitialPalette(), false);

    // Gizli Wada Sanzo palet kısayolu (P tuşu)
    window.addEventListener("keydown", (e) => {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if ((e.key === "p" || e.key === "P") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        applyPalette(currentIndex + 1, true);
      }
    });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderDiagonalOverlay(PALETTES[currentIndex]);
        if (plateCache && neededTiles() !== lastTileCount) {
          stampMountainStrip(plateCache);
        }
      }, 120);
    });
  });

  window.addEventListener("load", () => {
    document.body.classList.add("printing");
    requestAnimationFrame(() => {
      document.body.classList.remove("loading");
      setTimeout(() => {
        document.body.classList.remove("printing");
      }, 180);
    });
  });

  // Mobil: yatay kaydırmayı ve orientation değişimini yönet
  window.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  window.addEventListener("orientationchange", () => {
    document.documentElement.scrollTop = 0;
  });
})();
