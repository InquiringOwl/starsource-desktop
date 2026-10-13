# StarSource: working brief

Read this first in every session. Keep it short and current: update it in the same commit as any change it describes, and add a line to **Changelog** at the bottom for every release.

## What StarSource is
A desktop astrology console (Electron) by Wolfie's Coven (owner: Ashley, ashley@ashleyhoffmann.com). Sister app of **Inquire** (`~/Documents/codex-desktop`, read its CLAUDE.md for the house style); StarSource reuses Inquire's look, update system and release flow.

**Ashley's standing requests:** turn any planet or symbol off (done as the Show/Hide layer); run on Windows, Linux, Mac, iPhone and Android.

**Vision (Ashley, Oct 2026).** Combine the standard natal and transit chart traditions with mathematics and harmonics, using electromagnetic waves as the medium language. The app educates, informs and computes the **objective** side of astrology (positions, angles, aspects, harmonics, cycles, dignities: what can be measured), kept separate from subjective/judicial astrology drawn from intuition. Every number is exact and traceable to its source.

**Reference shelf** (use for terminology, tables, order): Gerry Phillipson, *Astrology in the Year Zero*; Robert Hand, *Horoscope Symbols*; Chris Brennan, *Hellenistic Astrology*; astro-seek.com (comparison charts and feature checklist). Dignity tables follow Ptolemy, *Tetrabiblos* I.17–21 (Egyptian bounds, Dorothean triplicities, Chaldean faces); Lots after Valens (day/night reversal).

