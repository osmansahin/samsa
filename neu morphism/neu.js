/* ============================================================
   Samsa Neumorphism Yüzey ve Dağ Kabartma Motoru
   Tek parça mat seramik yüzey (#DDE3EA) üzerinde 135° yumuşak ışık
   düzlemleri + bilineer normal türevli bas-relief dağ panoraması
   ============================================================ */

(() => {
  "use strict";

  const SURFACE = [221, 227, 234]; // #DDE3EA (Toz Taşı / Sis Seramiği)
  const LIGHT   = [252, 254, 255]; // Sol-üst ışık vurgusu
  const SHADOW  = [166, 180, 198]; // Alt-sağ yumuşak soğuk gölge

  const Y_CROP_TOP = 168;
  const PLATE_SCALE = 1.2; // 1500x332 -> 1800x398 yumuşak yüksek çözünürlüklü kabartma

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Periyodik sırt yüksekliği (x=0 ve x=W kesintisiz dikiş)
  function sampleRidge(ridge, W, x) {
    const n = ridge.length;
    const fx = (((x / W) * n) % n + n) % n;
    const i0 = Math.floor(fx);
    const i1 = (i0 + 1) % n;
    const t = fx - i0;
    const s = t * t * (3 - 2 * t);
    return ridge[i0] + (ridge[i1] - ridge[i0]) * s;
  }

  // Bilineer kanal örneklemesi: kayalar arasında piksel kırığı olmadan yumuşak eğim üretir
  function sampleBilinear(px, meta, x, y) {
    const gx = (((x / meta.w) * meta.gw) % meta.gw + meta.gw) % meta.gw;
    const gy = clamp(((y - meta.yTop) / (meta.h - meta.yTop)) * (meta.gh - 1), 0, meta.gh - 1);

    const x0 = Math.floor(gx) % meta.gw;
    const x1 = (x0 + 1) % meta.gw;
    const y0 = Math.floor(gy);
    const y1 = Math.min(meta.gh - 1, y0 + 1);
    const tx = gx - Math.floor(gx);
    const ty = gy - y0;

    const p00 = (y0 * meta.gw + x0) * 4;
    const p10 = (y0 * meta.gw + x1) * 4;
    const p01 = (y1 * meta.gw + x0) * 4;
    const p11 = (y1 * meta.gw + x1) * 4;

    const r = lerp(lerp(px[p00], px[p10], tx), lerp(px[p01], px[p11], tx), ty) / 255;
    const g = lerp(lerp(px[p00 + 1], px[p10 + 1], tx), lerp(px[p01 + 1], px[p11 + 1], tx), ty) / 255;
    const b = lerp(lerp(px[p00 + 2], px[p10 + 2], tx), lerp(px[p01 + 2], px[p11 + 2], tx), ty) / 255;

    // Kar/güneşli yamaç (r) yüzeyden kabarık, derin yarıklar (b) içe oyuk
    return {
      r,
      g,
      b,
      h: r * 0.62 + g * 0.28 - b * 0.85,
    };
  }

  // Samsa'nın 3 çapraz ışık bandını 135° mimari alçı kademesi / ışık düzlemi olarak çiz
  function renderSoftOverlay() {
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

    const bands = [-0.35, 0.0, 0.35];

    // Üst soldan süzülen yumuşak kademeli yüzey düzlemleri
    for (let i = 0; i < bands.length; i++) {
      const off = bands[i];
      const nextOff = i + 1 < bands.length ? bands[i + 1] : 1.0;

      // Düzlemin kendisi: sol-üst kenarda çok hafif aydınlanma, aşağı sağda yumuşak düşüş
      const x0 = off * vw;
      const x1 = (1 + off) * vw;
      const nx0 = nextOff * vw;
      const nx1 = (1 + nextOff) * vw;

      const midStartX = x0 + (nx0 - x0) * 0.5;
      const grad = ctx.createLinearGradient(x0, 0, midStartX + vh * 0.12, vh * 0.45);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.22)");
      grad.addColorStop(0.55, "rgba(255, 255, 255, 0.04)");
      grad.addColorStop(1, "rgba(162, 175, 194, 0.07)");

      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(nx0, 0);
      ctx.lineTo(nx1, vh);
      ctx.lineTo(x1, vh);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Kademe kenarında sol-üstten gelen ipeksi pah (bevel) çizgisi
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x1, vh);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
      ctx.lineWidth = 1.1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x0 - 1.5, 0);
      ctx.lineTo(x1 - 1.5, vh);
      ctx.strokeStyle = "rgba(155, 170, 190, 0.22)";
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }

  let reliefCanvas = null;
  let lastTileCount = 0;

  function neededTiles() {
    const vh = Math.max(window.innerHeight || 900, 320);
    const approxBgSize = window.innerWidth <= 736
      ? Math.max(480, Math.min(840, 0.92 * vh))
      : Math.max(540, Math.min(1660, 1.40 * vh));
    return window.innerWidth > approxBgSize * 1.9 ? 4 : 3;
  }

  function stampMountainStrip() {
    const canvas = document.getElementById("bg-canvas");
    if (!canvas || !reliefCanvas) return;
    const tiles = neededTiles();
    const cw = reliefCanvas.width;
    const ch = reliefCanvas.height;

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
      ctx.drawImage(reliefCanvas, t * cw, 0);
    }
  }

  function buildMountainRelief() {
    const meta = window.SAMSA_MOUNTAIN;
    if (!meta) return;

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
      const cw = Math.round(W * PLATE_SCALE);
      const ch = Math.round(Hcrop * PLATE_SCALE);

      const comp = document.createElement("canvas");
      comp.width = cw;
      comp.height = ch;
      const ctx = comp.getContext("2d");
      const outImg = ctx.createImageData(cw, ch);
      const out = outImg.data;

      const eps = 2.4;

      for (let py = 0; py < ch; py++) {
        const y = Y_CROP_TOP + py / PLATE_SCALE;
        // Taban ufku alt kenarda yumuşakça erisin
        const bottomBlend = clamp((H - 22 - y) / 28, 0, 1);

        for (let pxX = 0; pxX < cw; pxX++) {
          const x = pxX / PLATE_SCALE;
          const ridgeY = sampleRidge(meta.ridge, W, x);
          const distFromRidge = y - ridgeY;

          // Gökyüzü sırtı üstü: yalnız 135° kenar pahı / yumuşak dış kenar geçişi
          if (distFromRidge < -3.2) continue;

          // Sırt eğimi: eksi => sol-üst ışığa bakan yamaç, artı => alt-sağ gölge yamacı
          const rSlope = (sampleRidge(meta.ridge, W, x + 2.5) - sampleRidge(meta.ridge, W, x - 2.5)) / 5.0;

          const q = (py * cw + pxX) * 4;
          const rimSide = clamp(-rSlope * 1.45 + 0.3, -1, 1);

          // Sırt çizgisi üstündeki yumuşak dış kenar (-3.2 .. +0.8 arasında gövdeye kesintisiz geçer)
          if (distFromRidge < 0) {
            const t = clamp((distFromRidge + 3.2) / 3.2, 0, 1);
            const smoothT = t * t * (3 - 2 * t);
            if (rimSide >= 0) {
              out[q]     = Math.round(lerp(SURFACE[0], LIGHT[0], 0.92));
              out[q + 1] = Math.round(lerp(SURFACE[1], LIGHT[1], 0.92));
              out[q + 2] = Math.round(lerp(SURFACE[2], LIGHT[2], 0.92));
              out[q + 3] = Math.round(smoothT * (0.45 + 0.45 * rimSide) * 255);
            } else {
              out[q]     = Math.round(lerp(SURFACE[0], SHADOW[0], 0.65));
              out[q + 1] = Math.round(lerp(SURFACE[1], SHADOW[1], 0.65));
              out[q + 2] = Math.round(lerp(SURFACE[2], SHADOW[2], 0.65));
              out[q + 3] = Math.round(smoothT * (0.28 + 0.35 * (-rimSide)) * 255);
            }
            continue;
          }

          // Yüzey yükseklik alanı gradyanı (sol-üst ışık yönü L = (-0.707, -0.707))
          const sC = sampleBilinear(px, meta, x, y);
          const sL = sampleBilinear(px, meta, x - eps, y);
          const sR = sampleBilinear(px, meta, x + eps, y);
          const sU = sampleBilinear(px, meta, x, y - eps);
          const sD = sampleBilinear(px, meta, x, y + eps);

          const dhdx = (sR.h - sL.h) / (2 * eps);
          const dhdy = (sD.h - sU.h) / (2 * eps);

          // 135° yönlü ışık çarpanı (-1..+1): yüksek tepe ve sol-üst yüzeyler ışığı yakalar
          const dirLight = clamp((-dhdx - dhdy) * 8.2 + (sC.r - sC.b) * 0.48, -1, 1);

          // Sırt çizgisi yakını (ilk 14px): kabartma pah kenarı + gölgeli tarafta derinlik
          const crestBand = Math.exp(-distFromRidge / 7.5);
          const crestBias = clamp(-rSlope * 1.2 + 0.28, -0.78, 0.92) * crestBand * 0.82;

          // Yarıklarda (b kanalı) yumuşak içbükey gölge
          const creviceAO = -sC.b * 0.52;

          // Toplam kabartma aydınlatması (-1 gölge .. +1 parlak yüzey)
          const relief = clamp((dirLight * 0.68 + crestBias + creviceAO) * (0.24 + 0.76 * bottomBlend), -1, 1);

          let rr, gg, bb;
          if (relief >= 0) {
            const k = relief * 0.86;
            rr = Math.round(lerp(SURFACE[0], LIGHT[0], k));
            gg = Math.round(lerp(SURFACE[1], LIGHT[1], k));
            bb = Math.round(lerp(SURFACE[2], LIGHT[2], k));
          } else {
            const k = (-relief) * 0.86;
            rr = Math.round(lerp(SURFACE[0], SHADOW[0], k));
            gg = Math.round(lerp(SURFACE[1], SHADOW[1], k));
            bb = Math.round(lerp(SURFACE[2], SHADOW[2], k));
          }

          // Sırtın hemen altındaki 2px bandında dış kenar renginden gövde rengine pürüzsüz geçiş
          const edgeJoin = clamp(distFromRidge / 2.0, 0, 1);
          const rimR = rimSide >= 0 ? lerp(SURFACE[0], LIGHT[0], 0.92) : lerp(SURFACE[0], SHADOW[0], 0.65);
          const rimG = rimSide >= 0 ? lerp(SURFACE[1], LIGHT[1], 0.92) : lerp(SURFACE[1], SHADOW[1], 0.65);
          const rimB = rimSide >= 0 ? lerp(SURFACE[2], LIGHT[2], 0.92) : lerp(SURFACE[2], SHADOW[2], 0.65);
          const rimA = rimSide >= 0 ? (0.45 + 0.45 * rimSide) : (0.28 + 0.35 * (-rimSide));

          // Alt tabana yaklaşınca zemin rengiyle eriyip alpha ile kaynaşır
          const bodyA = lerp(rimA, 0.35 + 0.65 * bottomBlend, edgeJoin);
          out[q]     = Math.round(lerp(rimR, rr, edgeJoin));
          out[q + 1] = Math.round(lerp(rimG, gg, edgeJoin));
          out[q + 2] = Math.round(lerp(rimB, bb, edgeJoin));
          out[q + 3] = Math.round(bodyA * 255);
        }
      }

      ctx.putImageData(outImg, 0, 0);
      reliefCanvas = comp;
      stampMountainStrip();
    };
    img.src = meta.maskPng;
  }

  window.addEventListener("DOMContentLoaded", () => {
    renderSoftOverlay();
    buildMountainRelief();

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderSoftOverlay();
        if (reliefCanvas && neededTiles() !== lastTileCount) {
          stampMountainStrip();
        }
      }, 120);
    });
  });

  window.addEventListener("load", () => {
    requestAnimationFrame(() => {
      document.body.classList.remove("loading");
    });
  });

  window.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  window.addEventListener("orientationchange", () => {
    document.documentElement.scrollTop = 0;
  });
})();
