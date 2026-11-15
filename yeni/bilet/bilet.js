/* Samsa Teleferiği — güvenlik baskısı (gülloş), seri numaraları, zımba */
(() => {
  "use strict";

  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const today = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Gülloş: iç içe geçmiş sinüs bantları + rozet
  function guilloche(seed) {
    const r = rng(seed);
    const W = 480, H = 200;
    const paths = [];
    const band = (y0, amp, freq) => {
      for (let k = 0; k < 7; k++) {
        let p = "";
        for (let x = 0; x <= W; x += 3) {
          const y = y0 + amp * Math.sin(x * freq + k * 0.9) * Math.cos(x * freq * 0.23 + k * 0.4);
          p += (x ? "L" : "M") + x + " " + y.toFixed(2);
        }
        paths.push(`<path d="${p}"/>`);
      }
    };
    band(13, 7, 0.085 + r() * 0.02);
    band(H - 13, 7, 0.085 + r() * 0.02);
    const cx = 392, cy = 100;
    const n1 = 9 + Math.floor(r() * 4), n2 = 15 + Math.floor(r() * 5);
    for (let k = 0; k < 18; k++) {
      let p = "";
      for (let i = 0; i <= 360; i++) {
        const t = (i / 360) * Math.PI * 2;
        const rr = 56 + 11 * Math.sin(n1 * t + k * 0.35);
        p += (i ? "L" : "M") + (cx + rr * Math.cos(t)).toFixed(2) + " " + (cy + rr * Math.sin(t)).toFixed(2);
      }
      paths.push(`<path d="${p}Z"/>`);
    }
    for (let k = 0; k < 12; k++) {
      let p = "";
      for (let i = 0; i <= 360; i++) {
        const t = (i / 360) * Math.PI * 2;
        const rr = 26 + 7 * Math.sin(n2 * t + k * 0.52);
        p += (i ? "L" : "M") + (cx + rr * Math.cos(t)).toFixed(2) + " " + (cy + rr * Math.sin(t)).toFixed(2);
      }
      paths.push(`<path d="${p}Z"/>`);
    }
    // ince zemin deseni
    let wave = "";
    for (let y = 30; y < H - 28; y += 5) {
      wave += `M0 ${y}`;
      for (let x = 0; x <= W; x += 12) wave += `Q${x + 3} ${y - 1.6} ${x + 6} ${y}T${x + 12} ${y}`;
    }
    paths.push(`<path class="g-fine" d="${wave}"/>`);
    return `<svg class="g" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">${paths.join("")}</svg>`;
  }

  document.querySelectorAll(".ticket").forEach((t, i) => {
    const r = rng(9001 + i * 77);
    const serial = `${"ABCDEFG"[i]} ${String(Math.floor(r() * 900000) + 100000)}`;
    t.insertAdjacentHTML("afterbegin", guilloche(311 + i * 13));
    t.querySelector(".stub .sn").textContent = serial;
    const main = t.querySelector(".main");
    main.insertAdjacentHTML("afterbegin", `<span class="no">№ ${serial}</span>`);
    main.insertAdjacentHTML("beforeend",
      `<span class="meta">
        <span><i>Kalkış</i>Samsa · 283 m</span>
        <span><i>Varış</i>${t.dataset.alt} m</span>
        <span><i>Tarih</i>${today}</span>
        <span><i>Fiyatı</i>0,00 TL</span>
      </span>
      <span class="void">Zımbalanmadan geçersizdir</span>`);
    t.style.setProperty("--n", t.querySelector(".to").textContent.trim().length);
    t.style.setProperty("--tilt", `${((r() - 0.5) * 2.4).toFixed(2)}deg`);

    // Zımba
    t.addEventListener("pointerdown", (e) => {
      const box = t.getBoundingClientRect();
      const x = e.clientX - box.left, y = e.clientY - box.top;
      const hole = document.createElement("span");
      hole.className = "hole";
      hole.style.left = x + "px";
      hole.style.top = y + "px";
      t.appendChild(hole);
      const chad = document.createElement("span");
      chad.className = "chad";
      chad.style.left = x + "px";
      chad.style.top = y + "px";
      t.appendChild(chad);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        chad.animate(
          [{ transform: "translate(-50%,-50%) rotate(0)", opacity: 1 },
           { transform: `translate(${(Math.random() - 0.5) * 60}px, 220px) rotate(${Math.random() * 400}deg)`, opacity: 0 }],
          { duration: 900, easing: "cubic-bezier(.4,0,.8,.6)" }
        ).finished.then(() => chad.remove());
      } else chad.remove();
      t.classList.add("is-punched");
    });
  });
})();
