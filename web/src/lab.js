/* StarSource Harmonics Lab (#harmonics): the chart read as a signal.
   The planets are impulses on the 360° circle; Fourier analysis splits that signal into harmonics h = 1…N
   (h cycles per circle, wavelength 360°/h). For each h: amplitude R_h (mean resultant length), phase, chance level,
   Rayleigh p-value, and the planet pairs that make it strong. Selecting a harmonic shows its waveform and the H-n wheel.
   The same mathematics describes electromagnetic waves; here it is used as a measuring language, not as a claim about physics.
   Uses Tech.spectrum / Tech.wave / Tech.harmonicChart (techniques.js). Rendered by app.js when the route is #harmonics. */
(function () {
  "use strict";
  const D = window.AstroData, A = window.Astro, T = window.Tech, W = window.Wheel, ST = window.Store;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");
  const G = k => { const m = D.BODIES.find(b => b.key === k) || D.POINTS.find(p => p.key === k) || { glyph: k }; return /^[A-Za-z]/.test(m.glyph) ? `<span style="font:600 11px var(--ui)">${m.glyph}</span>` : `<span class="g" style="color:${W.BODY_COL[k] || "inherit"}">${m.glyph}</span>`; };
  const SETS = {
    planets: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"],
    trad: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"],
    angles: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "asc", "mc"]
  };
  const L = { profile: undefined, N: 36, h: 5, set: "planets", view: "wave" };
  let data = null, tip = null;

  function compute() {
    const E = StarApp.engine(), S = StarApp.state, sl = S.slots[S.active];
    if (L.profile === undefined) L.profile = sl.profile || null;
    const p = ST.profile(L.profile), home = S.set.home;
    const o = { zodiac: sl.zodiac, ayanamsa: +sl.ayanamsa, hsys: sl.hsys, node: sl.node, lilith: sl.lilith };
    let ch, title;
    if (p) { const b = A.localToUT(E, p.birth, p.birthTz || "UTC", p.birthOffset); ch = A.chart(E, Object.assign({ jd: b.jd, lat: p.birthLat, lon: p.birthLon }, o)); title = (p.first + " " + (p.last || "")).trim(); }
    else { ch = A.chart(E, Object.assign({ jd: A.nowJd(), lat: home.lat, lon: home.lon }, o)); title = "The sky now"; }
    const keys = SETS[L.set];
    const pts = ch.bodies.concat(ch.points).filter(x => keys.includes(x.key));
    const lons = pts.map(x => x.lon);
    const sp = T.spectrum(lons, L.N, { keys: pts.map(x => x.key), orb: 12 });
    data = { ch, title, pts, lons, sp, slot: sl };
    return data;
  }

  function view() {
    const profs = ST.profiles();
    return `<div class="hlab">
      <aside class="win lab-side"><div class="hud-title">Harmonics Lab</div><div class="scroll">
        <div class="sec-b">
          <div class="field"><label>Chart</label><select class="sel" data-l="profile"><option value="">— The sky now (home) —</option>${profs.map(p => `<option value="${p.id}">${esc(p.first + " " + (p.last || ""))}</option>`).join("")}</select></div>
          <div class="field"><label>Points in the signal</label><div class="seg">${[["trad", "7 classical"], ["planets", "10 planets"], ["angles", "+ AC / MC"]].map(([k, l]) => `<button data-l="set" data-v="${k}">${l}</button>`).join("")}</div></div>
          <div class="field"><label>Harmonics shown</label><div class="seg">${[12, 36, 90, 180].map(n => `<button data-l="N" data-v="${n}">1–${n}</button>`).join("")}</div></div>
          <div class="field"><label>Selected harmonic h</label><div style="display:flex;gap:6px"><button class="btn" data-hstep="-1">◀</button><input class="inp" type="number" min="1" max="180" data-l="h" style="text-align:center"><button class="btn" data-hstep="1">▶</button></div></div>
          <div class="field"><label>Lower plot</label><div class="seg"><button data-l="view" data-v="wave">Waveform h</button><button data-l="view" data-v="synth">Sum 1…h</button></div></div>
        </div>
        <div class="sec"><div class="sec-h" style="cursor:default">How to read it</div><div class="sec-b lab-text">
          <p><b>The signal.</b> Each planet is a pulse at its longitude on the 360° circle. Fourier analysis breaks that pattern of pulses into waves, one for each whole number of cycles per circle.</p>
          <p><b>Harmonic h</b> is the wave with h cycles per circle: its wavelength is 360°/h. H1 = one cycle (planets bunched on one side), H2 = oppositions and conjunctions, H3 = trines, H4 = squares, H5 = quintiles, H7 = septiles, H9 = noviles.</p>
          <p><b>Amplitude R</b> (0 to 1) measures how strongly the planets line up with that wave: 1 means every planet sits on a crest. It is the mean resultant length of the angles h·λ (Addey, <i>Harmonics in Astrology</i>; the same quantity physicists call the order parameter).</p>
          <p><b>Chance level</b> is the R expected from the same number of randomly placed points, √π / (2√k). <b>p</b> is the Rayleigh test: the probability of an R this large by chance for one harmonic. With N harmonics tested, about N × 0.05 will pass p &lt; 0.05 by luck, so a single strong bar is a description of this chart, not evidence on its own.</p>
          <p><b>Phase</b> is where the wave first peaks: the longitude the harmonic "points to".</p>
          <p class="muted">Why waves: the mathematics is the same Fourier analysis that describes electromagnetic radiation, sound and tides. It gives StarSource an exact, testable vocabulary for aspect patterns; it is not a claim that planets broadcast these waves.</p>
        </div></div>
      </div></aside>
      <section class="lab-main">
        <div class="win"><div class="win-h"><span class="dot"></span>Spectrum · amplitude by harmonic<span class="sp muted" id="lab-title"></span></div><div id="lab-spec" class="plot"></div></div>
        <div class="win"><div class="win-h"><span class="dot"></span><span id="lab-wave-t">Waveform</span></div><div id="lab-wave" class="plot"></div></div>
      </section>
      <aside class="win lab-right"><div class="hud-title" id="lab-ht">Harmonic</div><div class="scroll"><div id="lab-wheel" class="lab-wheel"></div><div id="lab-table"></div></div></aside>
    </div>`;
  }

  /* ---------- spectrum (bar chart) ---------- */
  function drawSpectrum() {
    const host = $("#lab-spec"); if (!host) return;
    const sp = data.sp, N = sp.length, Wd = 960, Hd = 250, m = { l: 44, r: 12, t: 14, b: 34 };
    const iw = Wd - m.l - m.r, ih = Hd - m.t - m.b, bw = iw / N;
    const y = v => m.t + ih * (1 - v), x = h => m.l + (h - 1) * bw;
    let g = `<svg viewBox="0 0 ${Wd} ${Hd}" class="spec" role="img" aria-label="Harmonic spectrum of ${esc(data.title)}">`;
    for (const v of [0, .25, .5, .75, 1]) g += `<line x1="${m.l}" x2="${Wd - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${m.l - 8}" y="${y(v)}" text-anchor="end" dominant-baseline="central" class="ax">${v.toFixed(2)}</text>`;
    const step = N <= 12 ? 1 : N <= 36 ? 3 : N <= 90 ? 10 : 20;
    sp.forEach(s => {
      const h = s.h, bx = x(h) + Math.max(1, bw * .12), w = Math.max(1.5, bw * .76), top = y(s.R), on = h === L.h;
      g += `<g class="bar" data-h="${h}"><rect x="${x(h)}" y="${m.t}" width="${bw}" height="${ih}" fill="transparent"/><path d="M${bx},${y(0)} V${top + Math.min(4, (y(0) - top) / 2)} q0,-4 4,-4 h${Math.max(0, w - 8)} q4,0 4,4 V${y(0)} Z" fill="${on ? "var(--amber)" : "var(--frame)"}" opacity="${on ? 1 : .8}"/>${s.p < .05 ? `<circle cx="${bx + w / 2}" cy="${top - 7}" r="2.4" fill="var(--text)"/>` : ""}</g>`;
      if (h === 1 || h % step === 0) g += `<text x="${x(h) + bw / 2}" y="${Hd - m.b + 16}" text-anchor="middle" class="ax">${h}</text>`;
    });
    const ch = sp[0].chance;
    g += `<line x1="${m.l}" x2="${Wd - m.r}" y1="${y(ch)}" y2="${y(ch)}" stroke="var(--text)" stroke-width="1.2" stroke-dasharray="5 4" opacity=".7"/><text x="${Wd - m.r - 4}" y="${y(ch) - 7}" text-anchor="end" class="ax">chance level ${ch.toFixed(2)}</text>`;
    g += `<text x="${m.l + iw / 2}" y="${Hd - 4}" text-anchor="middle" class="ax">harmonic h (cycles per 360°) · dot = Rayleigh p &lt; 0.05</text>`;
    g += `<line x1="${m.l}" x2="${Wd - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="var(--line-2)" stroke-width="1"/></svg>`;
    host.innerHTML = g;
    $("#lab-title").textContent = `${data.title} · ${data.pts.length} points`;
  }

  /* ---------- waveform ---------- */
  function drawWave() {
    const host = $("#lab-wave"); if (!host) return;
    const h = L.h, Wd = 960, Hd = 230, m = { l: 44, r: 12, t: 14, b: 44 }, iw = Wd - m.l - m.r, ih = Hd - m.t - m.b;
    const pts = L.view === "synth" ? T.synthesis(data.lons, h, 721) : T.wave(data.lons, h, 721);
    const lo = L.view === "synth" ? Math.min(...pts.map(p => p[1])) : -1, hi = L.view === "synth" ? Math.max(...pts.map(p => p[1])) : 1;
    const x = t => m.l + iw * t / 360, y = v => m.t + ih * (1 - (v - lo) / (hi - lo || 1));
    let g = `<svg viewBox="0 0 ${Wd} ${Hd}" class="spec" role="img" aria-label="Waveform">`;
    for (const z of D.SIGNS) g += `<rect x="${x(z.i * 30)}" y="${Hd - m.b + 6}" width="${iw / 12 - 1}" height="16" fill="var(--el-${z.element})" opacity=".14"/><text x="${x(z.i * 30 + 15)}" y="${Hd - m.b + 15}" text-anchor="middle" dominant-baseline="central" font-family="var(--glyph)" font-size="12" fill="var(--el-${z.element})">${z.glyph}</text>`;
    g += `<line x1="${m.l}" x2="${Wd - m.r}" y1="${y(L.view === "synth" ? (lo + hi) / 2 : 0)}" y2="${y(L.view === "synth" ? (lo + hi) / 2 : 0)}" stroke="var(--line-2)"/>`;
    if (L.view !== "synth") for (let k = 0; k < h && h <= 36; k++) { const cx = (data.sp[h - 1].phase + k * 360 / h) % 360; g += `<line x1="${x(cx)}" x2="${x(cx)}" y1="${m.t}" y2="${Hd - m.b}" stroke="var(--amber)" stroke-dasharray="2 4" opacity=".55"/>`; }
    g += `<path d="${pts.map((p, i) => (i ? "L" : "M") + x(p[0]).toFixed(1) + "," + y(p[1]).toFixed(1)).join("")}" fill="none" stroke="var(--frame)" stroke-width="2"/>`;
    const sp = W.spread(data.pts.map(p => ({ lon: p.lon })), 4.2);
    data.pts.forEach((p, i) => { g += `<line x1="${x(p.lon)}" x2="${x(p.lon)}" y1="${Hd - m.b}" y2="${Hd - m.b - 10}" stroke="${W.BODY_COL[p.key]}" stroke-width="2"/><text x="${x(sp[i])}" y="${m.t + 4}" text-anchor="middle" font-family="var(--glyph)" font-size="15" fill="${W.BODY_COL[p.key]}">${/^[A-Za-z]/.test(p.glyph) ? `<tspan font-family="var(--ui)" font-size="10">${p.glyph}</tspan>` : p.glyph}</text>`; });
    [0, 90, 180, 270, 360].forEach(t => g += `<text x="${x(t)}" y="${Hd - 6}" text-anchor="middle" class="ax">${t}°</text>`);
    host.innerHTML = g + "</svg>";
    $("#lab-wave-t").textContent = L.view === "synth" ? `Sum of harmonics 1…${h}: where the chart's points concentrate` : `Waveform of H${h}: wavelength ${A.dms(360 / h).str} · crests (dashed) at the phase`;
  }

  /* ---------- harmonic wheel + table ---------- */
  function drawRight() {
    const h = L.h, s = data.sp[h - 1], hc = T.harmonicChart(data.ch, h);
    const keys = data.pts.map(p => p.key);
    const hv = Object.assign({}, hc, { bodies: hc.bodies.filter(b => keys.includes(b.key)) });
    const asp = A.aspects(hv.bodies, null, { aspects: ["conj", "opp", "tri", "sq"], luminaryBonus: false }).map(a => Object.assign(a, { a: "i:" + a.p, b: "i:" + a.q }));
    $("#lab-wheel").innerHTML = W.svg({ inner: hv, outer: null, aspects: asp, opts: { rotate: "aries", points: [], layers: { stars: false, houseNums: false, cusps: false, axes: false, hud: false } }, label: "Harmonic " + h + " wheel" });
    $("#lab-ht").textContent = `Harmonic ${h} · H${h} wheel`;
    const top = data.sp.slice().sort((a, b) => b.R - a.R).slice(0, 10);
    $("#lab-table").innerHTML = `<dl class="kv"><dt>Amplitude R</dt><dd>${s.R.toFixed(3)}</dd><dt>× chance</dt><dd>${s.ratio.toFixed(2)}×</dd><dt>Rayleigh p</dt><dd>${s.p < .001 ? "&lt; 0.001" : s.p.toFixed(3)}</dd><dt>Phase (first crest)</dt><dd>${A.fmtLon(s.phase)}</dd><dt>Wavelength</dt><dd>${A.dms(360 / h).str}</dd></dl>
      <div class="sec-h" style="cursor:default">Pairs in H${h} conjunction (≤ 12° in H${h})</div>
      <table class="st"><tr><th>Pair</th><th style="text-align:right">Natal separation</th><th style="text-align:right">Off by</th></tr>${s.pairs.slice(0, 16).map(x => `<tr><td>${G(x.a)} ${G(x.b)}</td><td class="num">${A.dms(A.sep(data.lons[x.i], data.lons[x.j])).str}</td><td class="num">${A.dms(x.dev).str}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">None</td></tr>`}</table>
      <div class="sec-h" style="cursor:default">Strongest harmonics</div>
      <table class="st"><tr><th>h</th><th style="text-align:right">R</th><th style="text-align:right">× chance</th><th style="text-align:right">p</th></tr>${top.map(t => `<tr class="pick ${t.h === h ? "sel" : ""}" data-h="${t.h}"><td class="num" style="text-align:left">H${t.h}</td><td class="num">${t.R.toFixed(3)}</td><td class="num">${t.ratio.toFixed(2)}</td><td class="num">${t.p < .001 ? "&lt;.001" : t.p.toFixed(3)}</td></tr>`).join("")}</table>
      <div class="note">With ${data.sp.length} harmonics tested, about ${(data.sp.length * .05).toFixed(1)} will reach p &lt; 0.05 by chance alone.</div>`;
  }

  function syncControls() {
    const root = $(".hlab"); if (!root) return;
    $('[data-l="profile"]', root).value = L.profile || "";
    root.querySelectorAll(".seg [data-l]").forEach(b => b.classList.toggle("on", String(L[b.dataset.l]) === b.dataset.v));
    $('[data-l="h"]', root).value = L.h;
  }
  function draw() { if (!$(".hlab")) return; compute(); if (L.h > L.N) L.h = L.N; syncControls(); drawSpectrum(); drawWave(); drawRight(); }
  function showTip(h, ev) {
    const s = data.sp[h - 1];
    if (!tip) { tip = document.createElement("div"); tip.className = "tip"; document.body.appendChild(tip); }
    tip.innerHTML = `<b>H${h}</b> · wavelength ${A.dms(360 / h).str}<br>R ${s.R.toFixed(3)} · ${s.ratio.toFixed(2)}× chance · p ${s.p < .001 ? "&lt; 0.001" : s.p.toFixed(3)}<br><span class="muted">${s.pairs.length} pair${s.pairs.length === 1 ? "" : "s"} in H${h} conjunction · click to select</span>`;
    tip.style.display = "block"; tip.style.left = Math.min(innerWidth - 260, ev.clientX + 14) + "px"; tip.style.top = (ev.clientY + 12) + "px";
  }
  function wire() {
    const root = $(".hlab"); if (!root) return;
    root.addEventListener("click", e => {
      const b = e.target.closest("[data-h]"); if (b) { L.h = +b.dataset.h; draw(); return; }
      const st = e.target.closest("[data-hstep]"); if (st) { L.h = Math.max(1, Math.min(L.N, L.h + +st.dataset.hstep)); draw(); return; }
      const sg = e.target.closest(".seg [data-l]"); if (sg) { const k = sg.dataset.l; L[k] = k === "N" ? +sg.dataset.v : sg.dataset.v; draw(); }
    });
    root.addEventListener("change", e => {
      const k = e.target.dataset.l;
      if (k === "profile") { L.profile = e.target.value || null; draw(); }
      if (k === "h") { const v = Math.round(+e.target.value); if (v >= 1 && v <= L.N) { L.h = v; draw(); } }
    });
    root.addEventListener("mousemove", e => { const b = e.target.closest(".bar"); if (b) showTip(+b.dataset.h, e); else if (tip) tip.style.display = "none"; });
    root.addEventListener("mouseleave", () => { if (tip) tip.style.display = "none"; });
  }
  window.StarLab = { view, draw: () => { draw(); wire(); }, redraw: draw, state: L, keys: e => {
    if (e.key === "ArrowRight" || e.key === "]") { L.h = Math.min(L.N, L.h + 1); draw(); return true; }
    if (e.key === "ArrowLeft" || e.key === "[") { L.h = Math.max(1, L.h - 1); draw(); return true; }
    return false; } };
})();
