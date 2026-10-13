/* StarSource ephemeris engine: the Swiss Ephemeris (Astrodienst, AGPL-3.0) compiled from C to WebAssembly
   (web/engine/ss.c, built by tools/build-wasm.sh) with a tiny WASI shim and an in-memory file system that
   holds the bundled .se1 data files (app/ephe/). Works the same in the browser, in Electron and in Node tests.

   SWE.load({ wasm: ArrayBuffer|Uint8Array, files: { "sepl_18.se1": Uint8Array, … } }) → Promise<SWE>
   Then SWE.calc(jdUT, body, flags), SWE.houses(jdUT, lat, lon, hsys, flags), … (see the API at the bottom). */
(function (root) {
  "use strict";
  const C = {
    SUN: 0, MOON: 1, MERCURY: 2, VENUS: 3, MARS: 4, JUPITER: 5, SATURN: 6, URANUS: 7, NEPTUNE: 8, PLUTO: 9,
    MEAN_NODE: 10, TRUE_NODE: 11, MEAN_APOG: 12, OSCU_APOG: 13, EARTH: 14, CHIRON: 15, PHOLUS: 16,
    CERES: 17, PALLAS: 18, JUNO: 19, VESTA: 20,
    FLG_SWIEPH: 2, FLG_MOSEPH: 4, FLG_HELCTR: 8, FLG_TRUEPOS: 16, FLG_NONUT: 64, FLG_SPEED: 256,
    FLG_EQUATORIAL: 2048, FLG_TOPOCTR: 32768, FLG_SIDEREAL: 65536, GREG: 1, JUL: 0, NSIDM: 47
  };
  const DIR = "ephe";

  /* ---------- minimal WASI preview1 shim: one preopened directory "/" backed by a Map of files ---------- */
  function wasi(files, log) {
    let mem = null;
    const fds = new Map(); // fd → {data, pos}
    let nextFd = 4;
    const v = () => new DataView(mem.buffer);
    const u8 = () => new Uint8Array(mem.buffer);
    const str = (p, n) => new TextDecoder().decode(u8().subarray(p, p + n));
    const E = { SUCCESS: 0, BADF: 8, NOENT: 44, INVAL: 28, NOSYS: 52, ROFS: 69 };
    const imp = {
      args_get: () => 0, args_sizes_get: (a, b) => { v().setUint32(a, 0, true); v().setUint32(b, 0, true); return 0; },
      environ_get: () => 0,
      environ_sizes_get: (a, b) => { v().setUint32(a, 0, true); v().setUint32(b, 0, true); return 0; },
      clock_time_get: (id, prec, out) => { v().setBigUint64(out, BigInt(Date.now()) * 1000000n, true); return 0; },
      proc_exit: code => { throw new Error("swisseph exited with code " + code); },
      fd_prestat_get: (fd, buf) => {
        if (fd !== 3) return E.BADF;
        v().setUint8(buf, 0); v().setUint32(buf + 4, 1, true); return 0;
      },
      fd_prestat_dir_name: (fd, p, n) => { if (fd !== 3) return E.BADF; u8()[p] = 47; return 0; },
      fd_fdstat_get: (fd, buf) => {
        const d = v();
        const type = fd <= 2 ? 2 : fd === 3 ? 3 : fds.has(fd) ? 4 : -1;
        if (type < 0) return E.BADF;
        d.setUint8(buf, type); d.setUint16(buf + 2, 0, true);
        d.setBigUint64(buf + 8, 0xffffffffn, true); d.setBigUint64(buf + 16, 0xffffffffn, true);
        return 0;
      },
      fd_fdstat_set_flags: () => 0,
      fd_filestat_get: (fd, buf) => {
        const f = fds.get(fd); if (!f) return E.BADF;
        const d = v(); for (let i = 0; i < 64; i += 8) d.setBigUint64(buf + i, 0n, true);
        d.setUint8(buf + 16, 4); d.setBigUint64(buf + 32, BigInt(f.data.length), true); return 0;
      },
      path_open: (dirfd, dirflags, p, n, oflags, rb, ri, fdflags, out) => {
        if (dirfd !== 3) return E.BADF;
        const name = str(p, n).replace(/^\.?\/+/, "");
        if (oflags & 1) return E.ROFS; // O_CREAT: read-only file system
        const data = files.get(name);
        if (!data) return E.NOENT;
        const fd = nextFd++; fds.set(fd, { data, pos: 0 });
        v().setUint32(out, fd, true); return 0;
      },
      fd_read: (fd, iovs, n, out) => {
        const f = fds.get(fd); if (!f) return E.BADF;
        const d = v(), m = u8(); let total = 0;
        for (let i = 0; i < n; i++) {
          const ptr = d.getUint32(iovs + i * 8, true), len = d.getUint32(iovs + i * 8 + 4, true);
          const chunk = f.data.subarray(f.pos, Math.min(f.pos + len, f.data.length));
          m.set(chunk, ptr); f.pos += chunk.length; total += chunk.length;
          if (chunk.length < len) break;
        }
        d.setUint32(out, total, true); return 0;
      },
      fd_seek: (fd, off, whence, out) => {
        const f = fds.get(fd); if (!f) return E.BADF;
        const o = Number(off);
        const base = whence === 0 ? 0 : whence === 1 ? f.pos : f.data.length;
        const np = base + o; if (np < 0) return E.INVAL;
        f.pos = np; v().setBigUint64(out, BigInt(np), true); return 0;
      },
      fd_tell: (fd, out) => { const f = fds.get(fd); if (!f) return E.BADF; v().setBigUint64(out, BigInt(f.pos), true); return 0; },
      fd_close: fd => { fds.delete(fd); return 0; },
      fd_write: (fd, iovs, n, out) => {
        const d = v(); let total = 0, s = "";
        for (let i = 0; i < n; i++) {
          const ptr = d.getUint32(iovs + i * 8, true), len = d.getUint32(iovs + i * 8 + 4, true);
          s += str(ptr, len); total += len;
        }
        if (log && s.trim()) log(s.trim());
        d.setUint32(out, total, true); return 0;
      },
      random_get: (p, n) => { const m = u8(); for (let i = 0; i < n; i++) m[p + i] = (Math.random() * 256) | 0; return 0; },
      sched_yield: () => 0, poll_oneoff: () => E.NOSYS
    };
    return { imports: new Proxy(imp, { get: (t, k) => t[k] || (() => E.NOSYS) }), setMemory: m => { mem = m; } };
  }

  async function load(opts) {
    const files = new Map();
    for (const [name, data] of Object.entries(opts.files || {})) files.set(DIR + "/" + name, data instanceof Uint8Array ? data : new Uint8Array(data));
    const w = wasi(files, opts.log);
    const { instance } = await WebAssembly.instantiate(opts.wasm, { wasi_snapshot_preview1: w.imports });
    const x = instance.exports;
    w.setMemory(x.memory);
    if (x._initialize) x._initialize();
    const OUT = x.ss_out(), STR = x.ss_str(), IN = x.ss_in();
    const f64 = (i) => new Float64Array(x.memory.buffer, OUT, 128)[i];
    const outArr = (a, n) => Array.from(new Float64Array(x.memory.buffer, OUT + a * 8, n));
    const readStr = () => { const m = new Uint8Array(x.memory.buffer, STR, 512); let e = m.indexOf(0); return new TextDecoder().decode(m.subarray(0, e < 0 ? 512 : e)); };
    const writeIn = (s) => { const b = new TextEncoder().encode(s); const m = new Uint8Array(x.memory.buffer, IN, 512); m.fill(0); m.set(b.subarray(0, 511)); };
    const readIn = () => { const m = new Uint8Array(x.memory.buffer, IN, 512); let e = m.indexOf(0); return new TextDecoder().decode(m.subarray(0, e < 0 ? 512 : e)); };

    writeIn("/" + DIR); x.ss_set_ephe_path();
    let sid = -1;

    const api = {
      C,
      haveFiles: files.size > 0,
      version() { x.ss_version(); return readStr(); },
      /* Position of a body. Returns {lon, lat, dist, speedLon, speedLat, speedDist, flags, warn}. */
      calc(jdUT, body, flags) {
        const f = (flags == null ? C.FLG_SWIEPH | C.FLG_SPEED : flags);
        const r = x.ss_calc_ut(jdUT, body, f);
        const o = outArr(0, 6);
        if (r < 0) throw new Error(readStr() || "calc failed for body " + body);
        return { lon: o[0], lat: o[1], dist: o[2], speedLon: o[3], speedLat: o[4], speedDist: o[5], flags: r, warn: readStr() };
      },
      /* Houses. hsys is a one-letter code ("P", "K", "W", …). Returns cusps[1..n] (n = 12, or 36 for Gauquelin "G"),
         ascmc {asc, mc, armc, vertex, equAsc, coAscKoch, coAscMunkasey, polarAsc}, and their speeds. */
      houses(jdUT, lat, lon, hsys, flags) {
        const r = x.ss_houses(jdUT, flags || 0, lat, lon, hsys.charCodeAt(0));
        const n = hsys === "G" ? 36 : 12;
        const cusps = outArr(0, n + 1), am = outArr(40, 10), cs = outArr(50, n + 1), as = outArr(90, 10);
        return {
          ok: r >= 0, warn: readStr(), cusps, cuspSpeed: cs,
          asc: am[0], mc: am[1], armc: am[2], vertex: am[3], equAsc: am[4], coAscKoch: am[5], coAscMunkasey: am[6], polarAsc: am[7],
          ascSpeed: as[0], mcSpeed: as[1]
        };
      },
      housesArmc(armc, lat, eps, hsys) {
        const r = x.ss_houses_armc(armc, lat, eps, hsys.charCodeAt(0));
        const n = hsys === "G" ? 36 : 12;
        const am = outArr(40, 10);
        return { ok: r >= 0, cusps: outArr(0, n + 1), asc: am[0], mc: am[1], armc: am[2], vertex: am[3] };
      },
      housePos(armc, geolat, eps, hsys, lon, lat) { return x.ss_house_pos(armc, geolat, eps, hsys.charCodeAt(0), lon, lat || 0); },
      houseName(hsys) { x.ss_house_name(hsys.charCodeAt(0)); return readStr(); },
      setSidMode(mode) { if (mode !== sid) { x.ss_set_sid_mode(mode, 0, 0); sid = mode; } },
      ayanamsa(jdUT, mode, flags) { if (mode != null) api.setSidMode(mode); x.ss_ayanamsa(jdUT, flags == null ? C.FLG_SWIEPH : flags); return f64(0); },
      ayanamsaName(mode) { x.ss_ayanamsa_name(mode); return readStr(); },
      planetName(body) { x.ss_planet_name(body); return readStr(); },
      julday(y, m, d, h, greg) { return x.ss_julday(y, m, d, h, greg == null ? 1 : greg); },
      revjul(jd, greg) { x.ss_revjul(jd, greg == null ? 1 : greg); const o = outArr(0, 4); return { y: o[0], m: o[1], d: o[2], h: o[3] }; },
      /* UTC civil date → {tt, ut} Julian days (leap seconds handled by the Swiss Ephemeris). */
      utcToJd(y, m, d, h, mi, s, greg) {
        const r = x.ss_utc_to_jd(y, m, d, h, mi, s, greg == null ? 1 : greg);
        const o = outArr(0, 2);
        return { ok: r >= 0, tt: o[0], ut: o[1], warn: readStr() };
      },
      deltaT(jdUT) { return x.ss_deltat(jdUT); },
      sidTime(jdUT) { return x.ss_sidtime(jdUT); },
      setTopo(lon, lat, alt) { x.ss_set_topo(lon, lat, alt || 0); },
      /* Fixed star by name ("Regulus", ",alLeo"). */
      fixstar(name, jdUT, flags) {
        writeIn(name);
        const r = x.ss_fixstar(jdUT, flags == null ? C.FLG_SWIEPH : flags);
        if (r < 0) return null;
        const o = outArr(0, 6);
        return { name: readIn(), lon: o[0], lat: o[1], dist: o[2], speedLon: o[3] };
      },
      /* Obliquity of the ecliptic (true) at jdUT, from the ECL_NUT pseudo-body (-1). */
      obliquity(jdUT) { x.ss_calc_ut(jdUT, -1, 0); return outArr(0, 6)[0]; },
      close() { x.ss_close(); }
    };
    return api;
  }

  const SWE = { C, load };
  if (typeof module !== "undefined" && module.exports) module.exports = SWE;
  else root.SWE = SWE;
})(typeof window !== "undefined" ? window : globalThis);