## Look and layout (Ashley's preferences)
- **Homeworld 3 tactical HUD layout + Inquire's EVE-console aesthetic.** Original art only: no Homeworld assets, logos or screenshots in the app.
- Top strip: **◀ Back top-left**, StarSource mark, tab buttons with white key badges (`kbd`: Main Menu M, Horoscope Chart H, Profiles P), right side a Sun-position readout, a gold UTC clock (Homeworld's resource counter), **Settings top-right** (Esc).
- Chart screen (`.hud`): **left bar** = chart setup (Population-list style rows and collapsible sections: profile, chart type, zodiac + ayanamsa, house system, orientation, nodes/Lilith/observer, body toggles, aspects + orbs); **centre** = the wheel; **right bar** = all numbers (Carrier-panel style collapsible sections: positions in D°M′S″, speeds, dignities, angles and lots, ARMC/sidereal time/obliquity/ΔT/ayanamsa, houses with rulers, aspects with orbs and applying/separating, aspectarian, essential dignities with scores, chart ruler, final dispositor, decans/faces/bounds, element/modality/hemisphere balance).
- Bottom bar (`.dock`): **bottom-left = chart slots** (up to **4** charts, like Homeworld unit cards; keys 1–4; each slot has its own profile, type, zodiac, houses, bodies, aspects); **bottom-centre = time console** (year/month/day/hour/minute/second with ▲▼, typing, mouse wheel, ±1 d/h/m/s, play at 1 s/s … 1 mo/s, Now/Reset); **bottom-right = action buttons** with key badges (Z clear isolation, V aspect lines, G aspect symbols, R rotate Asc/0° Aries, T now, Space play, S save PNG, B hide both panels).
- **Click a planet** (wheel or right-panel row) to isolate its aspect lines; others fade; click again, Z or Esc clears.
- Angles to the **degree, minute and second** everywhere (`Astro.zpos` rounds to the second with carry into the next sign).
- Palette from Inquire: amber `#F2B84B`, cyan `#5CC8E0`, pink `#F07CA0`, violet `#B49BFF`, green `#7BD88F`, red `#E5675B`; gold `#F5D46B` for the clock/updates. UI chrome uses `var(--frame)` (follows the theme); content colours never change with themes: elements fire red, earth green, air amber, water cyan; aspects conjunction amber, hard red, soft cyan, minor violet dashed, harmonic (5/7/9/10/11) green dotted; each body has a fixed colour (`Wheel.BODY_COL`).
- Fonts (bundled in `app/fonts`): STIX Two Text (names, headings), IBM Plex Sans/Mono (body, numbers), Saira Semi Condensed (uppercase labels), Noto Sans Symbols 1+2 (zodiac/planet glyphs; every glyph carries U+FE0E so it never turns into an emoji).
- Backdrop: procedural starfield + nebula on `<canvas id="sky">` (`starfield.js`), tinted per theme. Themes (Settings → Appearance): Deep Space (default), Kharak Dust (warm, Homeworld-like), Violet Nebula, Ice Giant, Verdant Signal, Red Giant.

## Built (milestones 1–2, Oct 2026)
- Main Menu (`#menu`): Horoscope Chart, Profiles, Profile Creator, Harmonics Lab (locked), Settings; live "The sky now" table for the home location.
- **Profile creator** (modal): first, last, month, day, year, hour, minute, second; birth latitude/longitude (decimal or DMS, `40°42′46″N`, `74 0 22 W`, `-74.006`), place name, time zone filled from the coordinates (`tz-lookup`, editable, any IANA zone), optional UTC offset override (LMT, war time); current latitude/longitude/place/zone for transits. Live preview shows local → UT, JD, ΔT and Sun/Moon/Asc.
- Profiles screen (`#profiles`): cards with Sun/Moon/Asc signs, Open chart, Edit, Delete (two clicks).
- **All 9 chart types** (`compute()` in app.js): Natal; Transit (bi-wheel, transits at the current location); Secondary Progression (day-for-a-year, 365.242199 d, angles from the progressed moment at the birthplace); Composite (midpoints, houses from the midpoint ARMC at mean latitude); **Synastry** (partner on the outer ring, aspects between the two, no applying/separating); **Solar Arc** (every point + progressed Sun − natal Sun); **Solar Return / Lunar Return** (last return on or before the console date, Newton root on the ephemeris to < 0.00001″, cast for the current location or the birthplace, natal on the outer ring optional, next return shown); **Harmonic chart** (longitudes × n, n = 1–360, equal houses from the harmonic Asc; a pair table shows which natal separations become H-n conjunctions). No profile = "The sky now" at home.
- **Show / Hide (visibility layer)**: every body is always computed; `slot.bodies`/`slot.points` are what is *shown*. Eye chips in the left bar for 18 bodies, 7 points, the 12 signs (`slot.hideSigns`: glyph + tint) and wheel layers (`slot.layers`: sign glyphs, element tint, degree ticks, house cusps, house numbers, AC/MC labels, degree labels, leader lines, fixed stars, outer HUD ring; plus aspect lines/symbols). Hidden bodies leave the wheel, the aspects and the dial but stay in the right-bar tables, dimmed, with an eye button. Right-click (long-press on touch) a planet on the wheel hides it; **U** / "Show everything" restores all; "Planets only" keeps Sun–Pluto + AC/MC.
- **Techniques in the right bar** (`web/src/techniques.js`, `Tech`): chart-type card (solar arc value, return moments, harmonic pairs), annual + monthly **profections** (lord of the year), **fixed stars** (49 bright/traditional stars from `sefstars.txt`, royal/Behenian tags, conjunctions within a chosen orb, ✦ on the wheel's outer band, gold = royal), **midpoints** on the 90° dial (Ebertin, 1°30′; follows the isolated planet), a drawn **90° dial**, **antiscia** and contra-antiscia (contacts ≤ 1°).
- **Harmonics Lab** (`#harmonics`, key L, `web/src/lab.js`, `StarLab`): the chart as a signal. Spectrum of harmonics 1–12/36/90/180 (amplitude R = mean resultant length, chance level √π/(2√k), Rayleigh p with a dot for p < 0.05, warning about multiple testing), waveform of the selected harmonic with crests at its phase (or the sum of harmonics 1…h), H-n wheel, pairs in H-n conjunction, strongest harmonics. Points: 7 classical, 10 planets, or + AC/MC. The EM-wave language is presented as the shared mathematics (Fourier analysis), explicitly not as a physical claim.
- **City search** (`web/src/cities.js`, `Cities`): 135,224 places (GeoNames ≥ 1,000 people, CC BY 4.0, via all-the-cities; US state names) in `app/data/cities.tsv`, loaded on first use; "Springfield, Illinois", "Paris, FR". Fills latitude, longitude, place name and time zone in the profile creator (birth + current) and Settings → home.
- Zodiac: tropical or sidereal with **all 47 Swiss Ephemeris ayanamsas** (Lahiri, Fagan/Bradley, Raman, KP, True Citra … listed first). Houses: **all 23 systems** (Placidus, Koch, Alcabitius, Topocentric, APC, Regiomontanus, Campanus, Krusinski, Horizontal, Porphyry, Sripati, Pullen SD/SR, Sunshine, Whole Sign, Equal Asc/MC, Vehlow, Equal 0° Aries, Morinus, Meridian, Carter, Gauquelin 36). Polar latitudes: the engine falls back to Porphyry and the warning shows under Houses.
- Bodies: Sun–Pluto, true/mean node + south node, mean/osculating Lilith, Chiron, Ceres, Pallas, Juno, Vesta. Points: AC, MC, DC, IC, Vertex, Lot of Fortune, Lot of Spirit. Observer geocentric or topocentric.
- Aspects (all drawable, each with its own orb, orb scale 0.25–2×, +1° for luminaries on majors): conjunction, opposition, trine, square, sextile, quincunx, semi-sextile, semi-square, sesquiquadrate, quintile, biquintile, septile ×3, novile ×3, decile, tredecile, undecile.
- Settings (Esc or top-right): Appearance (themes), Display (interface size, starfield, reduce motion), Chart defaults (home location, default house system/zodiac/ayanamsa/nodes, apply to all slots), **Updates (auto-updater status, Check for updates, Install & Relaunch, Show in Finder when macOS blocks the swap)**, About (credits, licence).
- Auto-update: same scheme as Inquire (Mac self-updater `updater-mac.js` for unsigned builds, electron-updater on Windows/Linux, checks at launch + every 4 h). A gold "Update ready" button appears in the top bar.

## Platforms (Oct 2026)
| Where | How it is built | How it updates |
| --- | --- | --- |
| macOS, Windows, Linux | Electron, `release.yml` matrix (dmg+zip / nsis / AppImage) | Self-updater (Settings → Updates) |
| Any browser, iPhone/iPad, Android, Chromebook (web app / PWA) | `pages.yml` publishes `app/` to **https://inquiringowl.github.io/starsource-desktop/** on every release tag; `web/pwa/` = service worker (precache, offline) + `pwa.js`; `build-web.js` writes `app/sw.js` and `app/manifest.webmanifest`; icons `app/icon-*.png` | Service worker downloads the new version; Settings → Updates / top bar offers "Reload to update" |
| Android app (native shell) | Capacitor 8 (`capacitor.config.json`, webDir `app`, appId `com.wolfiescoven.starsource`); `release.yml` job `android` runs `cap add android` + `@capacitor/assets` (icons/splash from `assets/`) + Gradle and attaches the APK to the GitHub Release. Signed release APK + **AAB for Google Play** only when secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` exist; otherwise a debug-signed sideload APK | Google Play (or reinstall the APK) |
| iPhone/iPad app (native shell) | Same Capacitor project; `release.yml` job `ios` only proves it builds for the simulator (`continue-on-error`). Device/App Store builds: on the Mac, `npm run ios` opens Xcode; needs an Apple Developer account ($99/yr) and signing | App Store / TestFlight |
`android/` and `ios/` are generated (gitignored); run `npm run android` / `npm run ios` locally (Android Studio / Xcode). Touch: long-press = hide, tap = isolate; phone layout order is wheel → time console → data → setup; `kbd` badges hide on touch screens.
**Licence caveat for app stores:** Google Play accepts AGPL apps. Apple's App Store terms are widely considered incompatible with GPL/AGPL code you do not own the copyright to (the Swiss Ephemeris belongs to Astrodienst); publishing StarSource to the App Store needs the **Swiss Ephemeris Professional licence** (or Astrodienst's written permission). The web app on iPhone has no such problem.

## Roadmap (agree order with Ashley)
1. Harmonics Lab next steps: compare two charts' spectra, group studies (many profiles, Addey-style averages with proper statistics), sonification (each harmonic as a tone).
2. Time lords beyond profections (zodiacal releasing, firdaria), primary directions, solar arc to other methods, outer-ring houses for transits/returns.
3. Printing/PDF of a chart and its tables; export/import of profiles (backup like Inquire's).
4. Learn mode: Inquire-style lessons on what each number means (objective definitions first).
5. Native app polish once the stores are chosen (App Store needs the licence decision above).

## Architecture
| Path | What |
| --- | --- |
| `vendor/swisseph/` | Swiss Ephemeris 2.10.03 C source (Astrodienst, AGPL), upstream commit in `UPSTREAM-COMMIT` |
| `web/engine/ss.c` | Thin C wrapper (static output buffers) compiled with the Swiss Ephemeris to `app/engine/swisseph.wasm` by `tools/build-wasm.sh` (Zig `cc -target wasm32-wasi`; Emscripten is not used) |
| `web/engine/swe.js` | `SWE.load({wasm, files})`: WASI shim + in-memory file system for the `.se1` files; API `calc`, `houses`, `housesArmc`, `housePos`, `setSidMode`, `ayanamsa(Name)`, `utcToJd` (leap seconds), `deltaT`, `sidTime`, `obliquity`, `fixstar`, `julday/revjul`. Same code in browser, Electron and Node tests |
| `app/ephe/` | `sepl_18.se1`, `semo_18.se1`, `seas_18.se1` (1800–2399, JPL DE441), `sefstars.txt`. Outside 1800–2399 the engine uses Moshier automatically |
| `web/src/astro-data.js` | `AstroData`: signs (rulers, exaltations, detriment/fall derived), bodies, points, aspects, house systems, chart types, Egyptian bounds, Chaldean faces, triplicities, house names |
| `web/src/astro.js` | `Astro`: `chart`, `composite`, `progressedJd`, `aspects` (orbs, applying/separating), `dignity` (Lilly weights), `balance`, `zpos`/`dms`, time zones (`localToUTC` via Intl, `jdToLocal`) |
| `web/src/techniques.js` | `Tech`: `findReturn`, `solarArc`, `harmonicChart`, `spectrum`, `wave`, `synthesis`, `midpoints`, `antiscia`, `profection`, `fixedStars` (+ `STARS`, `ROYAL`, `BEHENIAN`) |
| `web/src/lab.js`, `web/src/cities.js`, `web/pwa/` | Harmonics Lab, city search, PWA (service worker template + registration) |
| `web/src/wheel.js` | `Wheel.svg(spec)` (single or bi-wheel SVG string; planets `g.planet[data-id="i:sun"|"o:sun"]`, aspects `g.asp[data-a][data-b]`), `Wheel.mini`, glyph spreading |
| `web/src/store.js` | localStorage: `starsource.profiles`, `.slots` (max 4), `.active`, `.settings`, `.ui` |
| `web/src/app.js` | Screens, HUD, profile creator, time console, actions, shortcuts (`StarApp`) |
| `web/src/settings.js` | Settings window + themes + updater UI (`StarSettings`) |
| `web/src/starfield.js` | Backdrop (`StarSky`) |
| `web/src/style.css` | All styles |
| `main.js`, `preload.js`, `updater-mac.js` | Electron shell on the `starsource://` scheme, `window.starsourceDesktop` bridge, updates |
| `tests/astro.test.js` + `tests/fixtures/swetest.json` | WASM vs native swetest to 1e-6° (7 charts 1824–2199, 19 bodies, 16 house systems, Lahiri), time zones, dignities, aspects; returns (tropical + sidereal), solar arc, harmonics, spectrum, midpoints, antiscia, profections, fixed stars (1,998 checks) |

Load order (build-web.js): pwa → tz-lookup → swe → astro-data → astro → techniques → store → wheel → starfield → settings → lab → cities → app.

**Licence:** the Swiss Ephemeris is AGPL-3.0 (or a paid Swiss Ephemeris Professional licence). StarSource is therefore **AGPL-3.0-or-later** and the repo stays public. If Ashley ever wants a closed-source paid app, buy the professional licence first. Keep Astrodienst's copyright notices.

## Commands
- `node tools/build-web.js`: builds `app/index.html` (fails on any syntax error).
- `node tests/astro.test.js`: engine + maths tests (~1 s). Must be 0 failed.
- `node tools/smoke.js`: headless Chromium drives every screen, all 9 chart types × 11 house systems, sidereal, all aspects/bodies, Show/Hide (signs, layers, eye, right-click, Show everything), slots, play, profile creation, city search (Springfield, Illinois → America/Chicago), Harmonics Lab, settings at 1600/1280/420 px; any JS error fails (~1 min).
- PWA check: serve, open `http://localhost:8765/?sw` (the service worker skips localhost without `?sw`), reload, go offline, reload.
- `node tools/serve.js` then open http://localhost:8765/ for browser testing; `node tools/snap.js '#chart' 'js:StarApp.select("i:sun")' 'shot:name'` for screenshots (`W=`, `H=`, `SETUP=`).
- `npm run check` = build + test + smoke. `npm start` runs the app from source (needs `npm install`).
- `bash tools/build-wasm.sh` (with `ZIG=` pointing at Zig ≥ 0.13; `pip install ziglang` provides one) rebuilds the engine; then `python3 tools/make-fixtures.py /tmp/swetest` only if the Swiss Ephemeris source or data files change (build the native swetest first, command in the script header).
- Cloud sessions: Playwright's Chromium works in the cloud container; the Mac's device shell can't download it. Same sync pattern as Inquire (pack a tgz, stage/commit, extract).

## Release (auto-update reaches every installed copy)
GitHub repo **`InquiringOwl/starsource-desktop`** (public). Ashley runs releases in Terminal (the device shell has no GitHub credentials):
`npm run release -- patch "Short note"` (or `minor`, `major`, exact `X.Y.Z`; the first release is `npm run release -- minor "First release"`, which makes 0.2.0). It refuses if GitHub has newer commits, runs `npm run check`, bumps the version, commits, pushes, tags; GitHub Actions (`release.yml`, after `check.yml`) builds macOS (dmg + zip, arm64 + x64), Windows (nsis) and Linux (AppImage) and publishes the release with `latest-mac.yml`, `latest.yml`, `latest-linux.yml`. If one platform fails, re-run only that job. The app is unsigned (ad-hoc signature in `build/after-pack.js`), like Inquire.
One-time on a new Mac: `npm install && npx playwright install chromium`.

## Known leftovers
- Narrow windows (≈1280 px): the right panel's Dignity column scrolls sideways; the wheel's degree labels get small.
- Snapshot PNG flattens `color-mix()` colours to a fixed cyan glow.
- Electron packaging, the auto-updater and the `starsource://` scheme are copied from Inquire and untested until the first GitHub release exists.
- Transit/return outer rings have no house cusps of their own (only the inner chart's houses are drawn).
- Android/iOS CI jobs and GitHub Pages are untested until the first release runs; `@capacitor/assets` icon generation is allowed to fail with a warning.
- City list regions: only where GeoNames admin codes equal ISO codes (US states); elsewhere the country is shown.
- Progressed angles use the progressed moment at the birthplace (≈ Naibod in RA); solar-arc MC and other progression methods are not offered yet.

## Changelog
- **0.2.0** (Oct 2026): Synastry, Solar Arc, Solar/Lunar Returns, Harmonic charts; Show/Hide layer for bodies, points, signs and wheel layers; fixed stars, profections, midpoints + 90° dial, antiscia; Harmonics Lab; offline city search; web app (PWA on GitHub Pages) and Android/iOS Capacitor builds.
- **0.1.0** (Oct 2026): first build. Swiss Ephemeris WASM engine verified against native swetest; Main Menu, profile creator, profiles, Homeworld-style chart HUD with natal/transit/progressed/composite, 23 house systems, 47 ayanamsas, 20 aspects, planet isolation, 4 chart slots, time console to the second, actions bar, settings with themes and the auto-updater.
