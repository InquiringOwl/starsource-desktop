// Screenshots for review: node tools/snap.js <hash> [more…]   env W, H, OUT (default /tmp/ss-snap), SETUP (JS run before shots)
const { chromium } = require('playwright');
const { server } = require('./serve.js');
(async () => {
  const port = 8800 + Math.floor(Math.random() * 100);
  await new Promise(r => server.listen(port, r));
  const b = await chromium.launch(); const W = +process.env.W || 1600, H = +process.env.H || 980;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const out = process.env.OUT || '/tmp/ss-snap'; require('fs').mkdirSync(out, { recursive: true });
  await p.goto(`http://localhost:${port}/#menu`); await p.waitForTimeout(800);
  if (process.env.SETUP) { await p.evaluate(process.env.SETUP); await p.waitForTimeout(400); }
  for (const h of process.argv.slice(2)) {
    if (h.startsWith('js:')) { await p.evaluate(h.slice(3)); await p.waitForTimeout(500); continue; }
    if (h.startsWith('shot:')) { const f = `${out}/${h.slice(5)}-${W}.png`; await p.screenshot({ path: f }); console.log(f); continue; }
    await p.evaluate(x => { location.hash = x; StarApp.go(x.replace('#', '')); }, h); await p.waitForTimeout(900);
    const f = `${out}/${h.replace(/[^a-z0-9]/gi, '')}-${W}.png`; await p.screenshot({ path: f }); console.log(f);
  }
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
  await b.close(); server.close();
})();
