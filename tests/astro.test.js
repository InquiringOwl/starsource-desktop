/* Engine + chart maths tests. Run: node tests/astro.test.js  (part of npm run check)
   Fixtures: tests/fixtures/swetest.json, made with the native swetest built from the same Swiss Ephemeris source
   (tools/make-fixtures.py). The WASM build must reproduce them to 1e-6°. */
const fs = require("fs"), path = require("path");
const R = path.join(__dirname, "..");
const SWE = require(R + "/web/engine/swe.js");
const D = require(R + "/web/src/astro-data.js");
const A = require(R + "/web/src/astro.js");
const T = require(R + "/web/src/techniques.js");
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log("  ✗ " + msg); } };
const near = (a, b, tol, msg) => { const d = Math.abs(((a - b) % 360 + 540) % 360 - 180); ok(d <= tol, `${msg}: ${a} vs ${b} (Δ ${d})`); };

(async () => {
  const files = {}; for (const f of fs.readdirSync(R + "/app/ephe")) files[f] = fs.readFileSync(R + "/app/ephe/" + f);
  const E = await SWE.load({ wasm: fs.readFileSync(R + "/app/engine/swisseph.wasm"), files });
  const fx = JSON.parse(fs.readFileSync(__dirname + "/fixtures/swetest.json", "utf8"));
  const ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 17, 15, 18, 19, 20, 40]; // swetest -p0123456789mtAFDGHIJ order
  for (const c of fx) {
    const [d, m, y] = c.date.split(".").map(Number), [hh, mm, ss] = c.ut.split(":").map(Number);
    const jd = E.julday(y, m, d, hh + mm / 60 + ss / 3600);
    c.bodies.forEach((b, i) => { const p = E.calc(jd, ids[i]); near(p.lon, b[1], 1e-6, `${c.date} ${b[0]} lon`); near(p.speedLon, b[2], 1e-6, `${c.date} ${b[0]} speed`); });
    for (const [h, v] of Object.entries(c.houses)) {
      const H = E.houses(jd, c.lat, c.lon, h);
      const n = h === "G" ? 36 : 12;
      for (let i = 0; i < n; i++) near(H.cusps[i + 1], v[i], 1e-6, `${c.date} ${h} cusp ${i + 1}`);
      near(H.asc, v[n], 1e-6, `${c.date} ${h} Asc`);
    }
    E.setSidMode(1);
    [0, 1, 4, 5].forEach((b, i) => near(E.calc(jd, b, E.C.FLG_SWIEPH | E.C.FLG_SIDEREAL).lon, c.lahiri[i], 1e-6, `${c.date} Lahiri body ${b}`));
  }

  // formatting and rounding carry
  ok(A.dms(29.99999).str === "30°00′00″", "dms carry " + A.dms(29.99999).str);
  const z = A.zpos(59.9999999); ok(z.sign === 2 && z.d === 0 && z.m === 0 && z.s === 0, "zpos carries into the next sign");
  ok(A.zpos(123.5).str === "3°30′00″" && A.zpos(123.5).sign === 4, "zpos 123.5 = 3°30′ Leo");

  // time zones (platform tz database)
  const t1 = A.localToUTC({ y: 1990, mo: 5, d: 15, h: 10, mi: 30, s: 0 }, "America/New_York");
  ok(t1.h === 14 && t1.mi === 30 && t1.offset === -240, "New York EDT 1990 → UTC " + JSON.stringify(t1));
  const t2 = A.localToUTC({ y: 2000, mo: 1, d: 1, h: 0, mi: 0, s: 0 }, "Europe/London");
  ok(t2.h === 0 && t2.offset === 0, "London winter");
  const t3 = A.localToUTC({ y: 2026, mo: 10, d: 12, h: 11, mi: 0, s: 0 }, "America/Los_Angeles");
  ok(t3.h === 18 && t3.offset === -420, "LA PDT 2026");
  const t4 = A.localToUTC({ y: 1955, mo: 3, d: 3, h: 20, mi: 9, s: 9 }, "Australia/Sydney");
  ok(t4.h === 10 && t4.d === 3 && t4.offset === 600, "Sydney 1955 " + JSON.stringify(t4));
  const t5 = A.localToUTC({ y: 1990, mo: 5, d: 15, h: 10, mi: 30, s: 0 }, "UTC", -300);
  ok(t5.h === 15, "manual offset −05:00");
  const back = A.jdToLocal(E, E.julday(2026, 10, 12, 18), "America/Los_Angeles");
  ok(back.h === 11 && back.d === 12, "jdToLocal LA");

  // chart: 15 May 1990 14:30 UT, New York, Placidus (cross-check against fixture 0)
  const jd0 = E.julday(1990, 5, 15, 14.5);
  const ch = A.chart(E, { jd: jd0, lat: 40.7128, lon: -74.006, hsys: "P" });
  near(ch.houses.asc, fx[0].houses.P[12], 1e-6, "chart Asc");
  const sun = ch.bodies.find(b => b.key === "sun");
  ok(sun.sign === 1 && sun.z.d === 24, "Sun in Taurus 24°");
  ok(sun.house === 10, "Sun in house 10, got " + sun.house);
  ok(ch.isDay === true, "day chart (Sun above horizon)");
  const sn = ch.bodies.find(b => b.key === "snode"), nn = ch.bodies.find(b => b.key === "node");
  near(sn.lon, nn.lon + 180, 1e-9, "south node opposite north node");
  const fort = ch.points.find(p => p.key === "fortune"), moon = ch.bodies.find(b => b.key === "moon");
  near(fort.lon, ch.houses.asc + moon.lon - sun.lon, 1e-9, "day Lot of Fortune");
  // houses of every body agree with cusps
  for (const b of ch.bodies) { const i = b.house, a = ch.houses.cusps[i], e = ch.houses.cusps[i % 12 + 1]; ok(A.norm(b.lon - a) < A.norm(e - a), b.key + " inside its house"); }

  // dignities
  ok(A.dignity("mars", 15, true).list.some(x => x.k === "domicile"), "Mars domicile in Aries");
  ok(A.dignity("sun", 19 + 0.5, true).list.some(x => x.k === "exaltation"), "Sun exalted in Aries");
  ok(A.dignity("venus", 15, true).list.some(x => x.k === "detriment"), "Venus detriment in Aries");
  ok(A.dignity("saturn", 15, true).list.some(x => x.k === "fall"), "Saturn fall in Aries");
  ok(A.termRuler(0, 5.9) === "jupiter" && A.termRuler(0, 6) === "venus" && A.termRuler(11, 29) === "saturn", "Egyptian bounds");
  ok(A.faceRuler(0) === "mars" && A.faceRuler(10) === "sun" && A.faceRuler(359) === "mars" && A.faceRuler(30) === "mercury", "Chaldean faces");
  ok(A.decanInfo(45).sign === 5 && A.decanInfo(45).ruler === "mercury", "Taurus 2nd decan = Virgo / Mercury");
  D.TERMS.forEach((t, i) => ok(t[4][1] === 30 && t.every((x, j) => j === 0 || x[1] > t[j - 1][1]), "bounds of sign " + i + " reach 30°"));

  // aspects
  const asp = A.aspects([{ key: "sun", lon: 10, speed: 1 }, { key: "mars", lon: 101, speed: 0.5 }, { key: "saturn", lon: 190, speed: 0 }]);
  const sq = asp.find(a => a.p === "sun" && a.q === "mars");
  ok(sq && sq.aspect === "sq" && Math.abs(sq.orb - 1) < 1e-9, "square with 1° orb");
  ok(sq.applying === true, "Sun (faster) closing from 91° toward the square: applying");
  const op = asp.find(a => a.p === "sun" && a.q === "saturn");
  ok(op && op.aspect === "opp" && op.orb === 0 && op.exact, "exact opposition");
  const ap = A.aspects([{ key: "moon", lon: 88, speed: 13 }], [{ key: "sun", lon: 0, speed: 0 }]);
  ok(ap[0].aspect === "sq" && ap[0].applying, "transit Moon applying to square");

  // composite + progression
  ok(Math.abs(A.midpoint(350, 20) - 5) < 1e-9 && Math.abs(A.midpoint(20, 350) - 5) < 1e-9, "midpoint across 0°");
  ok(Math.abs(A.progressedJd(2450000, 2450000 + 365.242199 * 30) - 2450030) < 1e-9, "30 years → 30 days");
  const ch2 = A.chart(E, { jd: E.julday(1985, 3, 1, 6), lat: 51.5, lon: -0.12, hsys: "P" });
  const comp = A.composite(E, ch, ch2);
  ok(comp.bodies.length === ch.bodies.length && comp.houses.cusps.length === 13, "composite chart");

  // sidereal chart and whole-sign houses
  const sch = A.chart(E, { jd: jd0, lat: 40.7128, lon: -74.006, hsys: "W", zodiac: "sidereal", ayanamsa: 1 });
  near(sch.bodies[0].lon, fx[0].lahiri[0], 1e-6, "sidereal chart Sun");
  ok(sch.houses.cusps.slice(1).every(c => Math.abs(c % 30) < 1e-9), "whole-sign cusps on 0° of signs");


  // ---------- techniques ----------
  const natal = A.chart(E, { jd: jd0, lat: 40.7128, lon: -74.006, hsys: "P" });
  const nSun = natal.bodies.find(b => b.key === "sun").lon;
  const target = E.julday(2026, 10, 12, 18);
  const sr = T.findReturn(E, 0, nSun, target, -1);
  near(E.calc(sr, 0).lon, nSun, 1e-7, "solar return: Sun back on its natal degree");
  const srd = E.revjul(sr); ok(srd.y === 2026 && srd.m === 5 && (srd.d === 14 || srd.d === 15 || srd.d === 16), "solar return falls on the 2026 birthday " + JSON.stringify(srd));
  ok(sr <= target, "solar return before the target date");
  const sr2 = T.findReturn(E, 0, nSun, E.julday(2026, 5, 1, 0), -1); ok(E.revjul(sr2).y === 2025, "return before the birthday comes from the previous year");
  const nMoon = natal.bodies.find(b => b.key === "moon").lon;
  const lr = T.findReturn(E, 1, nMoon, target, -1);
  near(E.calc(lr, 1).lon, nMoon, 1e-7, "lunar return longitude"); ok(target - lr >= 0 && target - lr < 27.4, "lunar return within the last sidereal month");
  const lrn = T.findReturn(E, 1, nMoon, target, 1); ok(lrn > target && lrn - target < 27.4, "next lunar return");
  // sidereal solar return
  const sidN = A.chart(E, { jd: jd0, lat: 40.7128, lon: -74.006, zodiac: "sidereal", ayanamsa: 1 });
  const fS = T.chartFlags(E, sidN.opts); const ssr = T.findReturn(E, 0, sidN.bodies[0].lon, target, -1, fS);
  near(E.calc(ssr, 0, fS).lon, sidN.bodies[0].lon, 1e-7, "sidereal solar return");
  // solar arc
  const sa = T.solarArc(E, natal, jd0, jd0 + 30 * A.TROPICAL_YEAR);
  ok(sa.arc > 28 && sa.arc < 31, "30 years of solar arc ≈ 29–30°: " + sa.arc);
  near(sa.chart.bodies.find(b => b.key === "moon").lon, nMoon + sa.arc, 1e-9, "directed Moon = natal + arc");
  near(sa.chart.bodies.find(b => b.key === "sun").lon, E.calc(A.progressedJd(jd0, jd0 + 30 * A.TROPICAL_YEAR), 0).lon, 1e-9, "directed Sun = progressed Sun");
  // harmonic chart
  const h1 = T.harmonicChart(natal, 1); near(h1.bodies[3].lon, natal.bodies[3].lon, 1e-9, "H1 = natal");
  const h5 = T.harmonicChart(natal, 5); near(h5.bodies[2].lon, natal.bodies[2].lon * 5, 1e-9, "H5 = 5 × longitude");
  ok(h5.houses.cusps[1] === h5.houses.asc, "harmonic houses from harmonic Asc");
  // spectrum
  const sp = T.spectrum([10, 190], 4);
  ok(Math.abs(sp[0].R) < 1e-9 && Math.abs(sp[1].R - 1) < 1e-9 && Math.abs(sp[2].R) < 1e-9 && Math.abs(sp[3].R - 1) < 1e-9, "opposition: R1 = 0, R2 = 1, R3 = 0, R4 = 1");
  const sp3 = T.spectrum([0, 120, 240], 3); ok(Math.abs(sp3[2].R - 1) < 1e-9 && sp3[2].pairs.length === 3, "grand trine: R3 = 1, three pairs");
  ok(Math.abs(T.spectrum([30, 30, 30], 1)[0].phase - 30) < 1e-9, "phase of a stellium");
  const w = T.wave([0], 4, 9); ok(Math.abs(w[0][1] - 1) < 1e-9 && Math.abs(w[1][1] - Math.cos(4 * 45 * Math.PI / 180)) < 1e-9, "waveform values");
  // midpoints
  const mp = T.midpoints([{ key: "sun", lon: 10 }, { key: "moon", lon: 50 }, { key: "mars", lon: 120.5 }, { key: "venus", lon: 300 }], 1);
  const mars = mp.list.find(x => x.key === "mars"); ok(mars && mars.hits.some(h => h.a === "sun" && h.b === "moon" && Math.abs(h.orb - 0.5) < 1e-9 && h.aspect === "sq"), "Mars square Sun/Moon midpoint on the 90° dial");
  // antiscia
  const an = T.antiscia([{ key: "sun", lon: 70 }, { key: "moon", lon: 110.4 }], 1);
  ok(Math.abs(an[0].ant - 110) < 1e-9 && an[0].contacts.some(c => c.key === "moon" && c.kind === "antiscion"), "10° Gemini mirrors to 20° Cancer");
  ok(Math.abs(an[0].con - 290) < 1e-9, "contra-antiscion");
  // profection
  const pr = T.profection(natal, jd0, jd0 + 30.5 * A.TROPICAL_YEAR);
  const ascS = natal.points.find(p => p.key === "asc").sign;
  ok(pr.age === 30 && pr.sign === (ascS + 30) % 12 && pr.house === 7 && pr.month === 7, "profection at 30½: 7th house, 7th month " + JSON.stringify(pr));
  // fixed stars
  const fs2 = T.fixedStars(E, natal, 1); ok(fs2.length === T.STARS.length, "every star found: " + fs2.length + "/" + T.STARS.length);
  near(fs2.find(s => s.name === "Regulus").lon, 149.83 + (1990.37 - 2000) * 50.29 / 3600, 0.02, "Regulus precesses back from 29°50′ Leo (J2000)");

  console.log(`astro.test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
