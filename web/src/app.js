/* StarSource app: screens (Main Menu, Horoscope Chart HUD, Profiles), the profile creator, slots, time console,
   actions and keyboard shortcuts. Engine: SWE (web/engine/swe.js); maths: Astro (astro.js); drawing: Wheel (wheel.js);
   data: Store (store.js); Settings window: settings.js (StarSettings). Routes: #menu, #chart, #profiles. */
(function () {
  "use strict";
  const D = window.AstroData, A = window.Astro, W = window.Wheel, ST = window.Store, T = window.Tech;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n, w) => String(n).padStart(w || 2, "0");
  const SIGN = i => D.SIGNS[i];
  const bodyMeta = k => D.BODIES.find(b => b.key === k) || D.POINTS.find(p => p.key === k) || { name: k, glyph: k };
  const glyphOf = k => { const m = bodyMeta(k); return /^[A-Za-z]/.test(m.glyph) ? `<span class="lbl" style="font:600 12px var(--ui)">${m.glyph}</span>` : `<span class="g" style="color:${W.BODY_COL[k] || "inherit"}">${m.glyph}</span>`; };
  const signG = i => `<span class="g el-${SIGN(i).element}">${SIGN(i).glyph}</span>`;
  const posHTML = lon => { const z = A.zpos(lon); return `${z.d}°${signG(z.sign)}${pad(z.m)}′${pad(z.s)}″`; };
  const ICON = {
    back: '<path d="M15 5l-7 7 7 7"/>', iso: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
    lines: '<path d="M4 18L20 6M4 6l16 12M3 12h18"/>', glyphs: '<circle cx="12" cy="12" r="8"/><path d="M8.5 15l3.5-7 3.5 7M10 12.5h4"/>',
    rotate: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>', now: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    play: '<path d="M8 5l11 7-11 7z"/>', pause: '<path d="M8 5v14M16 5v14"/>', snap: '<rect x="3" y="6" width="18" height="13" rx="1"/><circle cx="12" cy="12.5" r="3.5"/><path d="M9 6l1.5-2h3L15 6"/>',
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    wave: '<path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/><path d="M2 20h20" opacity=".5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5"/>', panel: '<rect x="3" y="4" width="18" height="16"/><path d="M9 4v16M15 4v16"/>'
  };
  const icon = k => `<svg viewBox="0 0 24 24">${ICON[k]}</svg>`;
  const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F5D46B"/><stop offset="1" stop-color="var(--frame)"/></linearGradient></defs>
    <circle cx="32" cy="32" r="28" fill="none" stroke="var(--frame)" stroke-width="2" opacity=".85"/><circle cx="32" cy="32" r="20" fill="none" stroke="var(--line-2)" stroke-width="1.5"/>
    ${Array.from({ length: 12 }, (_, i) => { const t = i * Math.PI / 6; return `<line x1="${32 + 22 * Math.cos(t)}" y1="${32 + 22 * Math.sin(t)}" x2="${32 + 28 * Math.cos(t)}" y2="${32 + 28 * Math.sin(t)}" stroke="var(--frame)" stroke-width="1.5" opacity=".7"/>`; }).join("")}
    <ellipse cx="32" cy="32" rx="25" ry="9" fill="none" stroke="url(#lg)" stroke-width="1.6" transform="rotate(-28 32 32)"/>
    <path d="M32 16 L35 29 L48 32 L35 35 L32 48 L29 35 L16 32 L29 29 Z" fill="url(#lg)"/></svg>`;

  let E = null;
  const S = {
    view: "menu", hist: [], slots: ST.slots(), active: Math.min(ST.active(), 3), sel: null, playing: false, speed: 60, lastTick: 0,
    ui: ST.ui(), set: ST.settings(), comp: null, upd: { status: "idle" }, version: "dev"
  };
  if (S.active >= S.slots.length) S.active = 0;
  const slot = () => S.slots[S.active];
  const saveSlots = () => { ST.saveSlots(S.slots); ST.setActive(S.active); };
  const app = $("#app");

  /* ================= computing a slot ================= */
  const birthUT = p => A.localToUT(E, p.birth, p.birthTz || "UTC", p.birthOffset);
  const ALL_BODIES = D.BODIES.map(b => b.key);
  function chartOpts(sl) { return { zodiac: sl.zodiac, ayanamsa: +sl.ayanamsa, hsys: sl.hsys, node: sl.node, lilith: sl.lilith, center: sl.center, bodies: ALL_BODIES }; }
  const fullName = p => (p.first + " " + (p.last || "")).trim();
  function compute(sl) {
    const p = ST.profile(sl.profile), home = S.set.home, o = chartOpts(sl);
    const now = A.nowJd();
    const r = { slot: sl, p, type: sl.type, outer: null, editable: true, live: false };
    if (!p) {
      r.momentJd = sl.at != null ? sl.at : now; r.live = sl.at == null; r.tz = home.tz; r.place = home.place; r.title = "The sky now";
      r.inner = A.chart(E, Object.assign({ jd: r.momentJd, lat: home.lat, lon: home.lon }, o));
      r.innerLabel = "Sky"; r.type = "sky"; return r;
    }
    const b = birthUT(p);
    r.birthJd = b.jd; r.birthOffset = b.offset; r.title = fullName(p);
    const natalAt = jd => A.chart(E, Object.assign({ jd, lat: p.birthLat, lon: p.birthLon }, o));
    const curLat = p.curLat != null && p.curLat !== "" ? +p.curLat : p.birthLat, curLon = p.curLon != null && p.curLon !== "" ? +p.curLon : p.birthLon;
    const curTz = p.curTz || p.birthTz || "UTC";
    const target = () => { r.momentJd = sl.at != null ? sl.at : now; r.live = sl.at == null; r.tz = curTz; r.place = p.birthPlace; return r.momentJd; };
    const partner = () => { const q = ST.profile(sl.partner); if (!q) return null; const bq = birthUT(q); return { q, jd: bq.jd, ch: A.chart(E, Object.assign({ jd: bq.jd, lat: q.birthLat, lon: q.birthLon }, o)) }; };
    switch (sl.type) {
      case "transit":
        r.inner = natalAt(b.jd); target();
        r.outerAt = { lat: curLat, lon: curLon, place: p.curPlace || p.birthPlace };
        r.outer = A.chart(E, Object.assign({ jd: r.momentJd, lat: curLat, lon: curLon }, o)); r.innerLabel = "Natal"; r.outerLabel = "Transits"; break;
      case "progressed":
        r.inner = natalAt(b.jd); target();
        r.progJd = A.progressedJd(b.jd, r.momentJd);
        r.outer = A.chart(E, Object.assign({ jd: r.progJd, lat: p.birthLat, lon: p.birthLon }, o)); r.innerLabel = "Natal"; r.outerLabel = "Progressed"; break;
      case "solararc": {
        r.inner = natalAt(b.jd); target();
        const sa = T.solarArc(E, r.inner, b.jd, r.momentJd);
        r.outer = sa.chart; r.arc = sa.arc; r.progJd = sa.progJd; r.innerLabel = "Natal"; r.outerLabel = "Directed"; break;
      }
      case "solarreturn": case "lunarreturn": {
        const natal = natalAt(b.jd); target();
        const body = sl.type === "solarreturn" ? 0 : 1, f = T.chartFlags(E, o);
        const lon = natal.bodies.find(x => x.key === (body ? "moon" : "sun")).lon;
        r.eventJd = T.findReturn(E, body, lon, r.momentJd, -1, f);
        r.nextJd = T.findReturn(E, body, lon, r.eventJd + (body ? 1 : 30), 1, f);
        const atBirth = sl.retLoc === "birth";
        const L = atBirth ? { lat: p.birthLat, lon: p.birthLon, place: p.birthPlace } : { lat: curLat, lon: curLon, place: p.curPlace || p.birthPlace };
        r.inner = A.chart(E, Object.assign({ jd: r.eventJd, lat: L.lat, lon: L.lon }, o)); r.place = L.place; r.retAt = L;
        r.innerLabel = body ? "Lunar return" : "Solar return";
        if (sl.natalRing !== false) { r.outer = natal; r.outerLabel = "Natal"; }
        r.natalRef = natal; break;
      }
      case "harmonic": {
        r.momentJd = sl.at != null ? sl.at : b.jd; r.tz = p.birthTz; r.offset = sl.at == null ? p.birthOffset : null; r.place = p.birthPlace; r.edited = sl.at != null;
        const n = Math.max(1, Math.min(360, +sl.harmonic || 5));
        r.natalRef = natalAt(r.momentJd); r.inner = T.harmonicChart(r.natalRef, n); r.innerLabel = "Harmonic " + n; r.harmonic = n; break;
      }
      case "composite": case "synastry": {
        r.editable = false; r.momentJd = b.jd; r.tz = p.birthTz; r.place = p.birthPlace;
        const pq = partner(), natal = natalAt(b.jd);
        if (!pq) { r.inner = natal; r.needPartner = true; r.innerLabel = "Natal"; break; }
        r.title += " + " + fullName(pq.q);
        if (sl.type === "composite") { r.inner = A.composite(E, natal, pq.ch); r.innerLabel = "Composite"; }
        else { r.inner = natal; r.outer = pq.ch; r.innerLabel = fullName(p); r.outerLabel = fullName(pq.q); r.noPhase = true; }
        break;
      }
      default:
        r.momentJd = sl.at != null ? sl.at : b.jd; r.tz = p.birthTz; r.offset = sl.at == null ? p.birthOffset : null; r.place = p.birthPlace;
        r.inner = natalAt(r.momentJd); r.innerLabel = "Natal"; r.edited = sl.at != null;
    }
    return r;
  }
  /* Visibility: every body is computed; slot.bodies / slot.points list the ones shown (wheel, aspects, dial). */
  const visible = (sl, k) => sl.bodies.includes(k) || sl.points.includes(k);
  const pts = (ch, sl, ring) => ch.bodies.filter(b => sl.bodies.includes(b.key)).concat(ch.points.filter(p => sl.points.includes(p.key))).map(b => Object.assign({}, b, { id: ring + ":" + b.key }));
  const shown = (ch, sl) => ch && Object.assign({}, ch, { bodies: ch.bodies.filter(b => sl.bodies.includes(b.key)) });
  function aspectsFor(c) {
    const sl = c.slot, o = { aspects: sl.aspects, orbs: sl.orbs, orbScale: +sl.orbScale || 1 };
    if (c.inner.harmonic) o.aspects = sl.aspects.filter(k => ["conj", "opp", "tri", "sq", "sext"].includes(k));
    const I = pts(c.inner, sl, "i");
    let list = [];
    if (!c.outer) list = A.aspects(I, null, o).map(a => Object.assign(a, { a: "i:" + a.p, b: "i:" + a.q, ring: "ii" }));
    else {
      const O = pts(c.outer, sl, "o");
      list = A.aspects(O, I, Object.assign({ moving: c.noPhase ? "both" : "A" }, o)).map(a => Object.assign(a, { a: "o:" + a.p, b: "i:" + a.q, ring: "oi", noPhase: c.noPhase }));
      if (sl.innerAspects) list = list.concat(A.aspects(I, null, o).map(a => Object.assign(a, { a: "i:" + a.p, b: "i:" + a.q, ring: "ii" })));
    }
    return list;
  }
  function recompute() {
    const c = S.comp = compute(slot()); c.aspects = aspectsFor(c);
    const base = c.inner.harmonic || c.inner.composite || c.inner.directed ? null : c.inner;
    c.stars = base ? T.fixedStars(E, base, +(c.slot.starOrb || 1)) : null;
    return c;
  }

  /* ================= top bar ================= */
  function topbar() {
    const v = S.view;
    const sun = S.skySun;
    const upd = S.upd.status === "ready" ? `<button class="tb-btn" data-act="settings-upd" style="border-color:var(--gold);color:var(--gold)"><span class="upd-dot" style="background:var(--gold);box-shadow:0 0 8px var(--gold)"></span>Update ready</button>` : "";
    return `<header class="topbar">
      <button class="tb-btn" data-act="back" ${S.hist.length || v !== "menu" ? "" : "disabled style='opacity:.4'"} title="Back (Alt+←)"><span class="arrow">◀</span><span class="tlbl">Back</span></button>
      <button class="brand" data-go="menu" title="Main Menu">${LOGO}<b>StarSource</b></button>
      <span class="tb-sep"></span>
      <button class="tb-btn ${v === "menu" ? "on" : ""}" data-go="menu"><span class="tlbl">Main Menu</span><span class="tshort">Menu</span><kbd>M</kbd></button>
      <button class="tb-btn ${v === "chart" ? "on" : ""}" data-go="chart"><span class="tlbl">Horoscope Chart</span><span class="tshort">Chart</span><kbd>H</kbd></button>
      <button class="tb-btn ${v === "harmonics" ? "on" : ""}" data-go="harmonics"><span class="tlbl">Harmonics Lab</span><span class="tshort">Lab</span><kbd>L</kbd></button>
      <button class="tb-btn ${v === "profiles" ? "on" : ""}" data-go="profiles"><span class="tlbl">Profiles</span><span class="tshort">Profiles</span><kbd>P</kbd></button>
      <div class="tb-right">
        ${upd}
        <span class="res" title="The Sun right now (tropical, geocentric)"><span class="lbl">Sun</span><span id="tb-sun">${sun ? posHTML(sun) : "…"}</span></span>
        <span class="res gold" title="Coordinated Universal Time"><span class="lbl">UTC</span><span id="tb-clock">--:--:--</span></span>
        <button class="tb-btn" data-act="settings" title="Settings">Settings<kbd>Esc</kbd></button>
      </div></header>`;
  }
  function tickClock() {
    const d = new Date(), c = $("#tb-clock");
    if (c) c.textContent = pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds());
    if (E) { S.skySun = E.calc(A.nowJd(), 0).lon; const s = $("#tb-sun"); if (s) s.innerHTML = posHTML(S.skySun); }
  }

  /* ================= router ================= */
  function go(view, push) {
    if (view === "harmonics" && S.view !== "harmonics" && window.StarLab) StarLab.state.profile = slot().profile || null;
    if (view !== S.view && push !== false) S.hist.push(S.view);
    S.view = view; S.sel = null;
    if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
    render(true);
  }
  function back() {
    if ($(".ov")) { closeModal(); return; }
    const prev = S.hist.pop() || (S.view !== "menu" ? "menu" : null);
    if (prev) go(prev, false);
  }
  function render(anim) {
    S.playing = false;
    let body = "";
    if (S.view === "chart") body = chartView();
    else if (S.view === "profiles") body = profilesView();
    else if (S.view === "harmonics") body = window.StarLab.view();
    else body = menuView();
    app.innerHTML = topbar() + `<main id="view" class="${anim ? "vt-in" : ""}" style="min-height:0">${body}</main>`;
    tickClock();
    if (S.view === "chart") { drawChart(); wireChart(); }
    if (S.view === "menu") drawSkyNow();
    if (S.view === "harmonics") window.StarLab.draw();
  }

  /* ================= main menu ================= */
  function menuView() {
    const n = ST.profiles().length;
    return `<div class="menu">
      <section class="menu-hero">
        <div class="eyebrow">Wolfie's Coven · Astrology console</div>
        <h1>StarSource</h1>
        <p>Natal, transit, progressed and composite charts computed with the Swiss Ephemeris, every angle to the arcsecond. The sky is read as geometry: angles, harmonics and cycles you can measure.</p>
        <div class="menu-list">
          <button class="mbtn primary" data-go="chart"><span class="ic">${LOGO}</span><span><b>Horoscope Chart</b><small>Up to four charts · every house and zodiac system · live to the second</small></span><kbd>H</kbd></button>
          <button class="mbtn" data-go="profiles"><span class="ic">${icon("user").replace("<svg", '<svg style="width:26px;height:26px;stroke:currentColor;fill:none;stroke-width:1.6"')}</span><span><b>Profiles</b><small>${n ? n + " saved chart" + (n === 1 ? "" : "s") : "No profiles yet"} · birth data and current location</small></span><kbd>P</kbd></button>
          <button class="mbtn" data-act="new-profile"><span class="ic" style="font-family:var(--ui)">＋</span><span><b>Profile Creator</b><small>Name, birth date and time to the second, coordinates</small></span><kbd>N</kbd></button>
          <button class="mbtn" data-go="harmonics"><span class="ic" style="font:500 22px/1 var(--math);color:var(--frame)">H<span style="font-size:13px;vertical-align:-4px">n</span></span><span><b>Harmonics Lab</b><small>The chart as a signal: harmonic spectrum, waveforms and H-n wheels</small></span><kbd>L</kbd></button>
          <button class="mbtn" data-act="settings"><span class="ic" style="font-family:var(--ui);font-size:20px">⚙</span><span><b>Settings</b><small>Appearance, chart defaults, home location, updates</small></span><kbd>Esc</kbd></button>
        </div>
        <div class="ver">StarSource ${esc(S.version)} · Swiss Ephemeris ${E ? esc(E.version()) : ""} (AGPL-3.0) · data 1800–2399 CE, Moshier outside</div>
      </section>
      <aside class="menu-side">
        <div class="win skynow"><div class="win-h"><span class="dot"></span>The sky now<span class="sp muted" style="letter-spacing:.1em">${esc(S.set.home.place || "")}</span></div><div id="skynow"></div></div>
      </aside></div>`;
  }
  function drawSkyNow() {
    const host = $("#skynow"); if (!host || !E) return;
    const h = S.set.home, c = A.chart(E, { jd: A.nowJd(), lat: h.lat, lon: h.lon, hsys: S.set.chart.hsys, zodiac: S.set.chart.zodiac, ayanamsa: S.set.chart.ayanamsa });
    const rows = c.bodies.filter(b => !["snode"].includes(b.key)).map(b => `<tr><td class="g">${glyphOf(b.key)}</td><td>${esc(b.name)}</td><td class="pos">${posHTML(b.lon)}${b.retro ? '<span class="rx">℞</span>' : ""}</td><td class="num">${b.house}</td></tr>`).join("");
    const asc = c.points[0], mc = c.points[1];
    host.innerHTML = `<table class="st"><tr><th></th><th>Body</th><th>Position</th><th style="text-align:right">House</th></tr>${rows}
      <tr><td></td><td>Ascendant</td><td class="pos">${posHTML(asc.lon)}</td><td></td></tr><tr><td></td><td>Midheaven</td><td class="pos">${posHTML(mc.lon)}</td><td></td></tr></table>
      <div class="note">${esc(c.houses.name)} houses · ${c.sidereal ? "sidereal (" + esc(c.ayanamsaName) + ")" : "tropical"} · updates every second</div>`;
  }

  /* ================= profiles ================= */
  function profilesView() {
    const list = ST.profiles();
    const cards = list.map(p => {
      let big = "";
      try {
        const b = birthUT(p), c = A.chart(E, { jd: b.jd, lat: p.birthLat, lon: p.birthLon, bodies: ["sun", "moon"] });
        big = `<div class="big3"><span>${glyphOf("sun")} ${signG(c.bodies[0].sign)} ${esc(SIGN(c.bodies[0].sign).name)}</span><span>${glyphOf("moon")} ${signG(c.bodies[1].sign)} ${esc(SIGN(c.bodies[1].sign).name)}</span><span><span class="lbl" style="font:600 11px var(--ui)">AC</span> ${signG(c.points[0].sign)} ${esc(SIGN(c.points[0].sign).name)}</span></div>`;
      } catch (e) { big = `<div class="err">Could not compute: ${esc(e.message)}</div>`; }
      const t = p.birth;
      return `<div class="win pf-card"><div class="nm">${esc(p.first)} ${esc(p.last || "")}</div>
        <div class="mono">${t.y}-${pad(t.mo)}-${pad(t.d)} ${pad(t.h)}:${pad(t.mi)}:${pad(Math.floor(t.s || 0))} · ${esc(p.birthTz || "")}<br>${coordStr(p.birthLat, true)} ${coordStr(p.birthLon, false)}${p.birthPlace ? " · " + esc(p.birthPlace) : ""}</div>
        ${big}<div class="btns"><button class="btn pri" data-open="${p.id}">Open chart</button><button class="btn" data-edit="${p.id}">Edit</button><button class="btn danger" data-del="${p.id}">Delete</button></div></div>`;
    }).join("");
    return `<div class="profiles"><h2 class="h2">Profiles <button class="btn pri" data-act="new-profile">＋ New profile <kbd>N</kbd></button></h2>
      <p class="muted" style="margin:8px 0 0">Profiles are saved on this computer only.</p>
      <div class="pf-grid">${cards || `<div class="win empty-msg">No profiles yet. Create one to see a natal chart.</div>`}</div></div>`;
  }

  /* ---------- coordinates ---------- */
  function coordStr(v, isLat) {
    if (v == null || v === "" || isNaN(v)) return "—";
    const d = A.dms(Math.abs(+v)); const h = isLat ? (v >= 0 ? "N" : "S") : (v >= 0 ? "E" : "W");
    return `${d.d}°${pad(d.m)}′${pad(d.s)}″${h}`;
  }
  /* "40.7128", "-74.006", "40°42′46″N", "40 42 46 N", "74W00'22", "40n42" → decimal degrees */
  function parseCoord(str, isLat) {
    if (str == null) return NaN; let s = String(str).trim().toUpperCase(); if (!s) return NaN;
    let sign = 1;
    const hm = s.match(/[NSEW]/); if (hm) { if (hm[0] === "S" || hm[0] === "W") sign = -1; if ((hm[0] === "E" || hm[0] === "W") === !!isLat) return NaN; }
    if (/^\s*-/.test(s)) sign = -sign;
    const nums = s.replace(/[NSEW]/g, " ").match(/\d+(?:\.\d+)?/g); if (!nums) return NaN;
    const v = (+nums[0]) + (nums[1] ? +nums[1] / 60 : 0) + (nums[2] ? +nums[2] / 3600 : 0);
    const out = sign * v; if (Math.abs(out) > (isLat ? 90 : 180)) return NaN; return out;
  }
  const tzLookup = (lat, lon) => { try { return window.tzlookup(lat, lon); } catch (e) { return ""; } };
  const tzFor = (lat, lon) => { try { return window.tzlookup(lat, lon); } catch (e) { return ""; } };
  const ZONES = (() => { try { return Intl.supportedValuesOf("timeZone"); } catch (e) { return ["UTC"]; } })();
  const parseOffset = s => { if (s == null || String(s).trim() === "") return null; const m = String(s).trim().replace("−", "-").match(/^([+-])?(\d{1,2})(?::?(\d{2}))?$/); if (!m) return NaN; return (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + (+m[3] || 0)); };

  /* ================= profile creator (modal) ================= */
  function openProfile(id) {
    const p = id ? JSON.parse(JSON.stringify(ST.profile(id))) : null;
    const t = p ? p.birth : { y: 1990, mo: 1, d: 1, h: 12, mi: 0, s: 0 };
    const f = (k, label, val, cls, extra) => `<div class="field ${cls || ""}"><label for="pf-${k}">${label}</label><input class="inp" id="pf-${k}" value="${esc(val == null ? "" : val)}" ${extra || ""}></div>`;
    const html = `<div class="ov" data-ov><div class="win modal" role="dialog" aria-label="Profile creator">
      <div class="win-h"><span class="dot"></span>${p ? "Edit profile" : "Profile creator"}<button class="x" data-close aria-label="Close">✕</button></div>
      <div class="body"><div class="fgrid">
        <div class="fsec">Name</div>
        ${f("first", "First name", p && p.first, "span3", 'autocomplete="off"')}${f("last", "Last name", p && p.last, "span3", 'autocomplete="off"')}
        <div class="fsec">Birth moment (local time at the birthplace)</div>
        ${f("mo", "Month", t.mo, "", 'inputmode="numeric"')}${f("d", "Day", t.d, "", 'inputmode="numeric"')}${f("y", "Year", t.y, "", 'inputmode="numeric"')}
        ${f("h", "Hour (0–23)", t.h, "", 'inputmode="numeric"')}${f("mi", "Minute", t.mi, "", 'inputmode="numeric"')}${f("s", "Second", t.s, "", 'inputmode="decimal"')}
        <div class="fsec">Birthplace</div>
        <div class="field span6"><label for="pf-bcity">Find the birthplace</label><input class="inp" id="pf-bcity" placeholder="Type a city: Ulm · Springfield, Illinois · Paris, FR" autocomplete="off"></div>
        ${f("blat", "Latitude", p ? coordStr(p.birthLat, true) : "", "span2", 'placeholder="40°42′46″N or 40.7128"')}${f("blon", "Longitude", p ? coordStr(p.birthLon, false) : "", "span2", 'placeholder="74°00′22″W or -74.006"')}
        ${f("bplace", "Place name (optional)", p && p.birthPlace, "span2")}
        <div class="field span3"><label for="pf-btz">Time zone (from coordinates)</label><input class="inp" id="pf-btz" list="pf-zones" value="${esc(p ? p.birthTz : "")}"></div>
        ${f("boff", "UTC offset override (optional)", p && p.birthOffset != null ? A.fmtOffset(p.birthOffset) : "", "span3", 'placeholder="e.g. −05:00 for local mean time or war time"')}
        <div class="fsec">Current location (for transits)</div>
        <div class="field span6"><label for="pf-ccity">Find the current location</label><input class="inp" id="pf-ccity" placeholder="Type a city" autocomplete="off"></div>
        ${f("clat", "Latitude", p && p.curLat != null && p.curLat !== "" ? coordStr(p.curLat, true) : "", "span2")}${f("clon", "Longitude", p && p.curLon != null && p.curLon !== "" ? coordStr(p.curLon, false) : "", "span2")}
        ${f("cplace", "Place name (optional)", p && p.curPlace, "span2")}
        <div class="field span3"><label for="pf-ctz">Time zone</label><input class="inp" id="pf-ctz" list="pf-zones" value="${esc(p ? p.curTz || "" : "")}"></div>
        <div class="field span3"><label>&nbsp;</label><button class="btn" data-act="copy-birth" type="button">Same as birthplace</button></div>
        <div class="preview" id="pf-prev">Fill in the birth data to see the conversion to Universal Time.</div>
      </div><datalist id="pf-zones">${ZONES.map(z => `<option value="${esc(z)}">`).join("")}</datalist></div>
      <div class="foot"><span class="err" id="pf-err" style="margin-right:auto;align-self:center"></span><button class="btn" data-close>Cancel</button><button class="btn pri" data-act="save-profile">${p ? "Save" : "Create profile"}</button></div>
    </div></div>`;
    openModal(html);
    const ov = $(".ov");
    const val = k => $("#pf-" + k, ov).value;
    let tzTouched = { b: !!(p && p.birthTz), c: !!(p && p.curTz) };
    $("#pf-btz", ov).addEventListener("input", () => tzTouched.b = true);
    $("#pf-ctz", ov).addEventListener("input", () => tzTouched.c = true);
    const collect = () => {
      const bLat = parseCoord(val("blat"), true), bLon = parseCoord(val("blon"), false);
      const cLat = val("clat").trim() ? parseCoord(val("clat"), true) : null, cLon = val("clon").trim() ? parseCoord(val("clon"), false) : null;
      if (!tzTouched.b && !isNaN(bLat) && !isNaN(bLon)) $("#pf-btz", ov).value = tzFor(bLat, bLon);
      if (!tzTouched.c && cLat != null && cLon != null && !isNaN(cLat) && !isNaN(cLon)) $("#pf-ctz", ov).value = tzFor(cLat, cLon);
      return {
        id: p ? p.id : null, first: val("first").trim(), last: val("last").trim(),
        birth: { y: +val("y"), mo: +val("mo"), d: +val("d"), h: +val("h"), mi: +val("mi"), s: +val("s") || 0 },
        birthLat: bLat, birthLon: bLon, birthPlace: val("bplace").trim(), birthTz: val("btz").trim(), birthOffset: parseOffset(val("boff")),
        curLat: cLat, curLon: cLon, curPlace: val("cplace").trim(), curTz: val("ctz").trim(), created: p ? p.created : Date.now()
      };
    };
    const check = q => {
      const t = q.birth, e = [];
      if (!q.first) e.push("a first name");
      if (!(Number.isInteger(t.y) && t.y >= -5000 && t.y <= 9999)) e.push("a year");
      if (!(t.mo >= 1 && t.mo <= 12 && Number.isInteger(t.mo))) e.push("a month 1–12");
      const dim = new Date(Date.UTC(2000, t.mo, 0)).getUTCDate(); const leap = t.mo === 2 && ((t.y % 4 === 0 && t.y % 100 !== 0) || t.y % 400 === 0);
      if (!(t.d >= 1 && t.d <= (t.mo === 2 ? (leap ? 29 : 28) : dim) && Number.isInteger(t.d))) e.push("a valid day");
      if (!(t.h >= 0 && t.h <= 23 && Number.isInteger(t.h))) e.push("an hour 0–23");
      if (!(t.mi >= 0 && t.mi <= 59 && Number.isInteger(t.mi))) e.push("a minute 0–59");
      if (!(t.s >= 0 && t.s < 60)) e.push("a second 0–59");
      if (isNaN(q.birthLat)) e.push("a birth latitude"); if (isNaN(q.birthLon)) e.push("a birth longitude");
      if (q.birthOffset != null && isNaN(q.birthOffset)) e.push("an offset like −05:00");
      if (!q.birthTz && q.birthOffset == null) e.push("a time zone");
      else if (q.birthTz && !ZONES.includes(q.birthTz) && q.birthTz !== "UTC") e.push("a known time zone");
      if (q.curLat != null && isNaN(q.curLat)) e.push("a current latitude"); if (q.curLon != null && isNaN(q.curLon)) e.push("a current longitude");
      return e;
    };
    const preview = () => {
      const q = collect(), e = check(q), box = $("#pf-prev", ov);
      if (e.length) { box.innerHTML = `<span class="muted">Still needed: ${esc(e.join(", "))}.</span>`; return; }
      try {
        const b = A.localToUT(E, q.birth, q.birthTz || "UTC", q.birthOffset);
        const u = b.utc, c = A.chart(E, { jd: b.jd, lat: q.birthLat, lon: q.birthLon, bodies: ["sun", "moon"] });
        box.innerHTML = `Local <b>${q.birth.y}-${pad(q.birth.mo)}-${pad(q.birth.d)} ${pad(q.birth.h)}:${pad(q.birth.mi)}:${pad(Math.floor(q.birth.s))}</b> (UTC${A.fmtOffset(b.offset)}) → Universal Time <b>${u.y}-${pad(u.mo)}-${pad(u.d)} ${pad(u.h)}:${pad(u.mi)}:${pad(Math.floor(u.s))}</b> · JD ${b.jd.toFixed(6)} · ΔT ${(E.deltaT(b.jd) * 86400).toFixed(1)} s<br>
          Birthplace ${coordStr(q.birthLat, true)} ${coordStr(q.birthLon, false)} · Sun ${posHTML(c.bodies[0].lon)} · Moon ${posHTML(c.bodies[1].lon)} · Asc ${posHTML(c.points[0].lon)}`;
      } catch (err) { box.innerHTML = `<span class="err">${esc(err.message)}</span>`; }
    };
    ov.addEventListener("input", e => { if (e.target.id !== "pf-bcity" && e.target.id !== "pf-ccity") preview(); }); preview();
    if (window.Cities) {
      Cities.attach($("#pf-bcity", ov), c => { $("#pf-blat", ov).value = coordStr(c.lat, true); $("#pf-blon", ov).value = coordStr(c.lon, false); $("#pf-bplace", ov).value = c.label; $("#pf-btz", ov).value = c.tz; tzTouched.b = true; preview(); });
      Cities.attach($("#pf-ccity", ov), c => { $("#pf-clat", ov).value = coordStr(c.lat, true); $("#pf-clon", ov).value = coordStr(c.lon, false); $("#pf-cplace", ov).value = c.label; $("#pf-ctz", ov).value = c.tz; tzTouched.c = true; preview(); });
    }
    ov.addEventListener("click", ev => {
      const a = ev.target.closest("[data-act]"); if (!a) return;
      if (a.dataset.act === "copy-birth") { ["lat", "lon", "place"].forEach(k => $("#pf-c" + k, ov).value = $("#pf-b" + k, ov).value); $("#pf-ctz", ov).value = $("#pf-btz", ov).value; tzTouched.c = true; preview(); }
      if (a.dataset.act === "save-profile") {
        const q = collect(), e = check(q);
        if (e.length) { $("#pf-err", ov).textContent = "Needs " + e.join(", ") + "."; return; }
        const saved = ST.upsertProfile(q);
        closeModal();
        if (!p) { const sl = slot(); if (!sl.profile) { sl.profile = saved.id; sl.at = null; saveSlots(); } toast(`${q.first}'s profile is saved.`); }
        render();
      }
    });
    setTimeout(() => $("#pf-first", ov).focus(), 30);
  }

  /* ================= modal + toast ================= */
  function openModal(html) { closeModal(); document.body.insertAdjacentHTML("beforeend", html); document.body.classList.add("modal-open"); const ov = $(".ov"); ov.addEventListener("click", e => { if (e.target === ov || e.target.closest("[data-close]")) closeModal(); }); }
  function closeModal() { $$(".ov").forEach(o => o.remove()); document.body.classList.remove("modal-open"); }
  let toastT = 0;
  function toast(msg) { $$(".toast").forEach(t => t.remove()); document.body.insertAdjacentHTML("beforeend", `<div class="toast">${esc(msg)}</div>`); clearTimeout(toastT); toastT = setTimeout(() => $$(".toast").forEach(t => t.remove()), 2600); }

  /* ================= chart HUD ================= */
  function chartView() {
    const u = S.ui;
    return `<div class="hud ${u.leftOff ? "left-off" : ""} ${u.rightOff ? "right-off" : ""}">
      <aside class="hud-left win" id="left" ${u.leftOff ? "hidden" : ""}><div class="hud-title">Chart setup</div><div class="scroll" id="left-b"></div></aside>
      <section class="stage" id="stage">
        <button class="fold l" data-act="fold-left" title="${u.leftOff ? "Show" : "Hide"} chart setup">${u.leftOff ? "▶" : "◀"}</button>
        <button class="fold r" data-act="fold-right" title="${u.rightOff ? "Show" : "Hide"} chart data">${u.rightOff ? "◀" : "▶"}</button>
        <div class="caption" id="caption"></div><div class="hint" id="hint"></div><div id="wheel-host"></div>
      </section>
      <aside class="hud-right win" id="right" ${u.rightOff ? "hidden" : ""}><div id="right-h"></div><div class="scroll" id="right-b"></div></aside>
      <div class="dock">
        <div class="slots" id="slots"></div>
        <div class="win timec" id="timec"></div>
        <div class="actions" id="actions"></div>
      </div></div>`;
  }
  function drawChart(light) {
    if (!E) return;
    recompute();
    drawWheel();
    drawTime();
    if (!light || !S.playing || performance.now() - (S.lastRight || 0) > 250) { drawRight(); S.lastRight = performance.now(); }
    if (!light || performance.now() - (S.lastSlots || 0) > 1000) { drawSlots(); S.lastSlots = performance.now(); }
    if (!light) { drawLeft(); drawActions(); }
  }
  function drawWheel() {
    const c = S.comp, sl = c.slot, host = $("#wheel-host"); if (!host) return;
    host.innerHTML = W.svg({ inner: shown(c.inner, sl), outer: shown(c.outer, sl), aspects: sl.showAspects === false ? [] : c.aspects, selected: S.sel,
      opts: { rotate: sl.rotate, aspGlyphs: sl.aspGlyphs, points: sl.points, showAspects: sl.showAspects, layers: sl.layers, hideSigns: sl.hideSigns, stars: c.stars }, label: c.title });
    const type = D.CHART_TYPES.find(t => t.key === sl.type) || { name: "Sky" };
    const lm = c.momentJd != null ? A.jdToLocal(E, c.momentJd, c.tz, c.offset) : null;
    $("#caption").innerHTML = `<span class="who">${esc(c.title)}</span><b>${esc(c.type === "sky" ? "Sky now" : type.name)}</b>${c.outer ? ` · inner ${esc(c.innerLabel)} · outer ${esc(c.outerLabel)}` : ""}<br>
      ${esc(c.inner.houses.name)} · ${c.inner.sidereal ? "Sidereal · " + esc(c.inner.ayanamsaName) : "Tropical"} · ${c.inner.isDay ? "Day chart" : "Night chart"}${c.needPartner ? ' · <span class="c1">choose a partner profile on the left</span>' : ""}`;
    const selB = S.sel ? findPt(S.sel) : null;
    $("#hint").innerHTML = selB ? `Isolating <b>${esc(selB.name)}</b> · ${c.aspects.filter(a => a.a === S.sel || a.b === S.sel).length} aspects<br><span class="muted">Click it again or press Z to clear</span>` : `Click a planet to isolate its aspects`;
  }
  function findPt(id) { const c = S.comp, [ring, key] = id.split(":"); const ch = ring === "o" ? c.outer : c.inner; if (!ch) return null; return ch.bodies.concat(ch.points).find(b => b.key === key) || null; }

  /* ---------- left: chart setup ---------- */
  const sec = (id, title, body, extra) => { const closed = S.ui.closed[id]; return `<div class="sec ${closed ? "closed" : ""}" data-sec="${id}"><button class="sec-h" data-fold="${id}">${title}${extra || ""}<span class="chev">▼</span></button><div class="sec-b">${body}</div></div>`; };
  function drawLeft() {
    const sl = slot(), host = $("#left-b"); if (!host) return;
    const profs = ST.profiles();
    const popt = (sel, none) => `<option value="">${none}</option>` + profs.map(p => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.first + " " + (p.last || ""))}</option>`).join("");
    const types = D.CHART_TYPES.map((t, i) => `<button class="row ${sl.type === t.key ? "on" : ""} ${t.ready ? "" : "dim"}" ${t.ready ? `data-type="${t.key}"` : "disabled"} title="${esc(t.desc)}"><span class="chip ${t.ready ? "" : "off"}">${t.ready ? (sl.type === t.key ? "●" : "○") : "—"}</span>${esc(t.name)}${t.ready ? "" : '<span class="soon">Soon</span>'}</button>`).join("");
    const hs = {}; D.HOUSE_SYSTEMS.forEach(h => (hs[h.group] = hs[h.group] || []).push(h));
    const hsel = `<select class="sel" data-k="hsys">${Object.entries(hs).map(([g, l]) => `<optgroup label="${esc(g)}">${l.map(h => `<option value="${h.code}" ${sl.hsys === h.code ? "selected" : ""}>${esc(h.name)}</option>`).join("")}</optgroup>`).join("")}</select>`;
    const ay = [];
    for (let i = 0; i < D.AYANAMSA_TOP.length; i++) ay.push(D.AYANAMSA_TOP[i]);
    for (let i = 0; i < 47; i++) if (!ay.includes(i)) ay.push(i);
    const aysel = `<select class="sel" data-k="ayanamsa">${ay.map(i => `<option value="${i}" ${+sl.ayanamsa === i ? "selected" : ""}>${esc(E.ayanamsaName(i))}</option>`).join("")}</select>`;
    const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-k="${k}" data-v="${v}" class="${String(sl[k]) === String(v) ? "on" : ""}">${l}</button>`).join("")}</div>`;
    const L = sl.layers || {}, hsg = sl.hideSigns || [];
    const eye = on => `<svg class="eye" viewBox="0 0 24 24">${on ? '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>' : '<path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.3 3.9M6.2 7.6A17 17 0 0 0 2 12s3.6 6 10 6a9.6 9.6 0 0 0 4.2-1"/>'}</svg>`;
    const signsT = D.SIGNS.map(z => `<button class="tg ${hsg.includes(z.i) ? "" : "on"}" data-sign="${z.i}" title="${esc(z.name)}: show or hide its glyph and tint">${eye(!hsg.includes(z.i))}<span class="g el-${z.element}">${z.glyph}</span><small>${esc(z.name)}</small></button>`).join("");
    const LAYERS = [["signGlyphs", "Sign glyphs"], ["signTint", "Element tint"], ["ticks", "Degree ticks"], ["cusps", "House cusps"], ["houseNums", "House numbers"], ["axes", "AC/MC labels"], ["degrees", "Degree labels"], ["leaders", "Leader lines"], ["stars", "Fixed stars"], ["hud", "Outer HUD ring"]];
    const layersT = LAYERS.map(([k, l]) => `<button class="tg wide ${L[k] === false ? "" : "on"}" data-layer="${k}">${eye(L[k] !== false)}<small>${l}</small></button>`).join("")
      + `<button class="tg wide ${sl.showAspects === false ? "" : "on"}" data-layer="aspects">${eye(sl.showAspects !== false)}<small>Aspect lines</small></button><button class="tg wide ${sl.aspGlyphs ? "on" : ""}" data-layer="aspGlyphs">${eye(!!sl.aspGlyphs)}<small>Aspect symbols</small></button>`;
    const typeOpts = sl.type === "harmonic" ? `<div class="field"><label>Harmonic number n (1–360)</label><input class="inp" type="number" min="1" max="360" step="1" data-k="harmonic" value="${+sl.harmonic || 5}"></div><div class="btns">${[4, 5, 7, 9, 12].map(n => `<button class="btn ${+sl.harmonic === n ? "pri" : ""}" data-harm="${n}">H${n}</button>`).join("")}</div>`
      : sl.type === "solarreturn" || sl.type === "lunarreturn" ? `<div class="field"><label>Cast the return for</label><div class="seg"><button data-k="retLoc" data-v="current" class="${sl.retLoc !== "birth" ? "on" : ""}">Current location</button><button data-k="retLoc" data-v="birth" class="${sl.retLoc === "birth" ? "on" : ""}">Birthplace</button></div></div><label class="check"><input type="checkbox" data-flag="natalRing" ${sl.natalRing !== false ? "checked" : ""}>Natal chart on the outer ring</label>` : "";
    const bodies = D.BODIES.map(b => `<button class="tg ${sl.bodies.includes(b.key) ? "on" : ""}" data-body="${b.key}" title="${esc(b.name)}">${eye(sl.bodies.includes(b.key))}<span class="g" style="color:${sl.bodies.includes(b.key) ? W.BODY_COL[b.key] : "inherit"}">${b.glyph}</span><small>${esc(b.name.replace("Black Moon ", ""))}</small></button>`).join("")
      + D.POINTS.map(p => `<button class="tg ${sl.points.includes(p.key) ? "on" : ""}" data-point="${p.key}" title="${esc(p.name)}">${eye(sl.points.includes(p.key))}<span class="${/^[A-Z]/.test(p.glyph) ? "lbl" : "g"}" style="${/^[A-Z]/.test(p.glyph) ? "font:600 15px var(--ui)" : ""};color:${sl.points.includes(p.key) ? W.BODY_COL[p.key] : "inherit"}">${p.glyph}</span><small>${esc(p.name.replace("Lot of ", ""))}</small></button>`).join("");
    const asps = D.ASPECTS.map(a => `<label class="asp-row"><input type="checkbox" data-asp="${a.key}" ${sl.aspects.includes(a.key) ? "checked" : ""}><span class="g" style="color:${W.FAM[a.family]}">${a.glyph}</span><span>${esc(a.name)} <span class="faint mono" style="font-size:11px">${+a.angle.toFixed(2)}°</span></span><input class="orb" type="number" step="0.5" min="0" max="15" data-orb="${a.key}" value="${sl.orbs[a.key] != null ? sl.orbs[a.key] : a.orb}" title="Orb in degrees"></label>`).join("");
    const nA = sl.aspects.length;
    host.innerHTML =
      sec("profile", "Profile", `<div class="field"><select class="sel" data-k="profile">${popt(sl.profile, "— The sky now (home) —")}</select></div>
        ${sl.type === "composite" || sl.type === "synastry" ? `<div class="field"><label>Partner</label><select class="sel" data-k="partner">${popt(sl.partner, "— choose —")}</select></div>` : ""}
        <div class="btns"><button class="btn" data-act="new-profile">＋ New</button>${sl.profile ? `<button class="btn" data-edit="${sl.profile}">Edit</button>` : ""}</div>`)
      + sec("type", "Chart type", types + typeOpts, `<span class="cnt">${D.CHART_TYPES.filter(t => t.ready).length}/${D.CHART_TYPES.length}</span>`)
      + sec("zodiac", "Zodiac", `${seg("zodiac", [["tropical", "Tropical"], ["sidereal", "Sidereal"]])}${sl.zodiac === "sidereal" ? `<div class="field" style="margin-top:8px"><label>Ayanamsa</label>${aysel}</div>` : ""}`)
      + sec("houses", "House system", `<div class="field">${hsel}</div><div class="field"><label>Wheel orientation</label>${seg("rotate", [["asc", "Asc left"], ["aries", "0° Aries left"]])}</div>`)
      + sec("points", "Calculation", `<div class="field"><label>Lunar nodes</label>${seg("node", [["true", "True"], ["mean", "Mean"]])}</div>
        <div class="field"><label>Black Moon Lilith</label>${seg("lilith", [["mean", "Mean"], ["oscu", "Osculating"]])}</div>
        <div class="field"><label>Observer</label>${seg("center", [["geo", "Geocentric"], ["topo", "Topocentric"]])}</div>`)
      + sec("bodies", "Show / Hide · bodies", `<div class="toggles">${bodies}</div><div class="btns" style="margin-top:6px"><button class="btn" data-act="show-all">Show everything <kbd>U</kbd></button><button class="btn" data-act="hide-minor">Planets only</button></div><div class="note">Hidden bodies leave the wheel and the aspects but stay in the tables, dimmed. Right-click a planet on the wheel to hide it.</div>`, `<span class="cnt">${sl.bodies.length + sl.points.length}</span>`)
      + sec("signs", "Show / Hide · signs", `<div class="toggles">${signsT}</div>`, `<span class="cnt">${12 - hsg.length}</span>`)
      + sec("layers", "Show / Hide · wheel layers", `<div class="toggles layers">${layersT}</div>`)
      + sec("aspects", "Aspects & orbs", `<div class="btns" style="margin-bottom:6px"><button class="btn" data-preset="major">Major</button><button class="btn" data-preset="minor">+ Minor</button><button class="btn" data-preset="all">All</button><button class="btn" data-preset="none">None</button></div>
        ${asps}
        <div class="field" style="margin-top:8px"><label>Orb scale <span class="mono" id="orbsc">${(+sl.orbScale).toFixed(2)}×</span></label><input type="range" min="0.25" max="2" step="0.05" value="${sl.orbScale}" data-k="orbScale"></div>
        <label class="check"><input type="checkbox" data-flag="showAspects" ${sl.showAspects !== false ? "checked" : ""}>Show aspect lines</label>
        <label class="check"><input type="checkbox" data-flag="aspGlyphs" ${sl.aspGlyphs ? "checked" : ""}>Aspect symbols on the lines</label>
        <label class="check"><input type="checkbox" data-flag="innerAspects" ${sl.innerAspects ? "checked" : ""}>Bi-wheel: natal aspects too</label>`, `<span class="cnt">${nA}</span>`);
  }

  /* ---------- right: stats ---------- */
  function drawRight() {
    const c = S.comp, sl = c.slot, hh = $("#right-h"), host = $("#right-b"); if (!host) return;
    const type = D.CHART_TYPES.find(t => t.key === sl.type);
    const lm = c.momentJd != null ? A.jdToLocal(E, c.momentJd, c.tz, c.offset) : null;
    const ch = c.inner;
    hh.innerHTML = `<div class="hud-title">${esc(c.type === "sky" ? "Sky now" : type.name)} · Chart ${S.active + 1}</div><div class="stat-head"><div class="nm">${esc(c.title)}</div><span class="tag">${ch.sidereal ? "Sidereal" : "Tropical"}</span>
      <div class="meta">${lm ? `${lm.y}-${pad(lm.mo)}-${pad(lm.d)} ${pad(lm.h)}:${pad(lm.mi)}:${pad(lm.s)} UTC${A.fmtOffset(lm.offset)} · ` : ""}${esc(c.tz || "")}<br>${coordStr(ch.lat, true)} ${coordStr(ch.lon, false)}${c.place ? " · " + esc(c.place) : ""}${c.outerAt ? `<br>Transits at ${coordStr(c.outerAt.lat, true)} ${coordStr(c.outerAt.lon, false)}${c.outerAt.place ? " · " + esc(c.outerAt.place) : ""}` : ""}<br>JD ${(c.momentJd || ch.jd).toFixed(6)} UT${c.progJd ? ` · progressed JD ${c.progJd.toFixed(5)}` : ""}</div></div>`;
    const selKey = S.sel;
    const bodyRows = (chh, ring) => chh.bodies.map(b => {
      const id = ring + ":" + b.key, dg = b.dignity.list.map(x => `<span class="dg ${x.w > 0 ? "plus" : "minus"}" title="${esc(x.label)}">${x.k.slice(0, 4)}</span>`).join("") + (b.dignity.peregrine ? '<span class="dg" title="Peregrine: no essential dignity">per</span>' : "");
      const sp = A.dms(b.speed);
      const vis = sl.bodies.includes(b.key);
      return `<tr class="pick ${selKey === id ? "sel" : ""} ${vis ? "" : "hid"}" ${vis ? `data-pick="${id}"` : ""}><td class="g"><button class="eyeb" data-eye="${b.key}" title="${vis ? "Hide" : "Show"} ${esc(b.name)}">${vis ? "◉" : "○"}</button>${glyphOf(b.key)}</td><td>${esc(b.name)}</td><td class="pos">${posHTML(b.lon)}${b.retro ? '<span class="rx">℞</span>' : ""}${b.stationary ? '<span class="dg">st</span>' : ""}</td><td class="num">${b.house}</td><td class="num" title="Daily motion">${sp.neg ? "−" : ""}${sp.d}°${pad(sp.m)}′</td><td>${dg}</td></tr>`;
    }).join("");
    const head = `<tr><th></th><th>Body</th><th>Longitude</th><th style="text-align:right">Hse</th><th style="text-align:right">Speed/d</th><th>Dignity</th></tr>`;
    let html = typeInfo(c) + sec("r-planets", `${esc(c.innerLabel)} positions`, `<table class="st">${head}${bodyRows(ch, "i")}</table>`, `<span class="cnt">${ch.bodies.length}</span>`);
    if (c.outer) html += sec("r-outer", `${esc(c.outerLabel)} positions`, `<table class="st">${head}${bodyRows(c.outer, "o")}</table>`, `<span class="cnt">${c.outer.bodies.length}</span>`);
    // angles & lots
    const P = k => ch.points.find(p => p.key === k);
    const ang = ["asc", "mc", "dsc", "ic", "vertex", "fortune", "spirit"].map(k => { const p = P(k); return p ? `<tr class="pick ${selKey === "i:" + k ? "sel" : ""}" ${sl.points.includes(k) ? `data-pick="i:${k}"` : ""}><td class="g">${glyphOf(k)}</td><td>${esc(p.name)}</td><td class="pos">${posHTML(p.lon)}</td><td class="num">${p.house}</td></tr>` : ""; }).join("");
    const ra = A.dms(ch.houses.armc), st = A.dms(ch.sidTime * 15);
    html += sec("r-angles", "Angles & lots", `<table class="st">${ang}</table><dl class="kv">
      <dt>ARMC</dt><dd>${ra.str}</dd><dt>Sidereal time</dt><dd>${pad(Math.floor(ch.sidTime))}h${pad(Math.floor(ch.sidTime * 60 % 60))}m${pad(Math.floor(ch.sidTime * 3600 % 60))}s</dd>
      <dt>Obliquity ε</dt><dd>${A.dms(ch.eps).str}</dd>${ch.sidereal ? `<dt>Ayanamsa</dt><dd>${A.dms(ch.ayanamsa).str}</dd>` : ""}<dt>ΔT</dt><dd>${(ch.deltaT || 0).toFixed(2)} s</dd><dt>Sect</dt><dd>${ch.isDay ? "Diurnal (Sun above horizon)" : "Nocturnal (Sun below horizon)"}</dd></dl>`);
    // houses
    const H = ch.houses, hn = H.n;
    const hrows = [];
    for (let i = 1; i <= hn; i++) {
      const z = A.zpos(H.cusps[i]), s = SIGN(z.sign);
      const lord = s.ruler, lp = ch.bodies.find(b => b.key === lord);
      hrows.push(`<tr title="${hn === 12 ? esc(D.HOUSE_NAMES[i - 1] + " · " + D.HOUSE_MEANINGS[i - 1]) : ""}"><td class="num" style="text-align:left">${i}</td><td class="pos">${posHTML(H.cusps[i])}</td><td>${glyphOf(lord)}${s.modern !== s.ruler ? " " + glyphOf(s.modern) : ""}</td><td class="num">${lp ? "in " + lp.house : ""}</td></tr>`);
    }
    html += sec("r-houses", `Houses · ${esc(H.name)}`, `<table class="st"><tr><th>#</th><th>Cusp</th><th>Ruler</th><th style="text-align:right">Lord</th></tr>${hrows.join("")}</table>${H.warn ? `<div class="note c1">${esc(H.warn)}</div>` : ""}`);
    // aspects
    const asl = c.aspects;
    const arow = a => { const pa = findPt(a.a), pb = findPt(a.b); const od = A.dms(a.orb); const hit = selKey && (a.a === selKey || a.b === selKey);
      return `<tr class="${hit ? "sel" : ""}"><td class="g">${a.a[0] === "o" ? '<span class="faint mono" style="font-size:9px">T</span>' : ""}${glyphOf(pa.key)}</td><td class="g" style="color:${W.FAM[a.family]}">${a.glyph}</td><td class="g">${glyphOf(pb.key)}</td><td>${esc(a.name)}</td><td class="num">${od.d}°${pad(od.m)}′${pad(od.s)}″</td><td class="num ${a.applying ? "c5" : "muted"}">${a.noPhase ? "—" : a.exact ? "exact" : a.applying ? "app" : "sep"}</td></tr>`; };
    const shown = selKey ? asl.filter(a => a.a === selKey || a.b === selKey) : asl;
    html += sec("r-aspects", selKey ? `Aspects of ${esc((findPt(selKey) || {}).name || "")}` : "Aspects", shown.length ? `<table class="st"><tr><th></th><th></th><th></th><th>Aspect</th><th style="text-align:right">Orb</th><th style="text-align:right">Phase</th></tr>${shown.map(arow).join("")}</table>` : `<div class="note">No aspects within orb.</div>`, `<span class="cnt">${shown.length}</span>`);
    if (!c.outer) html += sec("r-grid", "Aspectarian", aspectGrid(ch, asl));
    // dignities
    const trad = ch.bodies.filter(b => ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"].includes(b.key));
    const ds = trad.map(b => `<tr><td class="g">${glyphOf(b.key)}</td><td>${signG(b.sign)} ${esc(SIGN(b.sign).name)}</td><td>${b.dignity.list.map(x => `<span class="dg ${x.w > 0 ? "plus" : "minus"}">${esc(x.label)}</span>`).join(" ") || (b.dignity.peregrine ? '<span class="dg">Peregrine</span>' : "")}</td><td class="num">${b.dignity.score > 0 ? "+" : ""}${b.dignity.score}</td></tr>`).join("");
    const ascSign = SIGN(P("asc").sign), cr = ch.bodies.find(b => b.key === ascSign.ruler);
    html += sec("r-dign", "Essential dignities", `<table class="st"><tr><th></th><th>Sign</th><th>Dignities (Ptolemy)</th><th style="text-align:right">Score</th></tr>${ds}</table>
      <dl class="kv"><dt>Chart ruler</dt><dd>${glyphOf(ascSign.ruler)} ${esc(bodyMeta(ascSign.ruler).name)}${cr ? " · " + posHTML(cr.lon) + " · house " + cr.house : ""}</dd><dt>Final dispositor</dt><dd>${esc(finalDispositor(ch))}</dd></dl>
      <div class="note">Scores: domicile +5, exaltation +4, triplicity +3, bound +2, face +1, detriment −5, fall −4 (Lilly's weights).</div>`);
    // decans & bounds
    const dec = ch.bodies.map(b => `<tr><td class="g">${glyphOf(b.key)}</td><td class="pos">${posHTML(b.lon)}</td><td class="num">${b.decan.n}</td><td>${signG(b.decan.sign)} ${glyphOf(b.decan.ruler)}</td><td>${glyphOf(b.decan.face)}</td><td>${glyphOf(b.term)}</td></tr>`).join("");
    html += sec("r-decans", "Decans, faces & bounds", `<table class="st"><tr><th></th><th>Longitude</th><th style="text-align:right">Dec</th><th>Triplicity decan</th><th>Face</th><th>Bound</th></tr>${dec}</table>`);
    // balance
    const bl = A.balance(ch), tot = bl.n + 2;
    const bar = (lab, v, col, of) => `<div class="bal">${lab}<div class="bar"><i style="width:${(v / of * 100).toFixed(0)}%;background:${col}"></i></div><b>${v}</b></div>`;
    html += sec("r-bal", "Balance", bar("Fire", bl.el.fire, "var(--el-fire)", tot) + bar("Earth", bl.el.earth, "var(--el-earth)", tot) + bar("Air", bl.el.air, "var(--el-air)", tot) + bar("Water", bl.el.water, "var(--el-water)", tot)
      + bar("Cardinal", bl.mo.cardinal, "var(--frame)", tot) + bar("Fixed", bl.mo.fixed, "var(--frame)", tot) + bar("Mutable", bl.mo.mutable, "var(--frame)", tot)
      + bar("Above", bl.above, "var(--violet)", bl.n) + bar("Below", bl.below, "var(--violet)", bl.n) + bar("East", bl.east, "var(--violet)", bl.n) + bar("West", bl.west, "var(--violet)", bl.n)
      + `<div class="note">Ten planets plus Ascendant and Midheaven for elements and modalities; planets only for hemispheres.</div>`);
    html += techSections(c);
    host.innerHTML = html;
  }
  /* ---------- technique sections (right bar) ---------- */
  const fmtLocal = (jd, tz) => { const l = A.jdToLocal(E, jd, tz || "UTC"); return `${l.y}-${pad(l.mo)}-${pad(l.d)} ${pad(l.h)}:${pad(l.mi)}:${pad(l.s)} (UTC${A.fmtOffset(l.offset)})`; };
  const nameOf = k => esc(bodyMeta(k).name);
  function typeInfo(c) {
    const sl = c.slot, ch = c.inner;
    if (c.arc != null) return sec("r-type", "Solar arc", `<dl class="kv"><dt>Arc</dt><dd>${A.dms(c.arc).str}</dd><dt>Directed to</dt><dd>${fmtLocal(c.momentJd, c.tz)}</dd><dt>Rate</dt><dd>progressed Sun − natal Sun</dd></dl><div class="note">Every natal point, the angles and the house cusps move forward by the same arc. Directed-to-natal aspects use the orbs on the left; most practitioners use 1° or less.</div>`);
    if (c.eventJd != null) {
      const tz = (c.retAt && tzLookup(c.retAt.lat, c.retAt.lon)) || c.tz;
      return sec("r-type", sl.type === "solarreturn" ? "Solar return" : "Lunar return", `<dl class="kv"><dt>Return moment</dt><dd>${fmtLocal(c.eventJd, tz)}</dd><dt>Time zone</dt><dd>${esc(tz || "")}</dd><dt>JD (UT)</dt><dd>${c.eventJd.toFixed(6)}</dd><dt>Next return</dt><dd>${fmtLocal(c.nextJd, tz)}</dd><dt>Cast for</dt><dd>${coordStr(c.retAt.lat, true)} ${coordStr(c.retAt.lon, false)}${c.retAt.place ? " · " + esc(c.retAt.place) : ""}</dd></dl><div class="note">The ${sl.type === "solarreturn" ? "Sun" : "Moon"} is back on its natal longitude to the arcsecond (found by Newton iteration on the ephemeris, residual &lt; 0.00001″). The time console picks the date; the chart is the last return on or before it.</div>`);
    }
    if (ch.harmonic) {
      const n = ch.harmonic, nat = c.natalRef, vis = nat.bodies.filter(b => sl.bodies.includes(b.key));
      const pairs = [];
      for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) { const sep = A.sep(vis[i].lon, vis[j].lon), dev = Math.abs(((n * sep) % 360 + 540) % 360 - 180); if (dev <= 12) pairs.push({ a: vis[i].key, b: vis[j].key, sep, dev }); }
      pairs.sort((x, y) => x.dev - y.dev);
      return sec("r-type", `Harmonic ${n}`, `<dl class="kv"><dt>Division</dt><dd>360° / ${n} = ${A.dms(360 / n).str}</dd><dt>Conjunctions here</dt><dd>${pairs.length}</dd></dl>
        <table class="st"><tr><th>Pair</th><th style="text-align:right">Natal separation</th><th style="text-align:right">H${n} orb</th></tr>${pairs.slice(0, 14).map(x => `<tr><td>${glyphOf(x.a)} ${glyphOf(x.b)}</td><td class="num">${A.dms(x.sep).str}</td><td class="num">${A.dms(x.dev).str}</td></tr>`).join("")}</table>
        <div class="note">A conjunction in the H${n} chart is a natal separation that is a whole multiple of ${A.dms(360 / n).str}. The H${n} orb is ${n}× the natal orb. Aspects drawn here: conjunction, opposition, trine, square, sextile.</div>`);
    }
    return "";
  }
  function natalFor(c) { return c.natalRef || (["natal", "transit", "progressed", "solararc"].includes(c.slot.type) && c.p ? (c.slot.type === "natal" ? c.inner : c.inner) : null); }
  function techSections(c) {
    const sl = c.slot, ch = c.inner; let html = "";
    const vis = ch.bodies.filter(b => sl.bodies.includes(b.key)).concat(ch.points.filter(p => ["asc", "mc"].includes(p.key) && sl.points.includes(p.key)));
    // profections
    const nat = natalFor(c);
    if (nat && c.birthJd) {
      const tgt = c.slot.type === "natal" || c.slot.type === "harmonic" ? A.nowJd() : c.momentJd;
      const pr = T.profection(nat, c.birthJd, tgt), z = D.SIGNS[pr.sign], mz = D.SIGNS[pr.msign], lord = nat.bodies.find(b => b.key === pr.lord);
      html += sec("r-prof", "Annual profection", `<dl class="kv"><dt>Age</dt><dd>${pr.age} (year ${pr.age + 1})</dd><dt>Profected house</dt><dd>${pr.house} · ${esc(D.HOUSE_NAMES[pr.house - 1])}</dd><dt>Sign of the year</dt><dd>${signG(pr.sign)} ${esc(z.name)}</dd>
        <dt>Lord of the year</dt><dd>${glyphOf(pr.lord)} ${nameOf(pr.lord)}${lord ? " · natal " + posHTML(lord.lon) + " · house " + lord.house : ""}</dd><dt>Planets in that sign</dt><dd>${pr.occupants.map(glyphOf).join(" ") || "none"}</dd>
        <dt>Month ${pr.month} of 12</dt><dd>${signG(pr.msign)} ${esc(mz.name)} · ${glyphOf(pr.mlord)} ${nameOf(pr.mlord)}</dd><dt>Next birthday year</dt><dd>${fmtLocal(pr.nextJd, c.tz)}</dd></dl>
        <div class="note">One sign per year counted from the Ascendant's sign (whole-sign houses); months as twelfths of the year. ${c.slot.type === "natal" ? "Shown for today." : "Shown for the date in the time console."}</div>`);
    }
    // fixed stars
    if (c.stars) {
      const hits = c.stars.filter(s => s.hits.length);
      const row = st => `<tr><td>${st.royal ? '<span class="dg plus" title="Royal star">royal</span>' : st.behenian ? '<span class="dg" title="Behenian star">beh</span>' : ""}</td><td>${esc(st.name)}</td><td class="pos">${posHTML(st.lon)}</td><td>${st.hits.map(h => `${glyphOf(h.key)} <span class="mono muted" style="font-size:11px">${A.dms(h.orb).d}°${pad(A.dms(h.orb).m)}′</span>`).join(" ")}</td></tr>`;
      html += sec("r-stars", "Fixed stars", `${hits.length ? `<table class="st"><tr><th></th><th>Star</th><th>Longitude</th><th>Conjunct (≤ ${+(sl.starOrb || 1)}°)</th></tr>${hits.map(row).join("")}</table>` : `<div class="note">No star within ${+(sl.starOrb || 1)}° of a planet or angle.</div>`}
        <details class="more"><summary>All ${c.stars.length} stars</summary><table class="st">${c.stars.map(row).join("")}</table></details>
        <div class="field" style="margin:8px 6px"><label>Star orb</label><select class="sel" data-k="starOrb">${[0.5, 1, 1.5, 2].map(v => `<option value="${v}" ${+(sl.starOrb || 1) === v ? "selected" : ""}>${v}°</option>`).join("")}</select></div>
        <div class="note">Positions from the Swiss Ephemeris star catalogue (sefstars.txt) with precession and proper motion to the chart date. Gold ✦ on the wheel = royal stars.</div>`, `<span class="cnt">${hits.length}</span>`);
    }
    // midpoints
    if (!ch.harmonic) {
      const mp = T.midpoints(vis, 1.5);
      const list = S.sel ? mp.list.filter(x => "i:" + x.key === S.sel) : mp.list;
      const as = { conj: "=", opp: "☍", sq: "□" };
      html += sec("r-mid", S.sel ? `Midpoints · ${nameOf(S.sel.split(":")[1])}` : "Midpoints (90° dial)", list.length ? `<table class="st"><tr><th>Point</th><th>= midpoint of</th><th style="text-align:right">Orb</th></tr>${list.map(x => x.hits.slice(0, 6).map((h, i) => `<tr><td class="g">${i ? "" : glyphOf(x.key)}</td><td>${glyphOf(h.a)}<span class="muted">/</span>${glyphOf(h.b)} <span class="muted mono" style="font-size:11px">${as[h.aspect] === "=" ? "conj" : h.aspect}</span></td><td class="num">${A.dms(h.orb).d}°${pad(A.dms(h.orb).m)}′</td></tr>`).join("")).join("")}</table>` : `<div class="note">No midpoint contacts within 1°30′.</div>`)
        + dialSection(vis, mp);
    }
    // antiscia
    const an = T.antiscia(vis, 1);
    html += sec("r-ant", "Antiscia", `<table class="st"><tr><th></th><th>Antiscion</th><th>Contra</th><th>Contacts</th></tr>${an.map(x => `<tr><td class="g">${glyphOf(x.key)}</td><td class="pos">${posHTML(x.ant)}</td><td class="pos">${posHTML(x.con)}</td><td>${x.contacts.map(k => `${k.kind === "antiscion" ? "" : "<span class='muted'>c</span>"}${glyphOf(k.key)}`).join(" ")}</td></tr>`).join("")}</table><div class="note">Antiscion: the point mirrored across the 0° Cancer–0° Capricorn axis (equal day length). Contra-antiscion: mirrored across 0° Aries–0° Libra. Contacts within 1°.</div>`);
    return html;
  }
  function dialSection(vis, mp) {
    const C = 160, Rr = 120, P = (d, r) => { const t = (90 - d * 4) * Math.PI / 180; return [C + r * Math.cos(t), C - r * Math.sin(t)]; };
    let g = `<svg viewBox="0 0 320 320" class="dial" role="img" aria-label="90 degree dial"><circle cx="${C}" cy="${C}" r="${Rr}" fill="rgba(0,0,0,.3)" stroke="var(--line-2)"/>`;
    for (let d = 0; d < 90; d++) { const a = P(d, Rr), b = P(d, Rr - (d % 5 === 0 ? 9 : 4)); g += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="var(--muted)" stroke-width="${d % 15 === 0 ? 1.4 : .6}"/>`; }
    [[0, "0° card."], [30, "0° fixed"], [60, "0° mut."]].forEach(([d, l]) => { const a = P(d, Rr + 14); g += `<text x="${a[0].toFixed(1)}" y="${a[1].toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="9" fill="var(--muted)" font-family="var(--ui)">${l}</text>`; });
    const sp = W.spread(vis.map(v => ({ lon: (v.lon % 90) * 4 })), 14);
    vis.forEach((v, i) => {
      const d = sp[i] / 4, a = P(d, Rr - 26), t = P(v.lon % 90, Rr - 10), isSel = S.sel === "i:" + v.key;
      g += `<line x1="${t[0].toFixed(1)}" y1="${t[1].toFixed(1)}" x2="${a[0].toFixed(1)}" y2="${a[1].toFixed(1)}" stroke="${W.BODY_COL[v.key]}" stroke-width=".7" opacity=".6"/><text x="${a[0].toFixed(1)}" y="${a[1].toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${/^[A-Z]/.test(v.glyph) ? 10 : 16}" fill="${W.BODY_COL[v.key]}" font-family="var(--glyph)" ${isSel ? 'font-weight="700"' : ""}>${v.glyph}</text>`;
    });
    const selP = S.sel && vis.find(v => "i:" + v.key === S.sel);
    if (selP) { const d = selP.lon % 90, a = P(d, Rr), b = P(d + 45, Rr); g += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="var(--amber)" stroke-width="1.6"/>`; }
    g += `<circle cx="${C}" cy="${C}" r="3" fill="var(--frame)"/></svg>`;
    return sec("r-dial", "90° dial", `<div style="display:grid;place-items:center">${g}</div><div class="note">Longitudes folded into 90° (×4 around the dial), so conjunctions, squares and oppositions all fall together (Ebertin). The amber pointer follows the isolated planet.</div>`);
  }
  function aspectGrid(ch, asl) {
    const sl = S.comp.slot, list = ch.bodies.filter(b => b.key !== "snode" && sl.bodies.includes(b.key));
    const m = new Map(asl.map(a => [a.a + "|" + a.b, a]));
    let h = "<table class='grid-asp'>";
    for (let r = 0; r < list.length; r++) {
      h += "<tr>";
      for (let c = 0; c < r; c++) {
        const a = m.get("i:" + list[c].key + "|i:" + list[r].key) || m.get("i:" + list[r].key + "|i:" + list[c].key);
        h += a ? `<td title="${esc(list[c].name + " " + a.name + " " + list[r].name + " · orb " + A.dms(a.orb).str)}" style="color:${W.FAM[a.family]}">${a.glyph}</td>` : "<td></td>";
      }
      h += `<td class="hd">${glyphOf(list[r].key)}</td>`;
      for (let c = r + 1; c < list.length; c++) h += "<td class='empty'></td>";
      h += "</tr>";
    }
    return h + "</table>";
  }
  function finalDispositor(ch) {
    const lon = Object.fromEntries(ch.bodies.map(b => [b.key, b]));
    const seven = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"];
    const disp = k => SIGN(lon[k].sign).ruler;
    const finals = new Set();
    for (const k of seven) {
      if (!lon[k]) return "—";
      let cur = k; const seen = [];
      while (!seen.includes(cur)) { seen.push(cur); cur = disp(cur); if (!lon[cur]) return "—"; }
      if (disp(cur) === cur) finals.add(cur); else { const loop = seen.slice(seen.indexOf(cur)); finals.add("loop:" + loop.sort().join(",")); }
    }
    if (finals.size === 1) { const f = [...finals][0]; return f.startsWith("loop:") ? "Mutual reception: " + f.slice(5).split(",").map(k => bodyMeta(k).name).join(" ↔ ") : bodyMeta(f).name + " (in its own sign)"; }
    return "None (several chains)";
  }

  /* ---------- slots (bottom left) ---------- */
  function drawSlots() {
    const host = $("#slots"); if (!host) return;
    let h = `<span class="slots-lbl">Charts</span>`;
    S.slots.forEach((sl, i) => {
      const p = ST.profile(sl.profile), t = D.CHART_TYPES.find(x => x.key === sl.type);
      let mini = ""; try { mini = i === S.active ? W.mini(S.comp.inner) : W.mini(compute(sl).inner); } catch (e) {}
      h += `<button class="slot ${i === S.active ? "on" : ""}" data-slot="${i}" title="Chart ${i + 1} (key ${i + 1})"><span class="ty">${p ? esc(t.name) : "Sky now"}</span><span class="n">${i + 1}</span>${mini}<span class="when">${esc(slotWhen(sl, i))}</span><span class="who">${p ? esc(p.first + " " + (p.last || "")) : esc(S.set.home.place || "Home")}</span><span class="strip"><i style="width:${(i + 1) * 25}%;background:${["var(--green)", "var(--cyan)", "var(--amber)", "var(--violet)"][i]}"></i></span>${S.slots.length > 1 ? `<span class="x" data-rm="${i}" title="Remove chart">✕</span>` : ""}</button>`;
    });
    if (S.slots.length < 4) h += `<button class="slot add" data-act="add-slot" title="Add a chart (up to 4)"><span>＋</span>Add chart</button>`;
    host.innerHTML = h;
  }

  function slotWhen(sl, i) {
    if (sl.type === "composite") return "midpoints";
    if (sl.at == null) return sl.type === "natal" && sl.profile ? "birth" : "live";
    const c = i === S.active ? S.comp : null; const tz = c ? c.tz : "UTC";
    const l = A.jdToLocal(E, sl.at, tz || "UTC"); return `${l.y}-${pad(l.mo)}-${pad(l.d)}`;
  }

  /* ---------- time console (bottom centre) ---------- */
  function drawTime() {
    const host = $("#timec"); if (!host) return;
    const c = S.comp, sl = c.slot;
    if (!c.editable || c.momentJd == null) { host.innerHTML = `<div class="tc-top">Time console</div><div class="note">${sl.type === "synastry" ? "Synastry compares two fixed birth moments, so there is no time to move." : "Composite charts have no single moment: each body sits at the midpoint of two births."}</div>`; return; }
    const lm = A.jdToLocal(E, c.momentJd, c.tz, c.offset);
    const label = c.type === "sky" ? "Sky moment" : { natal: "Birth moment", harmonic: "Birth moment", progressed: "Progressed to", solararc: "Directed to", transit: "Transit moment", solarreturn: "Return on or before", lunarreturn: "Return on or before" }[sl.type] || "Sky moment";
    const fld = (k, v, w) => `<div class="tf"><small>${{ y: "Year", mo: "Mon", d: "Day", h: "Hr", mi: "Min", s: "Sec" }[k]}</small><div class="v"><input class="${k === "y" ? "y" : ""}" data-tf="${k}" value="${k === "y" ? v : pad(v)}" inputmode="numeric" aria-label="${k}"><div class="ud"><button data-step="${k}" data-dir="1" tabindex="-1" aria-label="up">▲</button><button data-step="${k}" data-dir="-1" tabindex="-1" aria-label="down">▼</button></div></div></div>`;
    host.innerHTML = `<div class="tc-top">${label} · ${esc(c.tz || "UTC")} UTC${A.fmtOffset(lm.offset)} ${c.live ? '<span class="live">Live</span>' : ""}${c.edited ? '<span class="c1">· edited</span>' : ""}</div>
      <div class="tc-fields">${fld("y", lm.y)}<span class="tc-sep">-</span>${fld("mo", lm.mo)}<span class="tc-sep">-</span>${fld("d", lm.d)}<span class="tc-sep">&nbsp;</span>${fld("h", lm.h)}<span class="tc-sep">:</span>${fld("mi", lm.mi)}<span class="tc-sep">:</span>${fld("s", lm.s)}</div>
      <div class="tc-row">
        <button class="btn" data-jump="-86400" title="Back one day">−1d</button><button class="btn" data-jump="-3600">−1h</button><button class="btn" data-jump="-60">−1m</button><button class="btn" data-jump="-1">−1s</button>
        <button class="btn ${S.playing ? "on" : ""}" data-act="play" title="Play / pause (Space)">${S.playing ? "❚❚ Pause" : "▶ Play"}</button>
        <select class="sel" data-k="speed" title="Playback speed">${[[1, "1 s/s"], [60, "1 min/s"], [3600, "1 hr/s"], [86400, "1 day/s"], [604800, "1 wk/s"], [2629800, "1 mo/s"]].map(([v, l]) => `<option value="${v}" ${S.speed === v ? "selected" : ""}>${l}</option>`).join("")}</select>
        <button class="btn" data-jump="1">+1s</button><button class="btn" data-jump="60">+1m</button><button class="btn" data-jump="3600">+1h</button><button class="btn" data-jump="86400">+1d</button>
        ${(sl.type === "natal" || sl.type === "harmonic") && c.p ? `<button class="btn" data-act="reset-time" ${c.edited ? "" : "disabled"}>Reset</button>` : `<button class="btn ${c.live ? "on" : ""}" data-act="now" title="Follow the clock (T)">Now</button>`}
      </div>`;
  }
  function setMoment(jd) { const sl = slot(); sl.at = jd; saveSlots(); }
  function stepField(k, dir) {
    const c = S.comp; if (!c.editable) return;
    const lm = A.jdToLocal(E, c.momentJd, c.tz, c.offset);
    const secs = { d: 86400, h: 3600, mi: 60, s: 1 }[k];
    if (secs) { setMoment(c.momentJd + dir * secs / 86400); }
    else {
      const t = { y: lm.y, mo: lm.mo, d: lm.d, h: lm.h, mi: lm.mi, s: lm.s };
      if (k === "y") t.y += dir; else { t.mo += dir; while (t.mo > 12) { t.mo -= 12; t.y++; } while (t.mo < 1) { t.mo += 12; t.y--; } }
      const dim = new Date(Date.UTC(2000, t.mo, 0)).getUTCDate(); const leap = (t.y % 4 === 0 && t.y % 100 !== 0) || t.y % 400 === 0;
      t.d = Math.min(t.d, t.mo === 2 ? (leap ? 29 : 28) : dim);
      setMoment(A.localToUT(E, t, c.tz || "UTC", c.offset).jd);
    }
    drawChart(true);
  }
  function typedField(k, v) {
    const c = S.comp, lm = A.jdToLocal(E, c.momentJd, c.tz, c.offset);
    const t = { y: lm.y, mo: lm.mo, d: lm.d, h: lm.h, mi: lm.mi, s: lm.s }; const n = parseInt(v, 10);
    if (isNaN(n)) { drawTime(); return; }
    t[k] = n;
    const lim = { mo: [1, 12], d: [1, 31], h: [0, 23], mi: [0, 59], s: [0, 59], y: [-5000, 9999] }[k];
    if (n < lim[0] || n > lim[1]) { toast("Out of range"); drawTime(); return; }
    setMoment(A.localToUT(E, t, c.tz || "UTC", c.offset).jd); drawChart(true);
  }

  /* ---------- actions (bottom right) ---------- */
  function drawActions() {
    const host = $("#actions"); if (!host) return; const sl = slot();
    const b = (act, ic, key, title, on) => `<button class="act ${on ? "on" : ""}" data-act="${act}" title="${title}">${icon(ic)}<kbd>${key}</kbd></button>`;
    host.innerHTML = `<span class="act-lbl">Chart ${S.active + 1} · actions</span>
      <div class="act-row">${b("iso-clear", "iso", "Z", "Clear isolation (Z)", !!S.sel)}${b("toggle-lines", "lines", "V", "Aspect lines on/off (V)", sl.showAspects !== false)}${b("toggle-glyphs", "glyphs", "G", "Aspect symbols on lines (G)", sl.aspGlyphs)}${b("rotate", "rotate", "R", "Rotate: Ascendant / 0° Aries on the left (R)", sl.rotate === "aries")}${b("show-all", "eye", "U", "Show everything hidden (U)", false)}</div>
      <div class="act-row">${b("now", "now", "T", "Jump to now (T)", false)}${b("play", S.playing ? "pause" : "play", "␣", "Play / pause (Space)", S.playing)}${b("snapshot", "snap", "S", "Save the wheel as PNG (S)", false)}${b("panels", "panel", "B", "Show / hide both side panels (B)", S.ui.leftOff && S.ui.rightOff)}<button class="act" data-go="harmonics" title="Harmonics Lab for this chart (L)">${icon("wave")}<kbd>L</kbd></button></div>`;
  }

  /* ---------- tooltip ---------- */
  let tipEl = null;
  function showTip(id, x, y) {
    const b = findPt(id); if (!b) return;
    if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "tip"; document.body.appendChild(tipEl); }
    const sp = A.dms(b.speed);
    const asp = S.comp.aspects.filter(a => a.a === id || a.b === id).length;
    tipEl.innerHTML = `<b>${esc(b.name)}</b> ${id[0] === "o" ? `<span class="muted">(${esc(S.comp.outerLabel)})</span>` : ""}<br><span class="mono">${posHTML(b.lon)}</span> ${esc(SIGN(b.sign).name)}${b.retro ? ' <span class="rx">℞ retrograde</span>' : ""}<br>
      House ${b.house} · ${b.cls === "angle" ? "" : `${sp.neg ? "−" : ""}${sp.str}/day · lat ${A.dms(b.lat).str}<br>`}Decan ${b.decan.n} (${esc(SIGN(b.decan.sign).name)}) · bound ${esc(bodyMeta(b.term).name)}<br>${b.dignity.list.map(x => esc(x.label)).join(", ") || (b.dignity.peregrine ? "Peregrine" : "")}<br><span class="muted">${asp} aspect${asp === 1 ? "" : "s"} · click to isolate</span>`;
    tipEl.style.display = "block";
    const r = tipEl.getBoundingClientRect();
    tipEl.style.left = Math.min(innerWidth - r.width - 8, x + 16) + "px"; tipEl.style.top = Math.min(innerHeight - r.height - 8, y + 12) + "px";
  }
  const hideTip = () => { if (tipEl) tipEl.style.display = "none"; };

  /* ---------- wiring ---------- */
  function toggleBody(k) {
    const sl = slot(), isP = D.POINTS.some(p => p.key === k), arr = isP ? "points" : "bodies";
    sl[arr] = sl[arr].includes(k) ? sl[arr].filter(x => x !== k) : sl[arr].concat(k);
    if (S.sel && S.sel.endsWith(":" + k)) S.sel = null;
    saveSlots(); drawChart();
  }
  function select(id) { S.sel = S.sel === id ? null : id; drawWheel(); drawRight(); drawActions(); }
  function wireChart() {
    const stage = $("#stage");
    stage.addEventListener("click", e => {
      const g = e.target.closest(".planet");
      if (g) { select(g.dataset.id); return; }
      if (e.target.closest("svg.wheel") && S.sel) { S.sel = null; drawWheel(); drawRight(); drawActions(); }
    });
    stage.addEventListener("keydown", e => { const g = e.target.closest(".planet"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); select(g.dataset.id); } });
    stage.addEventListener("mousemove", e => { const g = e.target.closest(".planet"); if (g) showTip(g.dataset.id, e.clientX, e.clientY); else hideTip(); });
    stage.addEventListener("mouseleave", hideTip);
    $("#right").addEventListener("click", e => {
      const ey = e.target.closest("[data-eye]"); if (ey) { e.stopPropagation(); toggleBody(ey.dataset.eye); return; }
      const r = e.target.closest("[data-pick]"); if (r) select(r.dataset.pick);
    });
    $("#right").addEventListener("change", e => { if (e.target.dataset.k === "starOrb") { slot().starOrb = +e.target.value; saveSlots(); drawChart(); } });
    let lp = 0; stage.addEventListener("touchstart", e => { const g = e.target.closest(".planet"); if (!g) return; lp = setTimeout(() => { lp = -1; const k = g.dataset.id.split(":")[1]; toggleBody(k); toast(`${bodyMeta(k).name} hidden. Tap the eye icon or press Show everything to bring it back.`); }, 650); }, { passive: true });
    stage.addEventListener("touchend", e => { if (lp === -1) { e.preventDefault(); } clearTimeout(lp); lp = 0; });
    stage.addEventListener("touchmove", () => { clearTimeout(lp); lp = 0; }, { passive: true });
    stage.addEventListener("contextmenu", e => { const g = e.target.closest(".planet"); if (!g) return; e.preventDefault(); const k = g.dataset.id.split(":")[1]; hideTip(); toggleBody(k); toast(`${bodyMeta(k).name} hidden. Press U to show everything.`); });
    const left = $("#left");
    left.addEventListener("click", e => {
      const sl = slot(); let t;
      if ((t = e.target.closest("[data-type]"))) { sl.type = t.dataset.type; sl.at = null; S.sel = null; if ((sl.type === "composite" || sl.type === "synastry") && !sl.partner) { const o = ST.profiles().find(p => p.id !== sl.profile); sl.partner = o ? o.id : null; } }
      else if ((t = e.target.closest(".seg [data-k]"))) { sl[t.dataset.k] = t.dataset.v; }
      else if ((t = e.target.closest("[data-body]"))) { const k = t.dataset.body; sl.bodies = sl.bodies.includes(k) ? sl.bodies.filter(x => x !== k) : sl.bodies.concat(k); if (S.sel && S.sel.endsWith(":" + k)) S.sel = null; }
      else if ((t = e.target.closest("[data-point]"))) { const k = t.dataset.point; sl.points = sl.points.includes(k) ? sl.points.filter(x => x !== k) : sl.points.concat(k); if (S.sel && S.sel.endsWith(":" + k)) S.sel = null; }
      else if ((t = e.target.closest("[data-sign]"))) { const i = +t.dataset.sign, h = sl.hideSigns || []; sl.hideSigns = h.includes(i) ? h.filter(x => x !== i) : h.concat(i); }
      else if ((t = e.target.closest("[data-layer]"))) { const k = t.dataset.layer; if (k === "aspects") sl.showAspects = sl.showAspects === false; else if (k === "aspGlyphs") sl.aspGlyphs = !sl.aspGlyphs; else { sl.layers = Object.assign({}, sl.layers); sl.layers[k] = sl.layers[k] === false; } }
      else if ((t = e.target.closest("[data-harm]"))) { sl.harmonic = +t.dataset.harm; S.sel = null; }
      else if ((t = e.target.closest("[data-preset]"))) { const p = t.dataset.preset; sl.aspects = D.ASPECTS.filter(a => p === "all" || (p === "major" && a.cls === "major") || (p === "minor" && a.cls !== "harmonic")).map(a => a.key); if (p === "none") sl.aspects = []; }
      else return;
      saveSlots(); drawChart();
    });
    left.addEventListener("change", e => {
      const sl = slot(), t = e.target;
      if (t.dataset.k === "profile") { sl.profile = t.value || null; sl.at = null; S.sel = null; }
      else if (t.dataset.k === "partner") sl.partner = t.value || null;
      else if (t.dataset.k === "hsys" || t.dataset.k === "ayanamsa") sl[t.dataset.k] = t.dataset.k === "ayanamsa" ? +t.value : t.value;
      else if (t.dataset.asp) { const k = t.dataset.asp; sl.aspects = t.checked ? sl.aspects.concat(k) : sl.aspects.filter(x => x !== k); }
      else if (t.dataset.orb) { const v = parseFloat(t.value); if (!isNaN(v) && v >= 0) sl.orbs[t.dataset.orb] = v; }
      else if (t.dataset.flag) sl[t.dataset.flag] = t.checked;
      else if (t.dataset.k === "orbScale") sl.orbScale = +t.value;
      else if (t.dataset.k === "harmonic") { const n = Math.round(+t.value); if (n >= 1 && n <= 360) sl.harmonic = n; S.sel = null; }
      else return;
      saveSlots(); drawChart();
    });
    left.addEventListener("input", e => { if (e.target.dataset.k === "orbScale") { slot().orbScale = +e.target.value; $("#orbsc").textContent = (+e.target.value).toFixed(2) + "×"; saveSlots(); recompute(); drawWheel(); drawRight(); } });
    $("#view").addEventListener("click", e => { const f = e.target.closest("[data-fold]"); if (f) { S.ui.closed[f.dataset.fold] = !S.ui.closed[f.dataset.fold]; ST.saveUi(S.ui); f.parentElement.classList.toggle("closed"); } });
    $("#slots").addEventListener("click", e => {
      const rm = e.target.closest("[data-rm]");
      if (rm) { e.stopPropagation(); const i = +rm.dataset.rm; S.slots.splice(i, 1); if (S.active >= S.slots.length) S.active = S.slots.length - 1; else if (S.active > i) S.active--; S.sel = null; saveSlots(); drawChart(); return; }
      const s = e.target.closest("[data-slot]"); if (s) { S.active = +s.dataset.slot; S.sel = null; S.playing = false; saveSlots(); drawChart(); }
    });
    const tc = $("#timec");
    tc.addEventListener("click", e => {
      const st = e.target.closest("[data-step]"); if (st) { stepField(st.dataset.step, +st.dataset.dir); return; }
      const j = e.target.closest("[data-jump]"); if (j) { setMoment(S.comp.momentJd + (+j.dataset.jump) / 86400); drawChart(true); }
    });
    tc.addEventListener("change", e => { if (e.target.dataset.tf) typedField(e.target.dataset.tf, e.target.value); if (e.target.dataset.k === "speed") S.speed = +e.target.value; });
    tc.addEventListener("keydown", e => { const k = e.target.dataset && e.target.dataset.tf; if (!k) return; if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); stepField(k, e.key === "ArrowUp" ? 1 : -1); setTimeout(() => { const i = $(`[data-tf="${k}"]`); if (i) i.focus(); }, 0); } if (e.key === "Enter") e.target.blur(); });
    tc.addEventListener("wheel", e => { const k = e.target.closest(".tf") && $("input", e.target.closest(".tf")).dataset.tf; if (!k) return; e.preventDefault(); stepField(k, e.deltaY < 0 ? 1 : -1); }, { passive: false });
  }

  /* ---------- actions (global, delegated) ---------- */
  function act(name) {
    const sl = S.view === "chart" ? slot() : null;
    switch (name) {
      case "back": back(); break;
      case "settings": window.StarSettings && StarSettings.open(); break;
      case "settings-upd": window.StarSettings && StarSettings.open("updates"); break;
      case "new-profile": openProfile(null); break;
      case "iso-clear": if (S.sel) { S.sel = null; drawWheel(); drawRight(); drawActions(); } break;
      case "toggle-lines": sl.showAspects = sl.showAspects === false; saveSlots(); drawChart(); break;
      case "toggle-glyphs": sl.aspGlyphs = !sl.aspGlyphs; saveSlots(); drawChart(); break;
      case "rotate": sl.rotate = sl.rotate === "aries" ? "asc" : "aries"; saveSlots(); drawChart(); break;
      case "now": if ((sl.type === "natal" || sl.type === "harmonic") && sl.profile) { toast("A natal chart stays at the birth moment. Switch to Transit for now."); break; } sl.at = null; saveSlots(); S.playing = false; drawChart(); break;
      case "reset-time": sl.at = null; saveSlots(); drawChart(); break;
      case "play": if (!S.comp.editable) break; S.playing = !S.playing; S.lastTick = performance.now(); if (S.playing && S.comp.live) { setMoment(S.comp.momentJd); } drawTime(); drawActions(); if (S.playing) requestAnimationFrame(loop); break;
      case "snapshot": snapshot(); break;
      case "show-all": sl.bodies = D.BODIES.map(b => b.key); sl.points = D.POINTS.map(p => p.key); sl.hideSigns = []; sl.layers = {}; sl.showAspects = true; saveSlots(); drawChart(); toast("Everything is showing."); break;
      case "hide-minor": sl.bodies = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]; sl.points = ["asc", "mc"]; S.sel = null; saveSlots(); drawChart(); break;
      case "panels": { const both = S.ui.leftOff && S.ui.rightOff; S.ui.leftOff = S.ui.rightOff = !both; ST.saveUi(S.ui); render(); break; }
      case "fold-left": S.ui.leftOff = !S.ui.leftOff; ST.saveUi(S.ui); render(); break;
      case "fold-right": S.ui.rightOff = !S.ui.rightOff; ST.saveUi(S.ui); render(); break;
      case "add-slot": if (S.slots.length < 4) { S.slots.push(ST.newSlot(slot())); S.active = S.slots.length - 1; S.slots[S.active].at = null; S.sel = null; saveSlots(); drawChart(); } break;
    }
  }
  function loop(t) {
    if (!S.playing || S.view !== "chart") return;
    const dt = (t - S.lastTick) / 1000; S.lastTick = t;
    if (dt > 0 && dt < 1) { setMoment(S.comp.momentJd + dt * S.speed / 86400); drawChart(true); }
    requestAnimationFrame(loop);
  }
  function snapshot() {
    const svg = $("svg.wheel"); if (!svg) return;
    const clone = svg.cloneNode(true);
    const cs = getComputedStyle(document.documentElement);
    let txt = new XMLSerializer().serializeToString(clone).replace(/var\((--[\w-]+)\)/g, (m, v) => cs.getPropertyValue(v).trim() || m);
    txt = txt.replace(/color-mix\([^)]*\)\)?/g, "rgba(92,200,224,.2)");
    const img = new Image(), size = 2000;
    img.onload = () => {
      const cv = document.createElement("canvas"); cv.width = cv.height = size; const g = cv.getContext("2d");
      g.fillStyle = cs.getPropertyValue("--void").trim() || "#05070C"; g.fillRect(0, 0, size, size); g.drawImage(img, 0, 0, size, size);
      cv.toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `StarSource ${S.comp.title} ${new Date().toISOString().slice(0, 10)}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("Saved the wheel as PNG."); });
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(txt);
  }

  document.addEventListener("click", e => {
    const g = e.target.closest("[data-go]"); if (g) { go(g.dataset.go); return; }
    const a = e.target.closest("[data-act]"); if (a && !a.closest(".ov") && !a.closest("#left")) { act(a.dataset.act); return; }
    if (a && a.closest("#left") && ["new-profile", "show-all", "hide-minor"].includes(a.dataset.act)) { act(a.dataset.act); return; }
    const o = e.target.closest("[data-open]"); if (o) { const sl = slot(); sl.profile = o.dataset.open; sl.at = null; if (sl.type === "composite") sl.type = "natal"; saveSlots(); go("chart"); return; }
    const ed = e.target.closest("[data-edit]"); if (ed) { openProfile(ed.dataset.edit); return; }
    const del = e.target.closest("[data-del]");
    if (del) { if (del.dataset.armed) { ST.removeProfile(del.dataset.del); S.slots = ST.slots(); render(); toast("Profile deleted."); } else { del.dataset.armed = "1"; del.textContent = "Click to confirm"; setTimeout(() => { if (del.isConnected) { del.textContent = "Delete"; delete del.dataset.armed; } }, 3000); } }
  });
  const typing = e => { const t = e.target; return t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA" || t.isContentEditable); };
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if ($(".ov")) { closeModal(); return; }
      if (window.StarSettings && StarSettings.isOpen()) { StarSettings.close(); return; }
      if (S.sel) { S.sel = null; drawWheel(); drawRight(); drawActions(); return; }
      act("settings"); return;
    }
    if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); back(); return; }
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey || $(".ov") || (window.StarSettings && StarSettings.isOpen())) return;
    const k = e.key.toLowerCase();
    if (S.view === "harmonics" && window.StarLab && StarLab.keys(e)) { e.preventDefault(); return; }
    if (k === "m") go("menu"); else if (k === "h") go("chart"); else if (k === "p") go("profiles"); else if (k === "l") go("harmonics"); else if (k === "n") act("new-profile");
    else if (S.view === "chart") {
      const map = { z: "iso-clear", v: "toggle-lines", g: "toggle-glyphs", r: "rotate", t: "now", s: "snapshot", b: "panels", u: "show-all", " ": "play" };
      if (map[k]) { e.preventDefault(); act(map[k]); }
      else if (/^[1-4]$/.test(k) && +k <= S.slots.length) { S.active = +k - 1; S.sel = null; saveSlots(); drawChart(); }
      else if (k === "backspace") back();
    } else if (k === "backspace") back();
  });

  /* live clock: top bar every second; live charts follow the clock */
  setInterval(() => {
    tickClock();
    if (S.view === "chart" && S.comp && S.comp.live && !S.playing && !document.hidden) drawChart(true);
    if (S.view === "menu" && !document.hidden) drawSkyNow();
  }, 1000);

  /* ================= boot ================= */
  async function boot() {
    document.body.classList.toggle("mac", /Mac/.test(navigator.platform) && !!window.starsourceDesktop);
    app.innerHTML = `<div style="display:grid;place-items:center;height:100%;font:600 13px/1 var(--ui);letter-spacing:.3em;text-transform:uppercase;color:var(--muted)">Calibrating ephemeris…</div>`;
    try {
      const files = {};
      const want = ["sepl_18.se1", "semo_18.se1", "seas_18.se1", "sefstars.txt"];
      const [wasm] = await Promise.all([
        fetch("engine/swisseph.wasm").then(r => { if (!r.ok) throw new Error("engine missing"); return r.arrayBuffer(); }),
        ...want.map(f => fetch("ephe/" + f).then(r => r.ok ? r.arrayBuffer() : null).then(b => { if (b) files[f] = new Uint8Array(b); }).catch(() => {}))
      ]);
      E = await SWE.load({ wasm, files });
      window.StarEngine = E;
    } catch (err) {
      app.innerHTML = `<div class="empty-msg" style="padding:40px">The ephemeris engine did not load: ${esc(err.message)}.</div>`; return;
    }
    if (window.starsourceDesktop) {
      starsourceDesktop.version().then(v => { S.version = v; if (S.view === "menu") render(); });
      starsourceDesktop.onUpdate(s => { const was = S.upd.status; S.upd = s; window.StarSettings && StarSettings.update(s); if (was !== s.status && (s.status === "ready" || was === "ready")) { const tb = $(".topbar"); if (tb) tb.outerHTML = topbar(); tickClock(); } });
      starsourceDesktop.updateState().then(s => { S.upd = s; window.StarSettings && StarSettings.update(s); });
    }
    else if (window.StarPWA) {
      S.version = (document.querySelector('meta[name="generator"]') || { content: "" }).content.replace("StarSource ", "") || "web";
      StarPWA.onUpdate(st => { const was = S.upd.status; S.upd = st; window.StarSettings && StarSettings.update(st); if (was !== st.status) { const tb = $(".topbar"); if (tb) tb.outerHTML = topbar(); tickClock(); } });
    }
    const h = location.hash.replace("#", "");
    S.view = ["menu", "chart", "profiles", "harmonics"].includes(h) ? h : "menu";
    render(true);
  }
  window.StarApp = {
    state: S, go, render, act, compute, recompute, openProfile, parseCoord, coordStr, select,
    settingsChanged() { S.set = ST.settings(); render(); },
    engine: () => E
  };
  boot();
})();
