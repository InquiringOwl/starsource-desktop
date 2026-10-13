/* StarSource chart maths on top of the Swiss Ephemeris engine (web/engine/swe.js). No DOM: tested in tests/astro.test.js.
   Astro.chart(E, opts)    → positions, houses, angles, lots, dignities for one moment and place
   Astro.aspects(A, B, o)  → aspect list between two point lists (or within one)
   Astro.localToUT(…)      → civil local time in an IANA zone → UT Julian day (leap seconds via the engine)
   Astro.dms(x)            → degrees, minutes, seconds with carry */
(function (root) {
  "use strict";
  const D = (typeof module !== "undefined" && module.exports) ? require("./astro-data.js") : root.AstroData;
  const norm = x => ((x % 360) + 360) % 360;
  const sep = (a, b) => { const d = Math.abs(norm(a) - norm(b)) % 360; return d > 180 ? 360 - d : d; };
  const midpoint = (a, b) => { const d = norm(b - a); return norm(a + (d > 180 ? d - 360 : d) / 2); };
  const TROPICAL_YEAR = 365.242199;

  /* ---------- formatting: degrees → d° m′ s″ (rounded to the second, with carry) ---------- */
  function dms(x, opts) {
    const o = opts || {};
    const neg = x < 0; let t = Math.round(Math.abs(x) * 3600);
    if (o.mod) t = t % (o.mod * 3600);
    const d = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return { neg, d, m, s, str: (neg ? "−" : "") + d + "°" + String(m).padStart(2, "0") + "′" + String(s).padStart(2, "0") + "″" };
  }
  /* Longitude → sign index + position in sign, rounding to the second first so 29°59′59.7″ becomes 0°00′00″ of the next sign */
  function zpos(lon) {
    let t = Math.round(norm(lon) * 3600) % (360 * 3600);
    const sign = Math.floor(t / 108000); t -= sign * 108000;
    const d = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return { sign, d, m, s, deg: norm(lon) - sign * 30, str: d + "°" + String(m).padStart(2, "0") + "′" + String(s).padStart(2, "0") + "″" };
  }
  const fmtLon = lon => { const z = zpos(lon); return z.str.replace("°", "°" + D.SIGNS[z.sign].glyph); };

  /* ---------- time ---------- */
  /* Offset (minutes east of UTC) of an IANA zone at a UTC instant, from the platform's tz database (Intl). */
  function zoneOffset(tz, utcMs) {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", era: "short" });
    const p = {}; for (const x of f.formatToParts(new Date(utcMs))) p[x.type] = x.value;
    let y = +p.year; if (p.era && /^B/.test(p.era)) y = 1 - y;
    const asUtc = utcMsOf(y, +p.month, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
  }
  function utcMsOf(y, mo, d, h, mi, s) { const t = new Date(Date.UTC(2000, mo - 1, d, h, mi, s)); t.setUTCFullYear(y); return t.getTime(); }
  /* Local civil time → UTC components. offsetMin overrides the zone (minutes east of UTC). */
  function localToUTC(t, tz, offsetMin) {
    const local = utcMsOf(t.y, t.mo, t.d, t.h || 0, t.mi || 0, Math.floor(t.s || 0));
    let off;
    if (offsetMin != null && offsetMin !== "") off = +offsetMin;
    else {
      off = zoneOffset(tz, local); // first guess: offset at "local as if UTC"
      off = zoneOffset(tz, local - off * 60000);
      const off2 = zoneOffset(tz, local - off * 60000); if (off2 !== off) off = off2;
    }
    const u = new Date(local - off * 60000);
    return { y: u.getUTCFullYear(), mo: u.getUTCMonth() + 1, d: u.getUTCDate(), h: u.getUTCHours(), mi: u.getUTCMinutes(), s: u.getUTCSeconds() + ((t.s || 0) % 1), offset: off };
  }
  function localToUT(E, t, tz, offsetMin) {
    const u = localToUTC(t, tz, offsetMin);
    const r = E.utcToJd(u.y, u.mo, u.d, u.h, u.mi, u.s, 1);
    return { jd: r.ut, tt: r.tt, utc: u, offset: u.offset };
  }
  /* UT Julian day → {y, mo, d, h, mi, s} in a zone (for showing a chart's moment). */
  function jdToLocal(E, jd, tz, offsetMin) {
    const ms = (jd - 2440587.5) * 86400000;
    const off = offsetMin != null && offsetMin !== "" ? +offsetMin : zoneOffset(tz || "UTC", ms);
    const d = new Date(Math.round(ms + off * 60000));
    return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), offset: off };
  }
  const nowJd = () => Date.now() / 86400000 + 2440587.5;
  const fmtOffset = m => (m < 0 ? "−" : "+") + String(Math.floor(Math.abs(m) / 60)).padStart(2, "0") + ":" + String(Math.abs(m) % 60).padStart(2, "0");

  /* ---------- dignities ---------- */
  const SEVEN = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];
  function termRuler(signIdx, deg) { for (const [r, end] of D.TERMS[signIdx]) if (deg < end) return r; return D.TERMS[signIdx][4][0]; }
  function faceRuler(lon) { return D.FACES[Math.min(35, Math.floor(norm(lon) / 10))]; }
  function decanInfo(lon) {
    const s = Math.floor(norm(lon) / 30), n = Math.min(2, Math.floor((norm(lon) - s * 30) / 10));
    const ds = D.decanSign(s, n);
    return { n: n + 1, sign: ds, ruler: D.SIGNS[ds].modern, trad: D.SIGNS[ds].ruler, face: faceRuler(lon) };
  }
  function dignity(key, lon, isDay) {
    const s = D.SIGNS[Math.floor(norm(lon) / 30)], deg = norm(lon) % 30;
    const out = [];
    if (s.ruler === key || (s.modern === key && s.modern !== s.ruler)) out.push({ k: "domicile", w: 5, label: "Domicile" + (s.ruler === key ? "" : " (modern)") });
    if (s.exalt === key) out.push({ k: "exaltation", w: 4, label: "Exaltation" + (Math.abs(deg - s.exaltDeg) < 1 ? " (exact degree)" : "") });
    if (SEVEN.includes(key)) {
      const tr = D.TRIPLICITY[s.element];
      if (tr[isDay ? 0 : 1] === key) out.push({ k: "triplicity", w: 3, label: "Triplicity (" + (isDay ? "day" : "night") + ")" });
      else if (tr[2] === key) out.push({ k: "triplicity", w: 3, label: "Triplicity (participating)" });
      if (termRuler(s.i, deg) === key) out.push({ k: "term", w: 2, label: "Bound (Egyptian)" });
      if (faceRuler(lon) === key) out.push({ k: "face", w: 1, label: "Face (Chaldean decan)" });
    }
    if (s.detriment === key) out.push({ k: "detriment", w: -5, label: "Detriment" });
    if (s.fall === key) out.push({ k: "fall", w: -4, label: "Fall" });
    const score = out.reduce((a, x) => a + x.w, 0);
    const essential = out.some(x => x.w > 0);
    return { list: out, score, peregrine: SEVEN.includes(key) && !essential };
  }

  /* ---------- houses ---------- */
  function houseOf(lon, cusps, n) {
    const L = norm(lon);
    for (let i = 1; i <= n; i++) {
      const a = cusps[i], b = cusps[i === n ? 1 : i + 1];
      const span = norm(b - a), off = norm(L - a);
      if (off < span || span === 0) return i;
    }
    return 1;
  }

  /* ---------- one chart ---------- */
  /* opts: {jd (UT), lat, lon, alt, zodiac 'tropical'|'sidereal', ayanamsa (id), hsys, node 'true'|'mean', lilith 'mean'|'oscu',
            center 'geo'|'topo', bodies: [keys] (default: every body marked on) } */
  function chart(E, opts) {
    const o = Object.assign({ zodiac: "tropical", ayanamsa: 1, hsys: "P", node: "true", lilith: "mean", center: "geo", alt: 0 }, opts);
    let flags = E.C.FLG_SWIEPH | E.C.FLG_SPEED;
    const sidereal = o.zodiac === "sidereal";
    if (sidereal) { E.setSidMode(o.ayanamsa); flags |= E.C.FLG_SIDEREAL; }
    if (o.center === "topo") { E.setTopo(o.lon, o.lat, o.alt || 0); flags |= E.C.FLG_TOPOCTR; }
    const H = E.houses(o.jd, o.lat, o.lon, o.hsys, sidereal ? E.C.FLG_SIDEREAL : 0);
    const nH = o.hsys === "G" ? 36 : 12;
    const eps = E.obliquity(o.jd);
    const want = o.bodies || D.BODIES.filter(b => b.on).map(b => b.key);
    const sunLon = E.calc(o.jd, 0, flags).lon;
    const isDay = norm(sunLon - H.asc) > 180; // Sun between Descendant and Ascendant through the MC = above the horizon
    const bodies = [];
    let nodeLon = null, nodeSpeed = 0;
    for (const b of D.BODIES) {
      if (!want.includes(b.key) && !(b.key === "node" && want.includes("snode"))) continue;
      let p;
      if (b.derived === "node") { if (nodeLon == null) continue; p = { lon: norm(nodeLon + 180), lat: 0, speedLon: nodeSpeed, dist: 0 }; }
      else {
        const id = b.alt ? b.alt[b.key === "node" ? o.node : o.lilith] : b.id;
        try { p = E.calc(o.jd, id, flags); } catch (e) { continue; }
        if (b.key === "node") { nodeLon = p.lon; nodeSpeed = p.speedLon; if (!want.includes("node")) continue; }
      }
      bodies.push(pointInfo(b.key, b.name, b.glyph, p.lon, p.speedLon, p.lat, p.dist, H, nH, isDay, b));
    }
    const moon = bodies.find(b => b.key === "moon"), sun = bodies.find(b => b.key === "sun");
    const pts = [];
    const add = (key, lon, speed) => { const d = D.POINTS.find(p => p.key === key); pts.push(pointInfo(key, d.name, d.glyph, lon, speed || 0, 0, 0, H, nH, isDay, { cls: "angle" })); };
    add("asc", H.asc, H.ascSpeed); add("mc", H.mc, H.mcSpeed); add("dsc", H.asc + 180, H.ascSpeed); add("ic", H.mc + 180, H.mcSpeed); add("vertex", H.vertex);
    const sunL = sun ? sun.lon : sunLon, moonL = moon ? moon.lon : E.calc(o.jd, 1, flags).lon;
    // Hellenistic lots (Valens): Fortune = Asc + Moon − Sun by day, Asc + Sun − Moon by night; Spirit the reverse
    add("fortune", isDay ? H.asc + moonL - sunL : H.asc + sunL - moonL);
    add("spirit", isDay ? H.asc + sunL - moonL : H.asc + moonL - sunL);
    pts.forEach(p => p.cls = "angle");
    return {
      jd: o.jd, lat: o.lat, lon: o.lon, opts: o, sidereal, isDay, eps,
      ayanamsa: sidereal ? E.ayanamsa(o.jd, o.ayanamsa) : 0,
      ayanamsaName: sidereal ? E.ayanamsaName(o.ayanamsa) : "",
      houses: { sys: o.hsys, name: E.houseName(o.hsys), n: nH, cusps: H.cusps, asc: H.asc, mc: H.mc, armc: H.armc, vertex: H.vertex, warn: H.warn, ok: H.ok },
      bodies, points: pts,
      sidTime: E.sidTime(o.jd), deltaT: E.deltaT(o.jd) * 86400
    };
  }
  function pointInfo(key, name, glyph, lon, speed, lat, dist, H, nH, isDay, meta) {
    const z = zpos(lon);
    const info = {
      key, name, glyph, lon: norm(lon), lat: lat || 0, dist: dist || 0, speed: speed || 0, retro: (speed || 0) < 0 && meta.cls !== "angle" && meta.cls !== "point",
      cls: meta.cls, sign: z.sign, z, house: houseOf(lon, H.cusps, nH), decan: decanInfo(lon), term: termRuler(z.sign, norm(lon) % 30)
    };
    info.dignity = dignity(key, lon, isDay);
    info.stationary = Math.abs(info.speed) < 0.002 && meta.cls !== "angle";
    return info;
  }

  /* ---------- derived charts ---------- */
  function progressedJd(natalJd, targetJd) { return natalJd + (targetJd - natalJd) / TROPICAL_YEAR; }
  /* Midpoint composite: every body at the midpoint of the two natal positions; houses from the midpoint ARMC at the mean latitude. */
  function composite(E, a, b, opts) {
    const mapA = new Map(a.bodies.map(x => [x.key, x]));
    const meanLat = (a.lat + b.lat) / 2;
    const armc = midpoint(a.houses.armc, b.houses.armc);
    const eps = (a.eps + b.eps) / 2;
    const H = E.housesArmc(armc, meanLat, eps, a.houses.sys);
    const nH = a.houses.sys === "G" ? 36 : 12;
    const isDay = a.isDay;
    const bodies = b.bodies.filter(x => mapA.has(x.key)).map(x => {
      const y = mapA.get(x.key);
      const meta = D.BODIES.find(k => k.key === x.key) || {};
      return pointInfo(x.key, x.name, x.glyph, midpoint(y.lon, x.lon), (y.speed + x.speed) / 2, 0, 0, H, nH, isDay, meta);
    });
    const pts = [];
    const add = (key, lon) => { const d = D.POINTS.find(p => p.key === key); const p = pointInfo(key, d.name, d.glyph, lon, 0, 0, 0, H, nH, isDay, { cls: "angle" }); p.cls = "angle"; pts.push(p); };
    add("asc", H.asc); add("mc", H.mc); add("dsc", H.asc + 180); add("ic", H.mc + 180); add("vertex", H.vertex);
    const mp = k => { const x = a.points.find(p => p.key === k), y = b.points.find(p => p.key === k); return midpoint(x.lon, y.lon); };
    add("fortune", mp("fortune")); add("spirit", mp("spirit"));
    return { jd: (a.jd + b.jd) / 2, lat: meanLat, lon: midpoint(a.lon, b.lon), opts: a.opts, sidereal: a.sidereal, isDay, eps, ayanamsa: a.ayanamsa, ayanamsaName: a.ayanamsaName,
      houses: { sys: a.houses.sys, name: a.houses.name, n: nH, cusps: H.cusps, asc: H.asc, mc: H.mc, armc, vertex: H.vertex, ok: H.ok }, bodies, points: pts, composite: true };
  }

  /* ---------- aspects ---------- */
  /* A, B: point lists ({key, lon, speed}); B omitted = aspects within A. o: {aspects: [keys], orbScale (1), luminaryBonus (true), moving: 'both'|'A'} */
  function aspects(A, B, opts) {
    const o = Object.assign({ orbScale: 1, luminaryBonus: true }, opts);
    const list = D.ASPECTS.filter(a => (o.aspects ? o.aspects.includes(a.key) : a.on));
    const orbs = o.orbs || {};
    const out = [];
    const same = !B; B = B || A;
    for (let i = 0; i < A.length; i++) for (let j = same ? i + 1 : 0; j < B.length; j++) {
      const p = A[i], q = B[j];
      if (same && p.key === q.key) continue;
      if ((p.key === "node" && q.key === "snode") || (p.key === "snode" && q.key === "node")) continue;
      if ((p.key === "asc" && q.key === "dsc") || (p.key === "mc" && q.key === "ic") || (p.key === "dsc" && q.key === "asc") || (p.key === "ic" && q.key === "mc")) continue;
      const s = sep(p.lon, q.lon);
      let best = null;
      for (const a of list) {
        let orb = (orbs[a.key] != null ? orbs[a.key] : a.orb) * o.orbScale;
        if (o.luminaryBonus && a.cls === "major" && (isLum(p) || isLum(q))) orb += 1;
        const diff = Math.abs(s - a.angle);
        if (diff <= orb && (!best || diff < best.diff)) best = { a, diff, orb };
      }
      if (!best) continue;
      // applying if the separation is moving toward the exact angle (B's speed ignored when only A moves, e.g. transits to natal)
      const dt = 1 / 1440, vp = p.speed || 0, vq = same || o.moving === "both" ? (q.speed || 0) : 0;
      const s2 = sep(p.lon + vp * dt, q.lon + vq * dt);
      const applying = Math.abs(s2 - best.a.angle) < best.diff;
      out.push({ p: p.key, q: q.key, pi: i, qi: j, aspect: best.a.key, name: best.a.name, glyph: best.a.glyph, family: best.a.family, cls: best.a.cls,
        angle: best.a.angle, sep: s, orb: best.diff, maxOrb: best.orb, applying, exact: best.diff < 1 / 60, strength: 1 - best.diff / best.orb });
    }
    return out.sort((x, y) => x.orb - y.orb);
  }
  const isLum = p => p.key === "sun" || p.key === "moon";

  /* ---------- balances (elements, modalities, hemispheres) ---------- */
  function balance(c) {
    const el = { fire: 0, earth: 0, air: 0, water: 0 }, mo = { cardinal: 0, fixed: 0, mutable: 0 };
    const counted = c.bodies.filter(b => ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"].includes(b.key));
    const asc = c.points.find(p => p.key === "asc"), mc = c.points.find(p => p.key === "mc");
    for (const b of counted.concat([asc, mc].filter(Boolean))) { const s = D.SIGNS[b.sign]; el[s.element]++; mo[s.modality]++; }
    let above = 0, east = 0;
    for (const b of counted) { const n = b.house; if (n >= 7) above++; if (n >= 10 || n <= 3) east++; }
    return { el, mo, above, below: counted.length - above, east, west: counted.length - east, n: counted.length };
  }

  const Astro = { norm, sep, midpoint, dms, zpos, fmtLon, zoneOffset, localToUTC, localToUT, jdToLocal, nowJd, fmtOffset,
    termRuler, faceRuler, decanInfo, dignity, houseOf, pointInfo, chart, composite, progressedJd, aspects, balance, TROPICAL_YEAR };
  if (typeof module !== "undefined" && module.exports) module.exports = Astro;
  else root.Astro = Astro;
})(typeof window !== "undefined" ? window : globalThis);
