/* StarSource chart wheel: one SVG string per render (Wheel.svg(spec)). Single wheel or bi-wheel (outer ring =
   transits / progressions). Every planet is a <g class="planet" data-id="i:sun"> (i = inner ring, o = outer ring) and every
   aspect line a <line class="asp" data-a="i:sun" data-b="o:moon">, so app.js can isolate a planet's aspects with classes only.
   Geometry: viewBox −70…1070, centre 500. Longitude λ is drawn at screen angle θ = base + λ (counter-clockwise),
   base = 180° − Asc (Ascendant at 9 o'clock) or 180° (0° Aries at 9 o'clock). */
(function (root) {
  "use strict";
  const D = root.AstroData, A = root.Astro;
  const C = 500, R_OUT = 470, R_ZI = 410;
  const BODY_COL = {
    sun: "#F2B84B", moon: "#C9D6E8", mercury: "#7BD88F", venus: "#F07CA0", mars: "#E5675B", jupiter: "#B49BFF", saturn: "#C9A86A",
    uranus: "#5CC8E0", neptune: "#6FA8FF", pluto: "#D97AE6", node: "#9FB3C8", snode: "#7D8DA3", lilith: "#B07FD0", chiron: "#7FD6B0",
    ceres: "#C7D98A", pallas: "#A9C5E8", juno: "#E8A9C8", vesta: "#F0A86B",
    asc: "#FFFFFF", mc: "#FFFFFF", dsc: "#AEB9CC", ic: "#AEB9CC", vertex: "#AEB9CC", fortune: "#F5D46B", spirit: "#F5D46B"
  };
  const FAM = { conj: "var(--as-conj)", hard: "var(--as-hard)", soft: "var(--as-soft)", minor: "var(--as-minor)", creative: "var(--as-creative)" };
  const f1 = x => Math.round(x * 10) / 10;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function geom(base) {
    const P = (lon, r) => { const t = (base + lon) * Math.PI / 180; return [C + r * Math.cos(t), C - r * Math.sin(t)]; };
    return P;
  }
  /* Spread glyph positions apart so neighbours keep at least `gap` degrees (circular relaxation). */
  function spread(items, gap) {
    const s = items.map((x, i) => ({ i, lon: x.lon, p: x.lon })).sort((a, b) => a.lon - b.lon);
    const n = s.length; if (n < 2) return items.map(x => x.lon);
    if (gap * n > 350) gap = 350 / n;
    for (let it = 0; it < 300; it++) {
      let moved = false;
      for (let k = 0; k < n; k++) {
        const a = s[k], b = s[(k + 1) % n];
        let d = A.norm(b.p - a.p);
        if (n === 2 && d > 180) continue;
        if (d < gap) { const push = (gap - d) / 2 + 0.01; a.p -= push; b.p += push; moved = true; }
      }
      // pull each glyph slightly back toward its true longitude so clusters stay centred
      for (const x of s) { let d = A.norm(x.lon - x.p); if (d > 180) d -= 360; x.p += d * 0.02; }
      if (!moved) break;
    }
    const out = []; for (const x of s) out[x.i] = A.norm(x.p); return out;
  }

  function svg(spec) {
    const inner = spec.inner, outer = spec.outer, o = spec.opts || {};
    const base = o.rotate === "aries" ? 180 : 180 - inner.houses.asc;
    const P = geom(base);
    const bi = !!outer;
    const R = bi
      ? { oBand: [R_ZI, 330], oGlyph: 388, oDeg: 362, oMin: 344, iGlyph: 306, iDeg: 279, iSign: 260, iMin: 243, hOut: 228, hIn: 198 }
      : { iGlyph: 377, iDeg: 343, iSign: 318, iMin: 296, hOut: 268, hIn: 236 };
    const RA = R.hIn; // aspect circle
    const out = [];
    const L = (a, b, attrs) => `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" ${attrs || ""}/>`;
    const T = (p, txt, attrs) => `<text x="${f1(p[0])}" y="${f1(p[1])}" text-anchor="middle" dominant-baseline="central" ${attrs || ""}>${txt}</text>`;
    const circ = (r, attrs) => `<circle cx="${C}" cy="${C}" r="${r}" ${attrs || ""}/>`;
    const sel = spec.selected || null;
    const Ly = Object.assign({ hud: true, signGlyphs: true, signTint: true, ticks: true, cusps: true, houseNums: true, axes: true, degrees: true, leaders: true, stars: true }, o.layers || {});
    const hideSigns = o.hideSigns || [];

    out.push(`<svg class="wheel${sel ? " isolating" : ""}${o.showAspects === false ? " asp-hide" : ""}" viewBox="-70 -70 1140 1140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(spec.label || "Chart wheel")}">`);
    out.push(`<defs><radialGradient id="wcore" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(92,200,224,.10)"/><stop offset=".7" stop-color="rgba(12,18,30,.55)"/><stop offset="1" stop-color="rgba(8,12,20,.85)"/></radialGradient>
      <radialGradient id="wglow" cx="50%" cy="50%" r="50%"><stop offset=".86" stop-color="rgba(0,0,0,0)"/><stop offset=".93" stop-color="color-mix(in srgb,var(--frame) 22%,transparent)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient></defs>`);
    // HUD outer ring: glow + 5° ticks
    if (Ly.hud) out.push(circ(530, `fill="url(#wglow)"`));
    if (Ly.hud) out.push(circ(R_OUT + 22, `fill="none" stroke="var(--line-2)" stroke-width="1" opacity=".7"`));
    if (Ly.hud) for (let d = 0; d < 360; d += 5) out.push(L(P(d, R_OUT + 22), P(d, R_OUT + (d % 30 === 0 ? 34 : 27)), `stroke="var(--frame)" stroke-width="${d % 30 === 0 ? 1.6 : .8}" opacity="${d % 30 === 0 ? .8 : .35}"`));
    // body of the wheel
    out.push(circ(R_OUT, `fill="url(#wcore)" stroke="var(--line-2)" stroke-width="1.5"`));
    // zodiac ring
    for (const s of D.SIGNS) {
      const a0 = s.i * 30, a1 = a0 + 30;
      const p0 = P(a0, R_OUT), p1 = P(a1, R_OUT), q1 = P(a1, R_ZI), q0 = P(a0, R_ZI);
      out.push(`<path d="M${f1(p0[0])},${f1(p0[1])} A${R_OUT},${R_OUT} 0 0 0 ${f1(p1[0])},${f1(p1[1])} L${f1(q1[0])},${f1(q1[1])} A${R_ZI},${R_ZI} 0 0 1 ${f1(q0[0])},${f1(q0[1])} Z" fill="var(--el-${s.element})" fill-opacity="${Ly.signTint && !hideSigns.includes(s.i) ? .09 : 0}" stroke="var(--line-2)" stroke-width="1"/>`);
      if (Ly.signGlyphs && !hideSigns.includes(s.i)) out.push(T(P(a0 + 15, (R_OUT + R_ZI) / 2), s.glyph, `font-size="34" fill="var(--el-${s.element})" class="sg" data-sign="${s.i}"`));
    }
    if (Ly.ticks) for (let d = 0; d < 360; d++) {
      const len = d % 10 === 0 ? 13 : d % 5 === 0 ? 8 : 4;
      out.push(L(P(d, R_ZI), P(d, R_ZI + len), `stroke="var(--muted)" stroke-width="${d % 10 === 0 ? 1.1 : .7}" opacity=".7"`));
    }
    out.push(circ(R_ZI, `fill="none" stroke="var(--line-2)" stroke-width="1.5"`));
    if (bi) out.push(circ(R.oBand[1], `fill="rgba(0,0,0,.18)" stroke="var(--line-2)" stroke-width="1.2"`));
    // houses
    const H = inner.houses, n = H.n;
    out.push(circ(R.hOut, `fill="rgba(0,0,0,.22)" stroke="var(--line-2)" stroke-width="1"`));
    out.push(circ(RA, `fill="rgba(5,8,14,.55)" stroke="var(--line-2)" stroke-width="1.2"`));
    for (let i = 1; i <= n; i++) {
      const lon = H.cusps[i], angle = n === 12 && (i === 1 || i === 4 || i === 7 || i === 10);
      if (Ly.cusps) out.push(L(P(lon, RA), P(lon, bi ? R.oBand[1] : R_ZI), `stroke="${angle ? "var(--text)" : "var(--line-2)"}" stroke-width="${angle ? 1.8 : 1}" opacity="${angle ? .9 : .8}"`));
      const next = H.cusps[i === n ? 1 : i + 1], mid = lon + A.norm(next - lon) / 2;
      if (!Ly.houseNums) continue;
      if (n === 12) out.push(T(P(mid, (R.hOut + RA) / 2), String(i), `class="num" font-size="17" fill="var(--muted)"`));
      else if (i % 3 === 1) out.push(T(P(mid, (R.hOut + RA) / 2), String(i), `class="num" font-size="11" fill="var(--faint)"`));
    }
    // axis labels outside the wheel (inner chart)
    if (Ly.axes && (n === 12 || H.asc != null)) {
      const ax = [["AC", H.asc], ["MC", H.mc], ["DC", H.asc + 180], ["IC", H.mc + 180]];
      for (const [lab, lon] of ax) {
        const z = A.zpos(lon), p = P(lon, R_OUT + 52);
        out.push(L(P(lon, R_OUT), P(lon, R_OUT + 36), `stroke="var(--text)" stroke-width="2"`));
        out.push(`<g class="axis">${T([p[0], p[1] - 9], lab, `class="lbl" font-size="15" fill="#fff" font-weight="600"`)}${T([p[0], p[1] + 10], `${z.d}°<tspan fill="var(--el-${D.SIGNS[z.sign].element})">${D.SIGNS[z.sign].glyph}</tspan>${String(z.m).padStart(2, "0")}′`, `class="num" font-size="13" fill="var(--muted)"`)}</g>`);
      }
    }
    // aspect lines
    const pos = new Map(); // id → lon (aspect circle)
    const ringPts = (ch, ring) => ch.bodies.concat((ch.points || []).filter(p => (o.points || []).includes(p.key))).map(b => ({ ...b, id: ring + ":" + b.key }));
    const innerPts = ringPts(inner, "i"), outerPts = bi ? ringPts(outer, "o") : [];
    innerPts.concat(outerPts).forEach(b => pos.set(b.id, b.lon));
    const hitSet = new Set();
    const aspG = [];
    for (const a of spec.aspects || []) {
      const la = pos.get(a.a), lb = pos.get(a.b); if (la == null || lb == null) continue;
      const hit = sel && (a.a === sel || a.b === sel);
      if (hit) { hitSet.add(a.a); hitSet.add(a.b); }
      const dash = a.cls === "major" ? "" : a.family === "creative" ? `stroke-dasharray="2 4"` : `stroke-dasharray="7 4"`;
      const w = (a.cls === "major" ? 1 + 1.6 * a.strength : .8 + .8 * a.strength) * (hit ? 1.6 : 1);
      const p1 = P(la, RA), p2 = P(lb, RA);
      let g = `<g class="asp${hit ? " hit" : ""}" data-a="${a.a}" data-b="${a.b}">` + L(p1, p2, `stroke="${FAM[a.family]}" stroke-width="${f1(w)}" stroke-linecap="round" ${dash} opacity="${f1(.35 + .6 * a.strength)}"`);
      if (o.aspGlyphs && a.angle > 0) {
        const m = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
        g += `<circle cx="${f1(m[0])}" cy="${f1(m[1])}" r="9" fill="rgba(5,8,14,.9)"/>` + T(m, a.glyph, `font-size="12" fill="${FAM[a.family]}"`);
      }
      aspG.push(g + "</g>");
    }
    out.push(`<g class="asps">${aspG.join("")}</g>`);
    // planet glyph rings
    const drawRing = (pts, ring) => {
      const big = ring === "i";
      const r = big ? { g: R.iGlyph, d: R.iDeg, s: R.iSign, m: R.iMin } : { g: R.oGlyph, d: R.oDeg, s: null, m: R.oMin };
      const gap = big ? (bi ? 6.4 : 5.6) : 5.2;
      const P2 = spread(pts, gap);
      const tickR = big ? (bi ? R.oBand[1] : R_ZI) : R_ZI;
      pts.forEach((b, k) => {
        const disp = P2[k], col = BODY_COL[b.key] || "#ddd";
        const z = b.z, s = D.SIGNS[z.sign];
        const isSel = sel === b.id, partner = hitSet.has(b.id) && !isSel;
        let g = `<g class="planet${isSel ? " sel" : ""}${partner ? " partner" : ""}" data-id="${b.id}" tabindex="0" role="button" aria-label="${esc(b.name)} ${z.d}° ${s.name} ${z.m}′${b.retro ? " retrograde" : ""}">`;
        g += L(P(b.lon, tickR), P(b.lon, tickR - 10), `stroke="${col}" stroke-width="2"`);
        if (Ly.leaders) g += L(P(b.lon, tickR - 10), P(disp, r.g + (big ? 20 : 16)), `stroke="${col}" stroke-width=".8" opacity=".55"`);
        g += `<circle cx="${f1(P(b.lon, RA)[0])}" cy="${f1(P(b.lon, RA)[1])}" r="3" fill="${col}"/>`;
        const gp = P(disp, r.g);
        g += `<circle class="halo" cx="${f1(gp[0])}" cy="${f1(gp[1])}" r="${big ? 20 : 16}"/>`;
        const gtxt = b.glyph.length > 3 ? b.glyph : b.glyph; // AC/MC text or symbol
        const isText = /^[A-Za-z]/.test(b.glyph);
        g += `<g class="gl">` + T(gp, esc(gtxt), `font-size="${isText ? (big ? 17 : 14) : (big ? 30 : 24)}" fill="${col}" ${isText ? 'class="lbl" font-weight="600"' : ""}`);
        if (Ly.degrees) {
          g += T(P(disp, r.d), `${z.d}°`, `class="num" font-size="${big ? 15 : 12.5}" fill="var(--text)"`);
          if (r.s) g += T(P(disp, r.s), s.glyph, `font-size="17" fill="var(--el-${s.element})"`);
          g += T(P(disp, r.m), `${String(z.m).padStart(2, "0")}′${b.retro ? "℞" : ""}`, `class="num" font-size="${big ? 12.5 : 11}" fill="${b.retro ? "var(--red)" : "var(--muted)"}"`);
        }
        g += `</g></g>`;
        out.push(g);
      });
    };
    // fixed stars: small four-point stars in the outer HUD band, named on hover
    if (Ly.stars && o.stars) for (const st of o.stars) {
      const sp = P(st.lon, R_OUT + 11), hit = st.hits && st.hits.length;
      out.push(`<g class="star"><title>${esc(st.name)} ${A.fmtLon(st.lon)}${hit ? " · conjunct " + st.hits.map(h => h.key).join(", ") : ""}</title>${T(sp, "✦", `font-size="${hit ? 15 : 11}" fill="${st.royal ? "var(--gold)" : hit ? "var(--amber)" : "var(--muted)"}" opacity="${hit ? 1 : .75}"`)}</g>`);
    }
    const AXES = ["asc", "mc", "dsc", "ic"]; // drawn as the axes, not as glyphs on the ring
    if (bi) drawRing(outerPts.filter(b => !AXES.includes(b.key)), "o");
    drawRing(innerPts.filter(b => !AXES.includes(b.key)), "i");
    out.push(`</svg>`);
    return out.join("");
  }

  /* Tiny static wheel for slot cards: zodiac ring + planet dots. */
  function mini(ch) {
    if (!ch) return "";
    const base = 180 - ch.houses.asc, P = geom(base);
    let s = `<svg viewBox="0 0 1000 1000" class="mini"><circle cx="500" cy="500" r="470" fill="none" stroke="var(--line-2)" stroke-width="30"/>`;
    for (const z of D.SIGNS) { const p = P(z.i * 30, 470), q = P(z.i * 30, 380); s += `<line x1="${f1(p[0])}" y1="${f1(p[1])}" x2="${f1(q[0])}" y2="${f1(q[1])}" stroke="var(--line-2)" stroke-width="12"/>`; }
    for (const b of ch.bodies) { const p = P(b.lon, 330); s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="44" fill="${BODY_COL[b.key] || "#ccc"}"/>`; }
    const a = P(ch.houses.asc, 470), a2 = P(ch.houses.asc + 180, 470);
    s += `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(a2[0])}" y2="${f1(a2[1])}" stroke="var(--text)" stroke-width="14" opacity=".6"/>`;
    return s + "</svg>";
  }

  root.Wheel = { svg, mini, spread, BODY_COL, FAM };
})(typeof window !== "undefined" ? window : globalThis);
