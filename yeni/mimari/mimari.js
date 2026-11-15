/* ============================================================
   Pafta A-01 — Osman Şahin Ev-Atölyesi
   Plan ve kesit, santimetre biriminde SVG olarak üretilir (1 birim = 1 cm).
   ============================================================ */
(() => {
  "use strict";

  const T_EXT = 25;
  const T_INT = 12;

  // ── Mahaller (bağlantılar) ──
  const ROOMS = [
    { id: "blog", no: "01", name: "Okuma odası", fin: "Meşe parke", x: 12, y: 12, w: 542, h: 462,
      href: "https://blog.sahinosman.com", link: "Blog", sub: "blog.sahinosman.com", lx: 300, ly: 300 },
    { id: "youtube", no: "02", name: "Salon · gösterim", fin: "Meşe parke", x: 566, y: 12, w: 822, h: 462,
      href: "https://www.youtube.com/user/sahinosman58", link: "YouTube", sub: "sahinosman58", lx: 800, ly: 345 },
    { id: "tezgah", no: "03", name: "Mutfak", fin: "Seramik", x: 12, y: 486, w: 442, h: 402,
      href: "https://www.youtube.com/@Tezgah-b", link: "Tezgâh", sub: "@Tezgah-b", lx: 262, ly: 548 },
    { id: "pinterest", no: "04", name: "Hol · pano duvarı", short: "Hol", fin: "Doğal taş", x: 466, y: 486, w: 288, h: 402,
      href: "https://tr.pinterest.com/osuranboga/", link: "Pinterest", sub: "osuranboga", lx: 625, ly: 700 },
    { id: "vsco", no: "05", name: "Karanlık oda", fin: "Epoksi", x: 766, y: 486, w: 248, h: 208, scale: 0.78,
      href: "https://vsco.co/samsaninsirtinayapisanelma/", link: "VSCO", sub: "fotoğraf", lx: 856, ly: 590 },
    { id: "github", no: "06", name: "Arşiv", fin: "Brüt beton", x: 1026, y: 486, w: 362, h: 402,
      href: "https://github.com/osmansahin", link: "GitHub", sub: "osmansahin", lx: 1165, ly: 556 },
    { id: "eposta", no: "07", name: "Giriş · posta kutusu", short: "Giriş", fin: "Doğal taş", x: 460, y: 912, w: 300, h: 128,
      href: "mailto:sahinosman.58@gmail.com?Subject=Merhabaa", link: "E-posta", sub: "bir merhaba yaz", lx: 650, ly: 1004 },
  ];

  // ── Duvarlar: o = yön (h/v), at = eksen, from/to = uzunluk, op = boşluklar ──
  // k: w pencere · d kapı · o kapısız boşluk ; side: kanadın açıldığı yön (+/-)
  const WALLS = [
    { o: "h", at: 0, from: 0, to: 1400, t: T_EXT, op: [{ a: 120, b: 440, k: "w" }, { a: 700, b: 1300, k: "w" }] },
    { o: "h", at: 900, from: 0, to: 1400, t: T_EXT, op: [{ a: 120, b: 340, k: "w" }, { a: 840, b: 940, k: "w" }, { a: 560, b: 660, k: "d", hinge: "a", side: -1 }] },
    { o: "v", at: 0, from: 0, to: 900, t: T_EXT, op: [{ a: 120, b: 360, k: "w" }, { a: 560, b: 820, k: "w" }] },
    { o: "v", at: 1400, from: 0, to: 900, t: T_EXT, op: [{ a: 100, b: 380, k: "w" }, { a: 600, b: 720, k: "w" }] },
    { o: "h", at: 480, from: 0, to: 1400, t: T_INT, op: [{ a: 474, b: 554, k: "d", hinge: "a", side: -1 }, { a: 600, b: 740, k: "o" }, { a: 1290, b: 1380, k: "d", hinge: "b", side: 1 }] },
    { o: "v", at: 460, from: 480, to: 900, t: T_INT, op: [{ a: 790, b: 870, k: "d", hinge: "b", side: -1 }] },
    { o: "v", at: 760, from: 480, to: 900, t: T_INT, op: [{ a: 560, b: 640, k: "d", hinge: "a", side: 1 }, { a: 770, b: 850, k: "d", hinge: "b", side: 1 }] },
    { o: "v", at: 1020, from: 480, to: 900, t: T_INT, op: [] },
    { o: "h", at: 700, from: 760, to: 1020, t: T_INT, op: [] },
    { o: "v", at: 560, from: 0, to: 480, t: T_INT, op: [] },
  ];

  const AX_X = [["A", 0], ["B", 460], ["C", 760], ["D", 1020], ["E", 1400]];
  const AX_Y = [["1", 0], ["2", 480], ["3", 900]];

  const f = (n) => Math.round(n * 10) / 10;
  const svgEsc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  // ── Plan ───────────────────────────────────────────────────
  function wallSvg(w) {
    const out = [];
    const ext = w.t === T_EXT;
    const from = w.from - (ext ? w.t / 2 : 0);
    const to = w.to + (ext ? w.t / 2 : 0);
    const ops = [...w.op].sort((p, q) => p.a - q.a);
    // (u = uzunluk ekseni, v = kalınlık ekseni) → x,y
    const P = (u, v) => (w.o === "h" ? [u, v] : [v, u]);
    const rect = (u0, u1, v0, v1, cls) => {
      const [x0, y0] = P(u0, v0);
      const [x1, y1] = P(u1, v1);
      out.push(`<rect class="${cls}" x="${f(Math.min(x0, x1))}" y="${f(Math.min(y0, y1))}" width="${f(Math.abs(x1 - x0))}" height="${f(Math.abs(y1 - y0))}"/>`);
    };
    const line = (u0, v0, u1, v1, cls) => {
      const [x0, y0] = P(u0, v0);
      const [x1, y1] = P(u1, v1);
      out.push(`<line class="${cls}" x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}"/>`);
    };
    const v0 = w.at - w.t / 2, v1 = w.at + w.t / 2;

    let cur = from;
    for (const o of ops) {
      if (o.a > cur) rect(cur, o.a, v0, v1, "poche");
      cur = o.b;
    }
    if (to > cur) rect(cur, to, v0, v1, "poche");

    for (const o of ops) {
      if (o.k === "w") {
        line(o.a, v0, o.b, v0, "thin");
        line(o.a, v1, o.b, v1, "thin");
        line(o.a, w.at - 2.5, o.b, w.at - 2.5, "glass");
        line(o.a, w.at + 2.5, o.b, w.at + 2.5, "glass");
        line(o.a, v0, o.a, v1, "thin");
        line(o.b, v0, o.b, v1, "thin");
        if (ext) {
          // dış denizlik
          const s = w.at === 0 || (w.o === "v" && w.at === 0) ? v0 - 6 : v1 + 6;
          line(o.a - 5, s, o.b + 5, s, "hair");
        }
      } else if (o.k === "o") {
        line(o.a, v0, o.b, v0, "hidden");
        line(o.a, v1, o.b, v1, "hidden");
      } else if (o.k === "d") {
        const len = o.b - o.a;
        const hu = o.hinge === "a" ? o.a : o.b;
        const ou = o.hinge === "a" ? o.b : o.a;
        const face = o.side > 0 ? v1 : v0;
        const [hx, hy] = P(hu, face);
        const [lx, ly] = P(hu, face + o.side * len);
        const [ox, oy] = P(ou, face);
        out.push(`<line class="leaf" x1="${f(hx)}" y1="${f(hy)}" x2="${f(lx)}" y2="${f(ly)}"/>`);
        const cross = (lx - hx) * (oy - hy) - (ly - hy) * (ox - hx);
        out.push(`<path class="swing" d="M${f(lx)} ${f(ly)}A${len} ${len} 0 0 ${cross > 0 ? 1 : 0} ${f(ox)} ${f(oy)}"/>`);
        line(o.a, v0, o.a, v1, "thin");
        line(o.b, v0, o.b, v1, "thin");
      }
    }
    return out.join("");
  }

  function dimChain(o, at, ticks, labelSide) {
    // o: h (yatay ölçü) / v ; at: ölçü çizgisinin konumu ; ticks: ölçü noktaları
    const out = [];
    const P = (u, v) => (o === "h" ? [u, v] : [v, u]);
    const [a0x, a0y] = P(ticks[0], at);
    const [a1x, a1y] = P(ticks[ticks.length - 1], at);
    out.push(`<line class="dim" x1="${a0x - (o === "h" ? 20 : 0)}" y1="${a0y - (o === "v" ? 20 : 0)}" x2="${a1x + (o === "h" ? 20 : 0)}" y2="${a1y + (o === "v" ? 20 : 0)}"/>`);
    ticks.forEach((t) => {
      const [x, y] = P(t, at);
      out.push(`<line class="tick" x1="${x - 9}" y1="${y + 9}" x2="${x + 9}" y2="${y - 9}"/>`);
      const [ex0, ey0] = P(t, at + (labelSide < 0 ? -14 : 14));
      const [ex1, ey1] = P(t, at + (labelSide < 0 ? 40 : -40));
      out.push(`<line class="ext" x1="${ex0}" y1="${ey0}" x2="${ex1}" y2="${ey1}"/>`);
    });
    for (let i = 0; i < ticks.length - 1; i++) {
      const mid = (ticks[i] + ticks[i + 1]) / 2;
      const val = ticks[i + 1] - ticks[i];
      const [x, y] = P(mid, at - 9);
      if (o === "h") out.push(`<text class="dimtxt" x="${x}" y="${y}" text-anchor="middle">${val}</text>`);
      else out.push(`<text class="dimtxt" x="${x}" y="${y}" text-anchor="middle" transform="rotate(-90 ${x} ${y})">${val}</text>`);
    }
    return out.join("");
  }

  function furniture() {
    const r = (x, y, w, h, extra = "") => `<rect class="furn" x="${x}" y="${y}" width="${w}" height="${h}" ${extra}/>`;
    const l = (x1, y1, x2, y2, cls = "furn") => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    const c = (x, y, rr, cls = "furn") => `<circle class="${cls}" cx="${x}" cy="${y}" r="${rr}"/>`;
    const s = [];

    // Okuma odası: kitaplık, çalışma masası, okuma koltuğu, lamba
    s.push(r(512, 40, 36, 410));
    for (let y = 90; y < 450; y += 52) s.push(l(512, y, 548, y));
    s.push(l(512, 40, 548, 450, "furn-x"));
    s.push(r(150, 20, 250, 70), r(242, 102, 64, 56, 'rx="10"'));
    s.push(r(60, 330, 92, 92, 'rx="14"'), r(60, 330, 92, 20, 'rx="6"'), r(60, 330, 18, 92, 'rx="6"'), r(134, 330, 18, 92, 'rx="6"'));
    s.push(c(185, 405, 15), c(185, 405, 4));
    s.push(`<ellipse class="furn rug" cx="290" cy="300" rx="150" ry="95"/>`);

    // Salon: perde, kanepe, sehpa, bitki
    s.push(r(574, 130, 12, 220), `<text class="note" x="604" y="245" transform="rotate(-90 604 245)">projeksiyon perdesi</text>`);
    s.push(r(1000, 120, 92, 260, 'rx="10"'), r(1066, 120, 26, 260, 'rx="8"'), r(1000, 120, 92, 22, 'rx="8"'), r(1000, 358, 92, 22, 'rx="8"'));
    s.push(l(1000, 207, 1066, 207), l(1000, 294, 1066, 294));
    s.push(r(830, 190, 80, 120, 'rx="4"'));
    s.push(c(1335, 70, 38), c(1335, 70, 14));
    for (let a = 0; a < 6; a++) {
      const t = (a / 6) * Math.PI * 2;
      s.push(l(1335 + Math.cos(t) * 14, 70 + Math.sin(t) * 14, 1335 + Math.cos(t) * 36, 70 + Math.sin(t) * 36));
    }
    s.push(l(700, 420, 1300, 420, "hidden"), `<text class="note" x="1000" y="452" text-anchor="middle">dağ manzarası · panoramik pencere</text>`);

    // Mutfak: L tezgâh, eviye, ocak, buzdolabı, yemek masası
    s.push(r(14, 500, 60, 386), r(74, 826, 290, 60));
    s.push(r(22, 640, 44, 74, 'rx="8"'), r(26, 646, 36, 30, 'rx="5"'), r(26, 680, 36, 28, 'rx="5"'));
    [[170, 842], [205, 842], [170, 872], [205, 872]].forEach(([x, y]) => s.push(c(x, y, 11)));
    s.push(r(384, 822, 64, 64), l(384, 822, 448, 886, "furn-x"), l(448, 822, 384, 886, "furn-x"));
    s.push(c(300, 720, 55));
    [[300, 645], [300, 795], [225, 720], [375, 720]].forEach(([x, y]) => s.push(r(x - 18, y - 18, 36, 36, 'rx="6"')));
    s.push(`<text class="note" x="44" y="610" text-anchor="middle" transform="rotate(-90 44 610)">tezgâh</text>`);

    // Hol: pano duvarı
    s.push(r(470, 520, 10, 250));
    for (let y = 540; y < 770; y += 34) s.push(c(486, y, 3.5, "pin"));
    s.push(`<text class="note" x="502" y="645" transform="rotate(90 502 645)">pano duvarı · mantar</text>`);
    s.push(`<g class="level"><path d="M690 830 l-12 -18 h24 z"/><text x="704" y="822">±0.00</text></g>`);

    // Karanlık oda: banyo tezgâhı, küvetler
    s.push(r(948, 500, 62, 186));
    [520, 580, 640].forEach((y) => s.push(r(956, y, 46, 40, 'rx="4"')));
    s.push(`<text class="note" x="856" y="682" text-anchor="middle" font-size="18">penceresiz · kırmızı ışık</text>`);

    // WC
    s.push(`<ellipse class="furn" cx="975" cy="830" rx="22" ry="30"/>`, r(948, 866, 54, 18, 'rx="3"'));
    s.push(r(790, 714, 60, 42, 'rx="10"'), c(820, 735, 12));
    s.push(`<text class="lbl-plain" x="860" y="815" text-anchor="middle">WC</text>`);

    // Arşiv: raf sistemi
    [1080, 1180, 1280].forEach((x) => {
      s.push(r(x, 630, 50, 230));
      for (let y = 630; y < 860; y += 46) s.push(l(x, y, x + 50, y + 45, "furn-x"));
    });

    // Giriş: sundurma, basamaklar, posta kutusu
    s.push(`<rect class="hair" x="460" y="912" width="300" height="128"/>`);
    [968, 1004].forEach((y) => s.push(l(470, y, 750, y)));
    s.push(r(470, 924, 40, 22, 'rx="3"'), `<text class="note" x="518" y="942">posta kutusu</text>`);
    s.push(`<path class="arrow" d="M520 1150 V1100 M508 1114 L520 1098 L532 1114"/>`);
    s.push(`<g class="level"><path d="M700 960 l-12 -18 h24 z"/><text x="714" y="952">−0.15</text></g>`);
    return s.join("");
  }

  function buildPlan() {
    const svg = document.getElementById("plan");
    const p = [];

    p.push(`<defs>
      <pattern id="hover-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="16" class="hatch-line"/></pattern>
    </defs>`);

    // Akslar
    p.push(`<g class="axes">`);
    AX_X.forEach(([n, x]) => {
      p.push(`<line class="axis" x1="${x}" y1="-262" x2="${x}" y2="960"/>`);
      p.push(`<circle class="bubble" cx="${x}" cy="-292" r="30"/><text class="bubtxt" x="${x}" y="-282" text-anchor="middle">${n}</text>`);
    });
    AX_Y.forEach(([n, y]) => {
      p.push(`<line class="axis" x1="-262" y1="${y}" x2="1460" y2="${y}"/>`);
      p.push(`<circle class="bubble" cx="-292" cy="${y}" r="30"/><text class="bubtxt" x="-292" y="${y + 10}" text-anchor="middle">${n}</text>`);
    });
    p.push(`</g>`);

    // Ölçü zincirleri
    p.push(`<g class="dims">`);
    p.push(dimChain("h", -110, AX_X.map((a) => a[1]), -1));
    p.push(dimChain("h", -180, [-12.5, 1412.5], -1));
    p.push(dimChain("v", -110, AX_Y.map((a) => a[1]), -1));
    p.push(dimChain("v", -180, [-12.5, 912.5], -1));
    p.push(`</g>`);

    // Mahaller (bağlantılar) — mobilyanın altında, duvarların altında
    p.push(`<g class="rooms">`);
    ROOMS.forEach((r) => {
      const ext = r.href.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener noreferrer"';
      p.push(`<a class="room" data-room="${r.id}" href="${r.href}"${ext} aria-label="${r.no} ${svgEsc(r.name)} — ${svgEsc(r.link)}">
        <rect class="room-hit" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>
        <rect class="room-fill" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>
      </a>`);
    });
    p.push(`</g>`);

    p.push(`<g class="furniture">${furniture()}</g>`);
    p.push(`<g class="walls">${WALLS.map(wallSvg).join("")}</g>`);

    // Revizyon bulutu (Arşiv)
    p.push(`<path class="revcloud" d="${revCloud(1012, 474, 1400, 900)}"/>`);
    p.push(`<g class="revmark"><path d="M1424 452 l24 -42 l24 42 z"/><text x="1448" y="446" text-anchor="middle">1</text></g>`);

    // Mahal etiketleri
    p.push(`<g class="labels">`);
    ROOMS.forEach((r) => {
      const area = ((r.w * r.h) / 10000).toFixed(2).replace(".", ",");
      p.push(`<g class="room-label" data-room="${r.id}" transform="translate(${r.lx} ${r.ly}) scale(${r.scale || 1})">
        <text class="lbl-no" x="0" y="-44" text-anchor="middle">${r.no}</text>
        <text class="lbl-name" x="0" y="0" text-anchor="middle">${svgEsc((r.short || r.name).toLocaleUpperCase("tr-TR"))}</text>
        <text class="lbl-link" x="0" y="34" text-anchor="middle">${svgEsc(r.link)} ↗</text>
        <text class="lbl-area" x="0" y="64" text-anchor="middle">A = ${area} m²  ·  ${svgEsc(r.fin.toLocaleLowerCase("tr-TR"))}</text>
      </g>`);
    });
    p.push(`</g>`);

    // Kesit çizgisi A-A (kuzeye bakış)
    p.push(`<g class="cutline">
      <line x1="-230" y1="180" x2="1530" y2="180"/>
      <path class="cut-end" d="M-230 180 V110 M1530 180 V110"/>
      <path class="cut-arrow" d="M-230 90 l-16 30 h32 z M1530 90 l-16 30 h32 z"/>
      <circle class="bubble" cx="-196" cy="226" r="26"/><text class="bubtxt" x="-196" y="236" text-anchor="middle">A</text>
      <circle class="bubble" cx="1496" cy="226" r="26"/><text class="bubtxt" x="1496" y="236" text-anchor="middle">A</text>
    </g>`);

    // Kuzey oku + çizgisel ölçek
    p.push(`<g class="north" transform="translate(1470 1040)">
      <circle r="52"/><path d="M0 -70 L18 30 L0 14 L-18 30 Z"/><text y="-80" text-anchor="middle">K</text></g>`);
    p.push(`<g class="scalebar" transform="translate(900 1110)">
      ${[0, 1, 2, 3, 4].map((i) => `<rect x="${i * 100}" y="0" width="100" height="14" class="${i % 2 ? "sb-w" : "sb-b"}"/>`).join("")}
      ${[0, 1, 2, 3, 4, 5].map((i) => `<text x="${i * 100}" y="44" text-anchor="middle">${i}</text>`).join("")}
      <text x="530" y="12">m</text></g>`);

    svg.insertAdjacentHTML("beforeend", p.join(""));
  }

  function revCloud(x0, y0, x1, y1) {
    const pts = [];
    const step = 46;
    const edge = (ax, ay, bx, by) => {
      const len = Math.hypot(bx - ax, by - ay);
      const n = Math.max(1, Math.round(len / step));
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        pts.push([ax + (bx - ax) * t0, ay + (by - ay) * t0, ax + (bx - ax) * t1, ay + (by - ay) * t1]);
      }
    };
    edge(x0, y0, x1, y0); edge(x1, y0, x1, y1); edge(x1, y1, x0, y1); edge(x0, y1, x0, y0);
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (const [, , bx, by] of pts) d += `A26 26 0 0 1 ${f(bx)} ${f(by)}`;
    return d;
  }

  // ── Kesit A-A ─────────────────────────────────────────────
  function buildSection() {
    const svg = document.getElementById("section");
    const p = [];
    const M = window.SAMSA_MOUNTAIN;

    // Arka plan dağ silueti (pencerelerden ve yapının iki yanından görünür)
    let ridgeD = "";
    if (M && M.ridge) {
      const n = M.ridge.length;
      const offset = 140;
      const pts = [];
      for (let x = -300; x <= 1690; x += 8) {
        const i = Math.floor(offset + ((x + 300) / 1990) * 260) % n;
        const ry = M.ridge[i];
        const y = -120 - (288 - ry) * 1.25;
        pts.push(`${x} ${f(y)}`);
      }
      ridgeD = "M" + pts.join("L") + "L1690 0L-300 0Z";
    }

    p.push(`<defs>
      <pattern id="earth" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="22" class="hatch-line"/><line x1="11" y1="0" x2="11" y2="22" class="hatch-line" stroke-dasharray="3 5"/></pattern>
      <pattern id="mnt" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
        <line x1="0" y1="0" x2="0" y2="9" class="mnt-line"/></pattern>
      <clipPath id="view">
        <rect x="-300" y="-600" width="287" height="600"/>
        <rect x="1413" y="-600" width="280" height="600"/>
        <rect x="120" y="-240" width="320" height="150"/>
        <rect x="700" y="-260" width="600" height="220"/>
      </clipPath>
    </defs>`);

    if (ridgeD) {
      p.push(`<g clip-path="url(#view)"><path class="mountain" d="${ridgeD}"/></g>`);
    }

    // Toprak
    p.push(`<rect x="-300" y="20" width="1990" height="110" fill="url(#earth)" class="earth"/>`);
    p.push(`<line class="ground" x1="-300" y1="0" x2="1690" y2="0"/>`);

    // Görünüş (kesitin ötesi): kuzey duvarı pencereleri
    const win = (x, y0, y1, w, mull) => {
      let s = `<rect class="thin" x="${x}" y="${y0}" width="${w}" height="${y1 - y0}"/>`;
      s += `<rect class="hair" x="${x + 6}" y="${y0 + 6}" width="${w - 12}" height="${y1 - y0 - 12}"/>`;
      for (let i = 1; i < mull; i++) {
        const mx = x + (w * i) / mull;
        s += `<line class="thin" x1="${mx}" y1="${y0}" x2="${mx}" y2="${y1}"/>`;
      }
      s += `<line class="thin" x1="${x - 8}" y1="${y1 + 6}" x2="${x + w + 8}" y2="${y1 + 6}"/>`;
      return s;
    };
    p.push(win(120, -240, -90, 320, 2));
    p.push(win(700, -260, -40, 600, 4));

    // Mobilya (görünüş)
    p.push(`<g class="furn-el">
      <rect x="515" y="-220" width="33" height="220"/>${[-176, -132, -88, -44].map((y) => `<line x1="515" y1="${y}" x2="548" y2="${y}"/>`).join("")}
      <rect x="150" y="-76" width="250" height="5"/><line x1="160" y1="-71" x2="160" y2="0"/><line x1="390" y1="-71" x2="390" y2="0"/>
      <path d="M250 0 V-45 H300 V0 M300 -45 V-95"/>
      <path d="M1000 0 V-42 H1092 V0 M1066 -42 V-88 H1092 V-42"/>
      <rect x="830" y="-42" width="80" height="6"/><line x1="840" y1="-36" x2="840" y2="0"/><line x1="900" y1="-36" x2="900" y2="0"/>
      <rect x="574" y="-250" width="12" height="190"/>
    </g>`);

    // İnsan figürü (ölçek)
    p.push(`<g class="figure" transform="translate(760 0)">
      <circle cx="0" cy="-163" r="11"/>
      <path d="M0 -150 V-80 M0 -140 L-18 -95 M0 -140 L16 -96 M0 -80 L-12 0 M0 -80 L10 0"/></g>`);

    // Kesilen elemanlar (poşe)
    p.push(`<g class="cut">
      <rect x="-12.5" y="-300" width="25" height="300"/>
      <rect x="1387.5" y="-300" width="25" height="300"/>
      <rect x="554" y="-300" width="12" height="300"/>
      <rect x="-40" y="0" width="1480" height="22"/>
      <rect x="-40" y="22" width="80" height="70"/><rect x="1360" y="22" width="80" height="70"/><rect x="530" y="22" width="60" height="60"/>
      <rect x="-12.5" y="-332" width="1425" height="32"/>
      <rect x="-12.5" y="-392" width="25" height="60"/><rect x="1387.5" y="-392" width="25" height="60"/>
    </g>`);
    // Kesitteki pencereler (batı ve doğu duvarı pencereden kesilir)
    p.push(`<g class="cutwin">
      <rect x="-12.5" y="-240" width="25" height="150" class="paperfill"/><line x1="-2.5" y1="-240" x2="-2.5" y2="-90"/><line x1="2.5" y1="-240" x2="2.5" y2="-90"/>
      <rect x="1387.5" y="-260" width="25" height="190" class="paperfill"/><line x1="1397.5" y1="-260" x2="1397.5" y2="-70"/><line x1="1402.5" y1="-260" x2="1402.5" y2="-70"/>
    </g>`);
    // Çatı katmanları
    p.push(`<g class="hair-g"><line x1="12" y1="-348" x2="1388" y2="-348"/><line x1="12" y1="-360" x2="1388" y2="-360"/>
      <text class="note" x="700" y="-372" text-anchor="middle">teras çatı · ısı yalıtımı · su yalıtımı</text></g>`);

    // Kot işaretleri
    const lvl = (y, t) => `<g class="level" transform="translate(1500 ${y})"><path d="M0 0 l-14 -22 h28 z"/><line x1="-40" y1="0" x2="80" y2="0" class="hair"/><text x="20" y="-8">${t}</text></g>`;
    p.push(lvl(0, "±0.00"), lvl(-300, "+3.00"), lvl(-392, "+3.92"));

    // Düşey ölçü zinciri
    p.push(`<g class="dims">`);
    const ticks = [0, -90, -240, -300];
    p.push(`<line class="dim" x1="-150" y1="20" x2="-150" y2="-320"/>`);
    ticks.forEach((t) => p.push(`<line class="tick" x1="-159" y1="${t + 9}" x2="-141" y2="${t - 9}"/>`));
    for (let i = 0; i < ticks.length - 1; i++) {
      const mid = (ticks[i] + ticks[i + 1]) / 2;
      p.push(`<text class="dimtxt" x="-160" y="${mid}" text-anchor="middle" transform="rotate(-90 -160 ${mid})">${ticks[i] - ticks[i + 1]}</text>`);
    }
    p.push(`</g>`);

    p.push(`<text class="note" x="1490" y="-420" text-anchor="middle">arka planda dağ</text>`);
    p.push(`<path class="leader" d="M1490 -405 L1500 -250"/>`);
    svg.insertAdjacentHTML("beforeend", p.join(""));
  }

  // ── Mahal listesi ──
  function buildSchedule() {
    const body = document.getElementById("schedule-body");
    body.innerHTML = ROOMS.map((r) => {
      const area = ((r.w * r.h) / 10000).toFixed(2).replace(".", ",");
      const ext = r.href.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener noreferrer"';
      return `<tr data-room="${r.id}"><td>${r.no}</td><td>${svgEsc(r.name)}</td><td class="num">${area}</td><td class="fin">${svgEsc(r.fin)}</td>
        <td><a href="${r.href}"${ext}>${svgEsc(r.link)} <span aria-hidden="true">↗</span></a></td></tr>`;
    }).join("");
  }

  // Plan ↔ liste karşılıklı vurgu
  function wireHover() {
    const all = document.querySelectorAll("[data-room]");
    const set = (id, on) => all.forEach((el) => el.dataset.room === id && el.classList.toggle("is-hot", on));
    all.forEach((el) => {
      el.addEventListener("mouseenter", () => set(el.dataset.room, true));
      el.addEventListener("mouseleave", () => set(el.dataset.room, false));
      el.addEventListener("focusin", () => set(el.dataset.room, true));
      el.addEventListener("focusout", () => set(el.dataset.room, false));
    });
  }

  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  document.getElementById("tb-date").textContent = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  document.getElementById("stamp-date").textContent = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

  buildPlan();
  buildSection();
  buildSchedule();
  wireHover();
})();
