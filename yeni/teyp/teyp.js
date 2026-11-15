/* ============================================================
   OS-58 — makaralar, sayaç, VU ibreleri, tuş mekaniği ve ses
   ============================================================ */
(() => {
  "use strict";

  const LEN = 700;          // bant uzunluğu (sayaç birimi)
  const PLAY_RATE = 1.1;    // sayaç/sn
  const WIND_RATE = 42;

  const $ = (s) => document.querySelector(s);
  const keys = Object.fromEntries([...document.querySelectorAll(".key")].map((k) => [k.dataset.k, k]));
  const led = $("#led");

  let pos = 0;          // bandın gerçek konumu
  let zero = 0;         // sayaç sıfırı
  let mode = "stop";    // stop | play | ff | rew
  let paused = false;
  let recording = false;
  let cue = null;       // { target, resume }
  let angL = 0, angR = 0;
  let needleL = -52, needleR = -52;

  // ── VU skalası ──
  const DB = [[-20, -48], [-10, -30], [-7, -19], [-5, -9], [-3, 3], [-2, 10], [-1, 16], [0, 22], [1, 30], [2, 38], [3, 46]];
  const dbToAng = (db) => {
    if (db <= DB[0][0]) return -52;
    for (let i = 1; i < DB.length; i++) {
      if (db <= DB[i][0]) {
        const [d0, a0] = DB[i - 1], [d1, a1] = DB[i];
        return a0 + ((db - d0) / (d1 - d0)) * (a1 - a0);
      }
    }
    return 50;
  };
  function drawScale(g) {
    const cx = 100, cy = 150, R = 104;
    const pt = (a, r) => [cx + Math.sin((a * Math.PI) / 180) * r, cy - Math.cos((a * Math.PI) / 180) * r];
    const arc = (a0, a1, r) => {
      const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
      return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    };
    let s = `<path d="${arc(-48, 22, R)}"/><path class="red" d="${arc(22, 46, R + 2)}"/>`;
    DB.forEach(([db, a]) => {
      const red = db >= 0;
      const [x0, y0] = pt(a, R), [x1, y1] = pt(a, R + 9);
      s += `<line class="${red ? "red" : ""}" x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}"/>`;
      if ([-20, -10, -7, -5, -3, 0, 3].includes(db)) {
        const [tx, ty] = pt(a, R + 18);
        s += `<text class="${red ? "red" : ""}" x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}" text-anchor="middle">${Math.abs(db)}</text>`;
      }
    });
    const [px, py] = pt(-44, R - 16);
    s += `<text x="${px}" y="${py}" text-anchor="middle">−</text>`;
    const [qx, qy] = pt(42, R - 16);
    s += `<text class="red" x="${qx}" y="${qy}" text-anchor="middle">+</text>`;
    g.innerHTML = s;
  }
  drawScale($("#scaleL"));
  drawScale($("#scaleR"));

  // ── Sayaç ──
  const strips = [$("#d0"), $("#d1"), $("#d2")];
  strips.forEach((s) => { s.innerHTML = "01234567890".split("").map((d) => `<span>${d}</span>`).join(""); });
  function setCounter(v) {
    v = ((v % 1000) + 1000) % 1000;
    const ones = v % 10;
    const roll = Math.max(0, ones - 9);
    const tens = Math.floor(v / 10) % 10 + (roll > 0 ? roll : 0);
    const huns = Math.floor(v / 100) % 10 + (Math.floor(v / 10) % 10 === 9 && roll > 0 ? roll : 0);
    [huns, tens, ones].forEach((d, i) => { strips[i].style.transform = `translateY(${(-d * 100) / 11}%)`; });
  }

  // ── Ses: bant hışırtısı + yavaş bir melodi ──
  let toneFilter = null;
  let ac = null, master, anL, anR, schedTimer = null, nextT = 0, step = 0;
  const SCALE = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0, 440.0];
  let walk = 4;
  function ensureAudio() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.55;
    const tone = ac.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2600;
    toneFilter = tone;
    master.connect(tone);
    tone.connect(ac.destination);
    const split = ac.createChannelSplitter(2);
    tone.connect(split);
    anL = ac.createAnalyser(); anR = ac.createAnalyser();
    anL.fftSize = anR.fftSize = 1024;
    split.connect(anL, 0); split.connect(anR, 1);

    // hışırtı
    const buf = ac.createBuffer(2, ac.sampleRate * 2, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const noise = ac.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 4200; bp.Q.value = 0.6;
    const ng = ac.createGain(); ng.gain.value = 0.022;
    noise.connect(bp); bp.connect(ng); ng.connect(master);
    noise.start();
    applyKnobs();
  }
  function note(t, f, dur, vol, pan) {
    const o1 = ac.createOscillator(), o2 = ac.createOscillator();
    o1.type = "sine"; o2.type = "triangle";
    o1.frequency.value = f; o2.frequency.value = f * 2.003;
    const wow = ac.createOscillator(); wow.frequency.value = 0.55;
    const wg = ac.createGain(); wg.gain.value = 7;
    wow.connect(wg); wg.connect(o1.detune); wg.connect(o2.detune);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = ac.createGain(); g2.gain.value = 0.25;
    const p = ac.createStereoPanner(); p.pan.value = pan;
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(p); p.connect(master);
    [o1, o2, wow].forEach((o) => { o.start(t); o.stop(t + dur + 0.05); });
  }
  function scheduler() {
    while (nextT < ac.currentTime + 0.25) {
      const beat = 0.46;
      if (step % 8 === 0) note(nextT, SCALE[0] / 2, 2.4, 0.16, 0);
      if (step % 8 === 4) note(nextT, SCALE[3] / 2, 2.0, 0.12, 0);
      if (Math.random() > 0.22) {
        walk = Math.max(0, Math.min(SCALE.length - 1, walk + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]));
        note(nextT + (step % 2 ? 0.04 : 0), SCALE[walk], 1.4, 0.11, Math.random() * 1.2 - 0.6);
      }
      nextT += beat;
      step++;
    }
  }
  function audioOn() {
    ensureAudio();
    if (!ac) return;
    ac.resume();
    if (!schedTimer) {
      nextT = ac.currentTime + 0.05;
      schedTimer = setInterval(scheduler, 90);
    }
  }
  function audioOff() {
    if (!ac) return;
    clearInterval(schedTimer);
    schedTimer = null;
    ac.suspend();
  }
  function level(an) {
    if (!an || !ac || ac.state !== "running") return -60;
    const d = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(d);
    let s = 0;
    for (let i = 0; i < d.length; i++) s += d[i] * d[i];
    return 20 * Math.log10(Math.sqrt(s / d.length) + 1e-6) + 14;
  }

  // ── Tuş mantığı ──
  function setLatched(k, on) {
    if (keys[k].hasAttribute("aria-pressed")) keys[k].setAttribute("aria-pressed", on ? "true" : "false");
    keys[k].classList.toggle("is-down", on);
  }
  function setMode(m) {
    mode = m;
    setLatched("play", m === "play");
    keys.ff.classList.toggle("is-down", m === "ff");
    keys.rew.classList.toggle("is-down", m === "rew");
    if (m === "play" && !paused) audioOn(); else audioOff();
  }
  function press(k) {
    cue = null;
    switch (k) {
      case "play": if (pos >= LEN) pos = 0; setMode("play"); break;
      case "ff": setMode("ff"); break;
      case "rew": setMode("rew"); break;
      case "stop":
        if (mode === "stop" && !paused) eject();
        paused = false; setLatched("pause", false);
        recording = false; setLatched("rec", false); led.classList.remove("on");
        setMode("stop");
        break;
      case "pause":
        paused = !paused; setLatched("pause", paused);
        if (mode === "play") (paused ? audioOff : audioOn)();
        break;
      case "rec":
        recording = !recording; setLatched("rec", recording);
        led.classList.toggle("on", recording);
        break;
    }
  }
  Object.entries(keys).forEach(([k, el]) => el.addEventListener("click", () => press(k)));
  $("#reset").addEventListener("click", () => { zero = pos; });

  function eject() {
    const svg = $("#cassette");
    svg.animate(
      [{ transform: "translateY(0)" }, { transform: "translateY(-6%) rotate(-1deg)" }, { transform: "translateY(0)" }],
      { duration: 700, easing: "cubic-bezier(.3,1.6,.5,1)" }
    );
  }

  // Parçanın üstüne gelince bandı o noktaya sar
  document.querySelectorAll(".tracks a").forEach((a) => {
    const go = () => {
      const target = zero + Number(a.dataset.at || 0);
      cue = { target, resume: mode === "play" ? "play" : "stop" };
      setMode(target > pos ? "ff" : "rew");
    };
    a.addEventListener("mouseenter", go);
    a.addEventListener("focus", go);
  });

  // ── Döngü ──
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let v = 0;
    if (!paused) {
      if (mode === "play") v = PLAY_RATE;
      else if (mode === "ff") v = WIND_RATE;
      else if (mode === "rew") v = -WIND_RATE;
    }
    pos += v * dt;
    if (cue && ((v > 0 && pos >= cue.target) || (v < 0 && pos <= cue.target))) {
      pos = cue.target;
      const r = cue.resume;
      cue = null;
      setMode(r);
    }
    if (pos >= LEN) { pos = LEN; if (mode !== "stop") setMode("stop"); }
    if (pos <= 0) { pos = 0; if (mode === "rew") setMode("stop"); }

    // makara yarıçapları ve dönüş
    const p = pos / LEN;
    const rMin = 21, rMax = 60;
    const rL = rMin + (rMax - rMin) * Math.sqrt(1 - p);
    const rR = rMin + (rMax - rMin) * Math.sqrt(p);
    const tapeV = v * 26;
    angL -= (tapeV / rL) * dt * 57.3;
    angR -= (tapeV / rR) * dt * 57.3;
    packL.setAttribute("r", rL.toFixed(1));
    packR.setAttribute("r", rR.toFixed(1));
    reelL.setAttribute("transform", `translate(175 167) rotate(${angL.toFixed(1)})`);
    reelR.setAttribute("transform", `translate(285 167) rotate(${angR.toFixed(1)})`);

    setCounter(pos - zero);

    // VU ibreleri (mekanik eylemsizlik)
    const playing = mode === "play" && !paused;
    let tL = playing ? dbToAng(level(anL)) : -52;
    let tR = playing ? dbToAng(level(anR)) : -52;
    if (mode === "ff" || mode === "rew") { tL = -40 + Math.random() * 3; tR = -41 + Math.random() * 3; }
    needleL += (tL - needleL) * 0.18;
    needleR += (tR - needleR) * 0.18;
    nL.setAttribute("transform", `rotate(${needleL.toFixed(2)} 100 150)`);
    nR.setAttribute("transform", `rotate(${needleR.toFixed(2)} 100 150)`);

    requestAnimationFrame(frame);
  }
  const packL = $("#packL"), packR = $("#packR"), reelL = $("#reelL"), reelR = $("#reelR");
  const nL = $("#needleL"), nR = $("#needleR");
  requestAnimationFrame(frame);

  // ── Döner düğmeler: ses ve ton ──
  const knobVal = { vol: 6, tone: 5 };
  function applyKnobs() {
    if (master) master.gain.value = (knobVal.vol / 10) * 0.9;
    if (toneFilter) toneFilter.frequency.value = 700 + knobVal.tone * 520;
  }
  document.querySelectorAll(".knob").forEach((el) => {
    const k = el.dataset.knob;
    const set = (v) => {
      knobVal[k] = Math.max(0, Math.min(10, v));
      el.style.setProperty("--a", `${-135 + knobVal[k] * 27}deg`);
      el.setAttribute("aria-valuenow", String(Math.round(knobVal[k])));
      applyKnobs();
    };
    set(knobVal[k]);
    let y0 = 0, v0 = 0;
    el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); y0 = e.clientY; v0 = knobVal[k]; });
    el.addEventListener("pointermove", (e) => { if (el.hasPointerCapture(e.pointerId)) set(v0 + (y0 - e.clientY) / 14); });
    el.addEventListener("wheel", (e) => { e.preventDefault(); set(knobVal[k] - Math.sign(e.deltaY) * 0.5); }, { passive: false });
    el.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); set(knobVal[k] + 1); }
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); set(knobVal[k] - 1); }
    });
  });

  // Klavye: boşluk = çal/durdur
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("a, button") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === "Space") { e.preventDefault(); press(mode === "play" ? "stop" : "play"); }
  });
})();
