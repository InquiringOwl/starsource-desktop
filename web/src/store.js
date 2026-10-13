/* StarSource local data: profiles, chart slots and settings in localStorage (prefix "starsource.").
   Everything stays on this computer. Store.* is read by app.js and settings.js. */
(function (root) {
  "use strict";
  const D = root.AstroData;
  const K = { profiles: "starsource.profiles", slots: "starsource.slots", active: "starsource.active", settings: "starsource.settings", ui: "starsource.ui" };
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  /* A guess at "home" from the computer's time zone, used until the user sets one (Settings → Chart defaults). */
  const ZONE_HOMES = {
    "America/Los_Angeles": [34.0522, -118.2437, "Los Angeles"], "America/Denver": [39.7392, -104.9903, "Denver"],
    "America/Chicago": [41.8781, -87.6298, "Chicago"], "America/New_York": [40.7128, -74.006, "New York"],
    "America/Phoenix": [33.4484, -112.074, "Phoenix"], "America/Anchorage": [61.2181, -149.9003, "Anchorage"],
    "Pacific/Honolulu": [21.3069, -157.8583, "Honolulu"], "Europe/London": [51.5072, -0.1276, "London"],
    "Europe/Paris": [48.8566, 2.3522, "Paris"], "Europe/Berlin": [52.52, 13.405, "Berlin"], "Asia/Tokyo": [35.6762, 139.6503, "Tokyo"],
    "Australia/Sydney": [-33.8688, 151.2093, "Sydney"], "Asia/Kolkata": [28.6139, 77.209, "New Delhi"]
  };
  const sysTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { return "UTC"; } })();
  const zh = ZONE_HOMES[sysTz] || [51.4769, 0, "Greenwich"];

  const DEF_SETTINGS = {
    theme: "deep-space", uiScale: 1, reduceMotion: false, starfield: true,
    home: { lat: zh[0], lon: zh[1], tz: ZONE_HOMES[sysTz] ? sysTz : "UTC", place: zh[2] },
    chart: {
      zodiac: "tropical", ayanamsa: 1, hsys: "P", node: "true", lilith: "mean", center: "geo", rotate: "asc",
      bodies: D.BODIES.filter(b => b.on).map(b => b.key), points: ["asc", "mc"],
      aspects: D.ASPECTS.filter(a => a.on).map(a => a.key), orbs: {}, orbScale: 1, aspGlyphs: false, showAspects: true, innerAspects: false
    }
  };
  function settings() {
    const s = read(K.settings, {});
    const out = Object.assign({}, DEF_SETTINGS, s);
    out.home = Object.assign({}, DEF_SETTINGS.home, s.home);
    out.chart = Object.assign({}, DEF_SETTINGS.chart, s.chart);
    return out;
  }
  function saveSettings(s) { write(K.settings, s); }

  function profiles() { return read(K.profiles, []); }
  function saveProfiles(list) { write(K.profiles, list); }
  function upsertProfile(p) {
    const list = profiles(); if (!p.id) p.id = uid();
    const i = list.findIndex(x => x.id === p.id);
    if (i >= 0) list[i] = p; else list.push(p);
    saveProfiles(list); return p;
  }
  function removeProfile(id) { saveProfiles(profiles().filter(p => p.id !== id)); const sl = slots().map(s => s.profile === id ? Object.assign(s, { profile: null }) : s); saveSlots(sl); }
  const profile = id => profiles().find(p => p.id === id) || null;

  function newSlot(base) {
    const c = settings().chart;
    return Object.assign({ id: uid(), type: "natal", profile: (profiles()[0] || {}).id || null, partner: null, at: null,
      zodiac: c.zodiac, ayanamsa: c.ayanamsa, hsys: c.hsys, node: c.node, lilith: c.lilith, center: c.center, rotate: c.rotate,
      bodies: c.bodies.slice(), points: c.points.slice(), aspects: c.aspects.slice(), orbs: Object.assign({}, c.orbs), orbScale: c.orbScale,
      aspGlyphs: c.aspGlyphs, showAspects: c.showAspects, innerAspects: c.innerAspects,
      layers: {}, hideSigns: [], harmonic: 5, retLoc: "current", natalRing: true, starOrb: 1 }, base ? JSON.parse(JSON.stringify(base)) : {}, base ? { id: uid() } : {});
  }
  function slots() { const s = read(K.slots, null); return Array.isArray(s) && s.length ? s : [newSlot()]; }
  function saveSlots(s) { write(K.slots, s.slice(0, 4)); }
  const active = () => read(K.active, 0);
  const setActive = i => write(K.active, i);
  const ui = () => read(K.ui, { closed: {}, leftOff: false, rightOff: false });
  const saveUi = u => write(K.ui, u);

  root.Store = { settings, saveSettings, profiles, saveProfiles, upsertProfile, removeProfile, profile, slots, saveSlots, newSlot, active, setActive, ui, saveUi, uid, sysTz, DEF_SETTINGS };
})(typeof window !== "undefined" ? window : globalThis);
