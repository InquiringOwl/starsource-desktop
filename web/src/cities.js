/* Offline city search for the profile creator and Settings → home. Data: app/data/cities.tsv, 135,000 places with
   1,000+ people from GeoNames (geonames.org, CC BY 4.0) via the all-the-cities package; US state names where codes match.
   Loaded on first use. Cities.attach(input, onPick) adds a drop-down; onPick({name, cc, region, country, lat, lon, tz, label}). */
(function () {
  "use strict";
  let rows = null, loading = null;
  const fold = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  let DN = null; try { DN = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) {}
  const country = cc => { try { return (DN && DN.of(cc)) || cc; } catch (e) { return cc; } };
  function load() {
    if (rows) return Promise.resolve(rows);
    if (!loading) loading = fetch("data/cities.tsv").then(r => { if (!r.ok) throw new Error("city list missing"); return r.text(); }).then(t => {
      rows = [];
      for (const line of t.split("\n")) {
        if (!line || line[0] === "#") continue;
        const [name, cc, region, lat, lon, pop] = line.split("\t");
        rows.push({ name, cc, region, lat: +lat, lon: +lon, pop: +pop, f: fold(name) });
      }
      return rows;
    });
    return loading;
  }
  /* "paris", "paris, fr", "springfield, illinois", "san jose costa rica" → best matches, biggest first */
  function search(q, n) {
    if (!rows) return [];
    const parts = String(q).split(",").map(fold).filter(Boolean); if (!parts.length) return [];
    const head = parts[0], rest = parts.slice(1).join(" ");
    const out = [];
    for (const r of rows) {
      let score;
      if (r.f === head) score = 3; else if (r.f.startsWith(head)) score = 2; else if (head.length > 3 && r.f.includes(" " + head)) score = 1; else continue;
      if (rest) {
        const hay = fold(r.region + " " + r.cc + " " + country(r.cc));
        if (!rest.split(" ").every(w => hay.includes(w))) continue;
      }
      out.push({ r, score });
      if (out.length > 4000) break;
    }
    out.sort((a, b) => b.score - a.score || b.r.pop - a.r.pop);
    return out.slice(0, n || 10).map(x => pick(x.r));
  }
  function pick(r) {
    let tz = ""; try { tz = window.tzlookup(r.lat, r.lon); } catch (e) {}
    const ctry = country(r.cc);
    return { name: r.name, cc: r.cc, region: r.region, country: ctry, lat: r.lat, lon: r.lon, pop: r.pop, tz, label: [r.name, r.region, ctry].filter(Boolean).join(", ") };
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function attach(input, onPick) {
    const box = document.createElement("div"); box.className = "city-dd"; box.hidden = true;
    input.parentElement.style.position = "relative"; input.parentElement.appendChild(box);
    let list = [], idx = -1, t = 0;
    const render = () => {
      box.innerHTML = list.length ? list.map((c, i) => `<button type="button" class="${i === idx ? "on" : ""}" data-i="${i}"><b>${esc(c.name)}</b><span>${esc([c.region, c.country].filter(Boolean).join(", "))}</span><small>${Math.abs(c.lat).toFixed(2)}°${c.lat >= 0 ? "N" : "S"} ${Math.abs(c.lon).toFixed(2)}°${c.lon >= 0 ? "E" : "W"} · ${esc(c.tz)}</small></button>`).join("") : `<div class="none">${rows ? "No match. Type the coordinates below instead." : "Loading the city list…"}</div>`;
      box.hidden = !input.value.trim();
    };
    const run = () => { load().then(() => { list = search(input.value, 10); idx = list.length ? 0 : -1; render(); }).catch(() => { box.innerHTML = '<div class="none">City list unavailable.</div>'; box.hidden = false; }); };
    input.addEventListener("input", () => { clearTimeout(t); if (!input.value.trim()) { box.hidden = true; return; } if (!rows) render(); t = setTimeout(run, 120); });
    input.addEventListener("keydown", e => {
      if (box.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); idx = Math.min(list.length - 1, idx + 1); render(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); idx = Math.max(0, idx - 1); render(); }
      else if (e.key === "Enter" && idx >= 0) { e.preventDefault(); choose(idx); }
      else if (e.key === "Escape") { e.stopPropagation(); box.hidden = true; }
    });
    box.addEventListener("mousedown", e => { const b = e.target.closest("[data-i]"); if (b) { e.preventDefault(); choose(+b.dataset.i); } });
    input.addEventListener("blur", () => setTimeout(() => { box.hidden = true; }, 150));
    function choose(i) { const c = list[i]; if (!c) return; input.value = c.label; box.hidden = true; onPick(c); }
  }
  window.Cities = { load, search, attach, fold };
})();
