/* StarSource Settings window (top-right Settings button, or Esc). Tabs: Appearance, Display, Chart defaults, Updates, About.
   Stored in localStorage "starsource.settings" (Store.settings()). Themes change surfaces and the UI accent (--frame) only;
   content colours (planets, elements, aspects, c1–c5) never change. The auto-updater lives in the Updates tab. */
(function () {
  "use strict";
  const ST = window.Store, D = window.AstroData;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const THEMES = [
    { id: "deep-space", name: "Deep Space", note: "Inquire's console among the stars", bg: "#05070C", panel: "#101826", frame: "#5CC8E0", tint1: "rgba(92,200,224,.10)", tint2: "rgba(180,155,255,.08)", neb: ["#1B3A66", "#3A2466"] },
    { id: "kharak", name: "Kharak Dust", note: "Warm desert haze, brass trim", bg: "#0C0805", panel: "#1C140E", frame: "#F2B84B", tint1: "rgba(224,151,90,.16)", tint2: "rgba(242,184,75,.08)", neb: ["#5A3418", "#3A2010"] },
    { id: "nebula", name: "Violet Nebula", note: "Deep violet gas clouds", bg: "#07050E", panel: "#151027", frame: "#B49BFF", tint1: "rgba(180,155,255,.14)", tint2: "rgba(217,122,230,.10)", neb: ["#3A1E66", "#5A1E55"] },
    { id: "ice", name: "Ice Giant", note: "Pale cyan, cold light", bg: "#040A0E", panel: "#0E1C24", frame: "#9FE6F5", tint1: "rgba(159,230,245,.12)", tint2: "rgba(92,200,224,.08)", neb: ["#12405A", "#103040"] },
    { id: "verdant", name: "Verdant Signal", note: "Green phosphor terminal", bg: "#040A06", panel: "#0E1E14", frame: "#7BD88F", tint1: "rgba(123,216,143,.12)", tint2: "rgba(92,200,224,.06)", neb: ["#12402A", "#0E2E30"] },
    { id: "ember", name: "Red Giant", note: "Ember red, banked coals", bg: "#0C0405", panel: "#1F0E10", frame: "#E5675B", tint1: "rgba(229,103,91,.14)", tint2: "rgba(242,184,75,.06)", neb: ["#5A1A18", "#3A1020"] }
  ];
  const rgba = (h, a) => `rgba(${[1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(",")},${a})`;
  function applyTheme(id) {
    const t = THEMES.find(x => x.id === id) || THEMES[0], r = document.documentElement.style;
    r.setProperty("--void", t.bg); r.setProperty("--panel", t.panel); r.setProperty("--frame", t.frame);
    r.setProperty("--tint-1", t.tint1); r.setProperty("--tint-2", t.tint2);
    r.setProperty("--hud-1", rgba(t.panel, .86)); r.setProperty("--hud-2", rgba(t.bg, .9));
    window.StarSky && StarSky.setNebula(t.neb, t.bg);
  }
  function applyAll() {
    const s = ST.settings();
    applyTheme(s.theme);
    document.getElementById("app").style.zoom = s.uiScale !== 1 ? s.uiScale : "";
    document.documentElement.dataset.reduceMotion = s.reduceMotion ? "1" : "0";
    window.StarSky && StarSky.enable(s.starfield, !s.reduceMotion);
  }

  let tab = "appearance", upd = { status: "idle" }, ov = null;
  function body() {
    const s = ST.settings();
    if (tab === "appearance") return `<h3>Theme</h3><p>Themes change the panels, the accent and the backdrop. Planet, element and aspect colours keep their meaning in every theme.</p>
      <div class="themes">${THEMES.map(t => `<button class="theme ${s.theme === t.id ? "on" : ""}" data-theme="${t.id}"><div class="sw" style="background:radial-gradient(120px 60px at 30% 40%,${t.neb[0]},transparent),radial-gradient(100px 60px at 80% 70%,${t.neb[1]},transparent),${t.bg}"><i style="background:${t.frame};box-shadow:0 0 10px ${t.frame}"></i></div><b>${t.name}</b><small>${t.note}</small></button>`).join("")}</div>`;
    if (tab === "display") return `<h3>Display</h3>
      <div class="slider"><label for="ui-scale">Interface size</label><input id="ui-scale" type="range" min="0.75" max="1.4" step="0.05" value="${s.uiScale}"><output>${Math.round(s.uiScale * 100)}%</output></div>
      <label class="check"><input type="checkbox" id="starfield" ${s.starfield ? "checked" : ""}>Starfield backdrop</label>
      <label class="check"><input type="checkbox" id="reduce" ${s.reduceMotion ? "checked" : ""}>Reduce motion (no fades, no twinkling)</label>`;
    if (tab === "defaults") {
      const c = s.chart, h = s.home;
      return `<h3>Home location</h3><p>Used for "The sky now" and for profiles without a current location.</p>
      <div class="fgrid"><div class="field span6"><label>Find a city</label><input class="inp" id="h-city" placeholder="Type a city" autocomplete="off"></div><div class="field span2"><label>Latitude</label><input class="inp" id="h-lat" value="${esc(StarApp.coordStr(h.lat, true))}"></div>
      <div class="field span2"><label>Longitude</label><input class="inp" id="h-lon" value="${esc(StarApp.coordStr(h.lon, false))}"></div>
      <div class="field span2"><label>Place name</label><input class="inp" id="h-place" value="${esc(h.place)}"></div>
      <div class="field span3"><label>Time zone</label><input class="inp" id="h-tz" value="${esc(h.tz)}"></div><div class="field span3"><label>&nbsp;</label><button class="btn pri" data-save-home>Save home</button></div></div>
      <h3 style="margin-top:18px">New charts start with</h3><p>Each chart slot keeps its own settings; these are only the starting values for a new slot.</p>
      <div class="fgrid"><div class="field span3"><label>House system</label><select class="sel" id="d-hsys">${D.HOUSE_SYSTEMS.map(x => `<option value="${x.code}" ${c.hsys === x.code ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>
      <div class="field span3"><label>Zodiac</label><select class="sel" id="d-zod"><option value="tropical" ${c.zodiac === "tropical" ? "selected" : ""}>Tropical</option><option value="sidereal" ${c.zodiac === "sidereal" ? "selected" : ""}>Sidereal</option></select></div>
      <div class="field span3"><label>Ayanamsa (sidereal)</label><select class="sel" id="d-ay">${Array.from({ length: 47 }, (_, i) => `<option value="${i}" ${+c.ayanamsa === i ? "selected" : ""}>${esc(StarApp.engine().ayanamsaName(i))}</option>`).join("")}</select></div>
      <div class="field span3"><label>Nodes</label><select class="sel" id="d-node"><option value="true" ${c.node === "true" ? "selected" : ""}>True</option><option value="mean" ${c.node === "mean" ? "selected" : ""}>Mean</option></select></div></div>
      <div class="btns" style="margin-top:10px"><button class="btn pri" data-save-def>Save defaults</button><button class="btn" data-apply-all>Apply to every open chart</button></div>`;
    }
    if (tab === "updates") return `<h3>Updates</h3>${(window.StarPWA ? StarPWA.kind : "desktop") === "desktop" ? "<p>StarSource checks GitHub for a new version when it starts and every 4 hours, downloads it in the background, and installs it when you choose Install &amp; Relaunch.</p>" : ""}
      <div class="upd-box" id="upd-box">${updBox()}</div>
      <p style="margin-top:14px">Releases: <a href="https://github.com/InquiringOwl/starsource-desktop/releases" target="_blank" rel="noopener" style="color:var(--frame)">github.com/InquiringOwl/starsource-desktop</a></p>`;
    return `<h3>About StarSource</h3>
      <p>StarSource is an astrology console from Wolfie's Coven. It computes charts with the <b>Swiss Ephemeris</b> 2.10 by Astrodienst AG (Dieter Koch and Alois Treindl), compiled to WebAssembly and checked against the native library to 0.000001°. Bundled data files cover 1800–2399 CE from NASA JPL DE441; outside that range the built-in Moshier ephemeris is used (about 0.1″ for planets).</p>
      <p>Because it includes the Swiss Ephemeris under the GNU Affero General Public License v3, StarSource itself is licensed AGPL-3.0-or-later and its full source is public on GitHub.</p>
      <p>City search: GeoNames (geonames.org), licensed CC BY 4.0, via the all-the-cities package. Time zones from coordinates: tz-lookup (CC0) and your computer's time-zone database.</p>
      <p>Where it runs: the desktop app (macOS, Windows, Linux) updates itself from GitHub; the web app installs on any phone or computer from the browser and updates itself; native iPhone and Android builds are prepared in the repo (see CLAUDE.md → Platforms).</p>
      <p>Reference shelf: Gerry Phillipson, <i>Astrology in the Year Zero</i>; Robert Hand, <i>Horoscope Symbols</i>; Chris Brennan, <i>Hellenistic Astrology</i>; Astro-Seek (comparison charts). Dignities follow Ptolemy (<i>Tetrabiblos</i> I.17–21): Egyptian bounds, Dorothean triplicities, Chaldean faces.</p>
      <p class="mono" style="font-size:12px">Engine ${esc(StarApp.engine() ? StarApp.engine().version() : "")} · app ${esc(StarApp.state.version)}</p>`;
  }
  function updBox() {
    const s = upd, v = StarApp.state.version;
    const kind = window.StarPWA ? StarPWA.kind : (window.starsourceDesktop ? "desktop" : "web");
    if (kind === "native") return `<div class="st">This is the phone app. Updates come from the App Store or Google Play like any other app.</div><div class="mono faint" style="font-size:11.5px">Version ${esc(v)}</div>`;
    if (kind === "web") {
      const msg = { checking: "Checking for a new version…", ready: "A new version of StarSource has downloaded.", error: "Could not check (offline?).", current: "This is the latest version. New versions download by themselves while you are online." }[s.status] || "New versions download by themselves while you are online.";
      return `<div class="st">${msg}</div><div class="btns"><button class="btn" data-check>Check for updates</button>${s.status === "ready" ? `<button class="btn gold" data-install>Reload to update</button>` : ""}${StarPWA && StarPWA.installable ? `<button class="btn pri" data-pwa-install>Install as an app</button>` : ""}</div>
        <div class="note" style="padding:0">To install on a phone: iPhone/iPad: Safari → Share → Add to Home Screen. Android: Chrome → ⋮ → Install app. Desktop browsers: the install icon in the address bar.</div><div class="mono faint" style="font-size:11.5px">Version ${esc(v)}</div>`;
    }
    const msg = { idle: "Not checked yet.", dev: "This copy was started from source (npm start), so it does not update itself.", checking: "Checking GitHub…", current: `StarSource ${esc(v)} is the latest version.`,
        downloading: `Downloading ${esc(s.version || "")}… ${s.percent || 0}%`, ready: `StarSource ${esc(s.version)} is downloaded and ready to install.`, installing: "Installing… StarSource will reopen.",
        installed: `Updated to ${esc(s.version)}.`, blocked: `macOS blocked the swap. The new app is in your Downloads folder.`, error: `Could not update: ${esc(s.message || "unknown error")}` }[s.status] || esc(s.status);
    return `<div class="st">${msg}</div>${s.status === "downloading" ? `<div class="prog"><i style="width:${s.percent || 0}%"></i></div>` : ""}
      <div class="btns"><button class="btn" data-check ${s.status === "checking" || s.status === "downloading" ? "disabled" : ""}>Check for updates</button>
      ${s.status === "ready" ? `<button class="btn gold" data-install>Install &amp; Relaunch</button>` : ""}${s.status === "blocked" ? `<button class="btn" data-reveal>Show in Finder</button>` : ""}</div>
      <div class="mono faint" style="font-size:11.5px">Installed version ${esc(v)}</div>`;
  }
  const TABS = [["appearance", "Appearance"], ["display", "Display"], ["defaults", "Chart defaults"], ["updates", "Updates"], ["about", "About"]];
  function draw() {
    if (!ov) return;
    $(".set-tabs", ov).innerHTML = TABS.map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-tab="${k}">${l}${k === "updates" && upd.status === "ready" ? '<span class="upd-dot"></span>' : ""}</button>`).join("");
    $(".set-body", ov).innerHTML = body();
    const hc = $("#h-city", ov); if (hc && window.Cities) Cities.attach(hc, c => { $("#h-lat", ov).value = StarApp.coordStr(c.lat, true); $("#h-lon", ov).value = StarApp.coordStr(c.lon, false); $("#h-place", ov).value = c.name + (c.region ? ", " + c.region : "") + ", " + c.country; $("#h-tz", ov).value = c.tz; });
  }
  function open(t) {
    if (t) tab = t;
    if (ov) { draw(); return; }
    document.body.insertAdjacentHTML("beforeend", `<div class="ov" id="set-ov"><div class="win set-win" role="dialog" aria-label="Settings"><div class="win-h"><span class="dot"></span>Settings<button class="x" data-xs aria-label="Close" style="margin-left:auto;background:none;border:1px solid var(--line);color:var(--muted);width:26px;height:26px;cursor:pointer">✕</button></div><nav class="set-tabs"></nav><div class="set-body"></div></div></div>`);
    ov = document.getElementById("set-ov"); document.body.classList.add("modal-open");
    draw();
    ov.addEventListener("click", e => {
      if (e.target === ov || e.target.closest("[data-xs]")) { close(); return; }
      const t2 = e.target.closest("[data-tab]"); if (t2) { tab = t2.dataset.tab; draw(); return; }
      const th = e.target.closest("[data-theme]"); if (th) { const s = ST.settings(); s.theme = th.dataset.theme; ST.saveSettings(s); applyAll(); draw(); return; }
      if (e.target.closest("[data-check]")) { if (window.starsourceDesktop) starsourceDesktop.checkForUpdates().then(u); else if (window.StarPWA) StarPWA.check(); return; }
      if (e.target.closest("[data-install]")) { if (window.starsourceDesktop) starsourceDesktop.installUpdate(); else if (window.StarPWA) StarPWA.apply(); return; }
      if (e.target.closest("[data-pwa-install]")) { StarPWA.install(); return; }
      if (e.target.closest("[data-reveal]")) { window.starsourceDesktop && starsourceDesktop.revealUpdate(); return; }
      if (e.target.closest("[data-save-home]")) {
        const lat = StarApp.parseCoord($("#h-lat", ov).value, true), lon = StarApp.parseCoord($("#h-lon", ov).value, false), tz = $("#h-tz", ov).value.trim();
        if (isNaN(lat) || isNaN(lon)) { alertMsg("Check the latitude and longitude."); return; }
        const s = ST.settings(); s.home = { lat, lon, tz: tz || "UTC", place: $("#h-place", ov).value.trim() }; ST.saveSettings(s); StarApp.settingsChanged(); alertMsg("Home saved."); return;
      }
      if (e.target.closest("[data-save-def]") || e.target.closest("[data-apply-all]")) {
        const s = ST.settings(); Object.assign(s.chart, { hsys: $("#d-hsys", ov).value, zodiac: $("#d-zod", ov).value, ayanamsa: +$("#d-ay", ov).value, node: $("#d-node", ov).value }); ST.saveSettings(s);
        if (e.target.closest("[data-apply-all]")) { const sl = ST.slots().map(x => Object.assign(x, { hsys: s.chart.hsys, zodiac: s.chart.zodiac, ayanamsa: s.chart.ayanamsa, node: s.chart.node })); ST.saveSlots(sl); StarApp.state.slots = sl; }
        StarApp.settingsChanged(); alertMsg("Defaults saved."); return;
      }
    });
    ov.addEventListener("input", e => {
      const s = ST.settings();
      if (e.target.id === "ui-scale") { s.uiScale = +e.target.value; e.target.nextElementSibling.textContent = Math.round(s.uiScale * 100) + "%"; }
      else if (e.target.id === "starfield") s.starfield = e.target.checked;
      else if (e.target.id === "reduce") s.reduceMotion = e.target.checked;
      else return;
      ST.saveSettings(s); applyAll();
    });
  }
  function alertMsg(m) { const b = $(".set-body", ov); const n = document.createElement("div"); n.className = "note c5"; n.textContent = m; b.appendChild(n); setTimeout(() => n.remove(), 2400); }
  function close() { if (ov) { ov.remove(); ov = null; document.body.classList.remove("modal-open"); } }
  function u(s) { if (s) upd = s; const box = ov && $("#upd-box", ov); if (box) box.innerHTML = updBox(); if (ov) $(".set-tabs", ov) && draw(); }
  window.StarSettings = { open, close, isOpen: () => !!ov, update: u, applyAll, THEMES };
  applyAll();
})();
