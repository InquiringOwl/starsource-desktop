/* StarSource techniques beyond a single chart, built on Astro (astro.js) and the engine. No DOM: tested in tests/astro.test.js.
   Tech.findReturn        exact moment a body returns to a longitude (Newton on the ephemeris), for Solar/Lunar Returns
   Tech.solarArc          every natal point moved by (progressed Sun − natal Sun)
   Tech.harmonicChart     every longitude × n (Addey; Hand, Horoscope Symbols ch. on harmonics), equal houses from the harmonic Asc
   Tech.spectrum / wave   the chart as a signal: for each harmonic h, the mean resultant length R_h = |Σ e^{ihλ}| / k
                          (Rayleigh statistic), its phase, chance level and p-value; the waveform Σ cos h(θ − λ)
   Tech.midpoints         midpoint contacts on the 90° dial (Ebertin): X = A/B when X ≡ mid(A,B) mod 90° within orb
   Tech.antiscia          solstice-axis reflections (180° − λ) and contra-antiscia (360° − λ), with contacts
   Tech.profection        annual and monthly profections from the Ascendant (Brennan, Hellenistic Astrology ch. 11)
   Tech.fixedStars        bright and traditional stars from sefstars.txt and their conjunctions to the chart */
(function (root) {
  "use strict";
  const node = typeof module !== "undefined" && module.exports;
  const D = node ? require("./astro-data.js") : root.AstroData;
  const A = node ? require("./astro.js") : root.Astro;
  const norm = A.norm, d180 = x => ((x % 360) + 540) % 360 - 180;

  /* ---------- returns ---------- */
  /* Last moment ≤ beforeJd (dir −1) or first ≥ afterJd (dir +1) when `body` reaches `targetLon`. flags must match the chart (sidereal…). */
  function findReturn(E, body, targetLon, fromJd, dir, flags) {
    const f = flags == null ? E.C.FLG_SWIEPH | E.C.FLG_SPEED : flags | E.C.FLG_SPEED;
    const p0 = E.calc(fromJd, body, f);
    const mean = body === 0 ? 0.985647 : body === 1 ? 13.176358 : Math.abs(p0.speedLon) || 1;
    // how far past (or before) the target the body is now, in degrees along its motion
    let jd = dir < 0 ? fromJd - norm(p0.lon - targetLon) / mean : fromJd + norm(targetLon - p0.lon) / mean;
    for (let i = 0; i < 40; i++) {
      const p = E.calc(jd, body, f);
      const diff = d180(p.lon - targetLon);
      if (Math.abs(diff) < 1e-9) break;
      jd -= diff / (p.speedLon || mean);
    }
    if (dir < 0 && jd > fromJd + 1e-6) jd = findReturn(E, body, targetLon, jd - (body === 0 ? 300 : 20), -1, flags);
    if (dir > 0 && jd < fromJd - 1e-6) jd = findReturn(E, body, targetLon, jd + (body === 0 ? 300 : 20), 1, flags);
    return jd;
  }
  const chartFlags = (E, o) => {
    let f = E.C.FLG_SWIEPH | E.C.FLG_SPEED;
    if (o.zodiac === "sidereal") { E.setSidMode(+o.ayanamsa); f |= E.C.FLG_SIDEREAL; }
    return f;
  };

  /* ---------- re-housing a list of longitudes ---------- */
  function rebuild(src, map, H, nH, extra) {
    const isDay = src.isDay;
    const bodies = src.bodies.map(b => { const meta = D.BODIES.find(k => k.key === b.key) || { cls: b.cls }; return A.pointInfo(b.key, b.name, b.glyph, map(b.lon), extra.speed ? b.speed * extra.speed : 0, b.lat, b.dist, H, nH, isDay, meta); });
    const points = src.points.map(p => { const x = A.pointInfo(p.key, p.name, p.glyph, map(p.lon), 0, 0, 0, H, nH, isDay, { cls: "angle" }); x.cls = "angle"; return x; });
    return Object.assign({}, src, { bodies, points, houses: Object.assign({}, src.houses, { cusps: H.cusps, asc: H.asc, mc: H.mc, n: nH }) }, extra.props || {});
  }

  /* ---------- solar arc directions ---------- */
  function solarArc(E, natal, natalJd, targetJd) {
    const o = natal.opts;
    const pj = A.progressedJd(natalJd, targetJd);
    const f = chartFlags(E, o);
    const progSun = E.calc(pj, 0, f).lon, natSun = natal.bodies.find(b => b.key === "sun") ? natal.bodies.find(b => b.key === "sun").lon : E.calc(natalJd, 0, f).lon;
    const arc = norm(progSun - natSun);
    const nH = natal.houses.n;
    const cusps = natal.houses.cusps.map((c, i) => i === 0 ? 0 : norm(c + arc));
    const H = { cusps, asc: norm(natal.houses.asc + arc), mc: norm(natal.houses.mc + arc) };
    const ch = rebuild(natal, l => norm(l + arc), H, nH, { props: { directed: true, arc, progJd: pj } });
    return { chart: ch, arc, progJd: pj };
  }

  /* ---------- harmonic chart ---------- */
  function harmonicChart(natal, n) {
    const k = Math.max(1, Math.round(n));
    const asc = norm(natal.houses.asc * k), mc = norm(natal.houses.mc * k);
    const cusps = [0]; for (let i = 0; i < 12; i++) cusps.push(norm(asc + 30 * i));
    const H = { cusps, asc, mc };
    return rebuild(natal, l => norm(l * k), H, 12, { speed: k, props: { harmonic: k, houses: { sys: "A", name: `H${k} · equal from harmonic Asc`, n: 12, cusps, asc, mc, armc: natal.houses.armc } } });
  }

  /* ---------- harmonic spectrum (the chart as a signal) ---------- */
  /* lons: array of longitudes (degrees). Returns [{h, R, phase (deg, where the h-th wave peaks first), chance, ratio, p, pairs}] for h = 1…N. */
  function spectrum(lons, N, opts) {
    const o = Object.assign({ orb: 12, keys: null }, opts);
    const k = lons.length, out = [];
    const chance = Math.sqrt(Math.PI) / (2 * Math.sqrt(k)); // E[R] for k independent uniform angles
    const rad = Math.PI / 180;
    for (let h = 1; h <= N; h++) {
      let c = 0, s = 0;
      for (const l of lons) { c += Math.cos(h * l * rad); s += Math.sin(h * l * rad); }
      const R = Math.sqrt(c * c + s * s) / k;
      const phase = norm(Math.atan2(s, c) / rad) / h; // first longitude where the h-wave peaks
      // Rayleigh test (Zar, Biostatistical Analysis eq. 27.4 approximation)
      const Z = k * R * R;
      const p = Math.min(1, Math.exp(Math.sqrt(1 + 4 * k + 4 * (k * k - k * k * R * R)) - (1 + 2 * k)));
      // pairs that form a harmonic-h conjunction: h·separation within orb of 0 (mod 360)
      const pairs = [];
      for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
        const dev = Math.abs(d180(h * (lons[i] - lons[j])));
        if (dev <= o.orb) pairs.push({ i, j, a: o.keys ? o.keys[i] : i, b: o.keys ? o.keys[j] : j, dev: dev / h, hdev: dev });
      }
      pairs.sort((x, y) => x.hdev - y.hdev);
      out.push({ h, R, phase, chance, ratio: R / chance, Z, p, pairs, wavelength: 360 / h });
    }
    return out;
  }
  /* Waveform of harmonic h over 0…360° (samples points): (1/k) Σ cos h(θ − λ). */
  function wave(lons, h, samples) {
    const n = samples || 361, k = lons.length, rad = Math.PI / 180, out = [];
    for (let i = 0; i < n; i++) { const t = i * 360 / (n - 1); let v = 0; for (const l of lons) v += Math.cos(h * (t - l) * rad); out.push([t, v / k]); }
    return out;
  }
  /* Sum of the first H harmonics weighted by their amplitude: a smoothed "density" of the chart around the circle. */
  function synthesis(lons, H, samples) {
    const n = samples || 361, k = lons.length, rad = Math.PI / 180, out = [];
    for (let i = 0; i < n; i++) { const t = i * 360 / (n - 1); let v = 0; for (let h = 1; h <= H; h++) for (const l of lons) v += Math.cos(h * (t - l) * rad); out.push([t, (1 + 2 * v / k) / H]); }
    return out;
  }

  /* ---------- midpoints on the 90° dial ---------- */
  function midpoints(pts, orb) {
    const o = orb == null ? 1.5 : orb, res = [];
    const mids = [];
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) mids.push({ a: pts[i], b: pts[j], lon: A.midpoint(pts[i].lon, pts[j].lon) });
    for (const x of pts) {
      const hits = [];
      for (const m of mids) {
        if (m.a.key === x.key || m.b.key === x.key) continue;
        let d = ((x.lon - m.lon) % 90 + 90) % 90; if (d > 45) d -= 90;
        if (Math.abs(d) <= o) hits.push({ a: m.a.key, b: m.b.key, mid: m.lon, orb: Math.abs(d), aspect: aspectOfMid(x.lon, m.lon) });
      }
      hits.sort((p, q) => p.orb - q.orb);
      if (hits.length) res.push({ key: x.key, lon: x.lon, hits });
    }
    return { list: res, all: mids };
  }
  function aspectOfMid(x, m) { const s = A.sep(x, m); return s < 22.5 ? "conj" : s > 157.5 ? "opp" : "sq"; }

  /* ---------- antiscia ---------- */
  function antiscia(pts, orb) {
    const o = orb == null ? 1 : orb, out = [];
    for (const p of pts) {
      const ant = norm(180 - p.lon), con = norm(360 - p.lon);
      const contacts = [];
      for (const q of pts) {
        if (q.key === p.key) continue;
        const da = A.sep(ant, q.lon), dc = A.sep(con, q.lon);
        if (da <= o) contacts.push({ kind: "antiscion", key: q.key, orb: da });
        if (dc <= o) contacts.push({ kind: "contra-antiscion", key: q.key, orb: dc });
      }
      out.push({ key: p.key, lon: p.lon, ant, con, contacts });
    }
    return out;
  }

  /* ---------- profections ---------- */
  function profection(natal, natalJd, targetJd) {
    const asc = natal.points.find(p => p.key === "asc");
    const years = (targetJd - natalJd) / A.TROPICAL_YEAR;
    const age = Math.max(0, Math.floor(years));
    const sign = (asc.sign + age) % 12;
    const month = Math.floor((years - age) * 12);
    const msign = (sign + month) % 12;
    const lord = D.SIGNS[sign].ruler, mlord = D.SIGNS[msign].ruler;
    const occupants = natal.bodies.filter(b => b.sign === sign).map(b => b.key);
    return { age, house: (age % 12) + 1, sign, lord, month: month + 1, msign, mlord, occupants, nextJd: natalJd + (age + 1) * A.TROPICAL_YEAR };
  }

  /* ---------- fixed stars ---------- */
  const STARS = ["Algol", "Alcyone", "Aldebaran", "Rigel", "Capella", "Bellatrix", "Alnilam", "Betelgeuse", "Sirius", "Canopus", "Castor", "Pollux",
    "Procyon", "Alphard", "Regulus", "Zosma", "Denebola", "Vindemiatrix", "Algorab", "Spica", "Arcturus", "Acrux", "Zubenelgenubi", "Alphecca",
    "Zubeneschamali", "Unukalhai", "Agena", "Rigil Kentaurus", "Antares", "Ras Algethi", "Rasalhague", "Shaula", "Facies", "Nunki", "Vega", "Altair",
    "Deneb Algedi", "Sadalmelik", "Fomalhaut", "Deneb", "Achernar", "Markab", "Scheat", "Algenib", "Alpheratz", "Mirach", "Hamal", "Polaris", "Alkaid"];
  /* The four Royal Stars (Persian watchers) and the fifteen Behenian stars (Hermes, Agrippa) get a tag. */
  const ROYAL = ["Aldebaran", "Regulus", "Antares", "Fomalhaut"];
  const BEHENIAN = ["Algol", "Alcyone", "Aldebaran", "Capella", "Sirius", "Procyon", "Regulus", "Algorab", "Spica", "Arcturus", "Alphecca", "Antares", "Vega", "Deneb Algedi"];
  function fixedStars(E, ch, orb) {
    const o = orb == null ? 1 : orb;
    const f = chartFlags(E, ch.opts || {});
    const targets = ch.bodies.concat(ch.points.filter(p => ["asc", "mc", "dsc", "ic"].includes(p.key)));
    const out = [];
    for (const n of STARS) {
      const s = E.fixstar(n, ch.jd, f); if (!s) continue;
      const hits = targets.filter(t => A.sep(t.lon, s.lon) <= o).map(t => ({ key: t.key, orb: A.sep(t.lon, s.lon) }));
      out.push({ name: n, id: s.name, lon: s.lon, lat: s.lat, hits, royal: ROYAL.includes(n), behenian: BEHENIAN.includes(n) });
    }
    return out.sort((a, b) => a.lon - b.lon);
  }

  const Tech = { findReturn, solarArc, harmonicChart, spectrum, wave, synthesis, midpoints, antiscia, profection, fixedStars, STARS, ROYAL, BEHENIAN, chartFlags };
  if (node) module.exports = Tech; else root.Tech = Tech;
})(typeof window !== "undefined" ? window : globalThis);
