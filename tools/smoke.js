// Headless Chromium drives every screen and chart option at desktop and phone width; any JS error fails.
// node tools/smoke.js   (needs playwright; CI installs it, see .github/workflows/check.yml)
const { chromium } = require('playwright');
const { server } = require('./serve.js');
const PROFILES = [
  { id: 't1', first: 'Ada', last: 'Example', birth: { y: 1990, mo: 5, d: 15, h: 10, mi: 30, s: 0 }, birthLat: 40.7128, birthLon: -74.006, birthTz: 'America/New_York', birthOffset: null, birthPlace: 'New York', curLat: 34.0522, curLon: -118.2437, curTz: 'America/Los_Angeles', curPlace: 'Los Angeles' },
  { id: 't2', first: 'Ben', last: 'Sample', birth: { y: 1985, mo: 3, d: 1, h: 6, mi: 0, s: 0 }, birthLat: 51.5, birthLon: -0.12, birthTz: 'Europe/London', birthPlace: 'London' },
  { id: 't3', first: 'Polar', last: 'Case', birth: { y: 2001, mo: 12, d: 21, h: 12, mi: 0, s: 30 }, birthLat: 69.65, birthLon: 18.96, birthTz: 'Europe/Oslo', birthPlace: 'Tromsø' }
];
(async () => {
  const port = 8700 + Math.floor(Math.random() * 100);
  await new Promise(r => server.listen(port, r));
  const b = await chromium.launch(); let fails = 0;
  for (const [W, H] of [[1600, 980], [1280, 800], [420, 900]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H } }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(`http://localhost:${port}/#menu`); await p.waitForTimeout(600);
    await p.evaluate(P => { localStorage.clear(); localStorage.setItem('starsource.profiles', JSON.stringify(P)); }, PROFILES);
    await p.reload(); await p.waitForTimeout(700);
    const step = async (name, fn) => { try { await p.evaluate(fn); await p.waitForTimeout(120); } catch (e) { errs.push(name + ': ' + e.message); } };
    await step('menu', () => StarApp.go('menu'));
    await step('profiles', () => StarApp.go('profiles'));
    await step('chart', () => StarApp.go('chart'));
    for (const t of ['natal', 'transit', 'progressed', 'composite', 'synastry', 'solararc', 'solarreturn', 'lunarreturn', 'harmonic']) {
      await step('type ' + t, `document.querySelector('[data-type="${t}"]').click()`);
      for (const h of ['P', 'K', 'W', 'R', 'C', 'G', 'B', 'X', 'H', 'I', 'Y']) await step('hsys ' + h, `(() => { const s = document.querySelector('[data-k="hsys"]'); s.value = '${h}'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await step('sidereal', `document.querySelector('.seg [data-v="sidereal"]').click()`);
      await step('ayanamsa', `(() => { const s = document.querySelector('[data-k="ayanamsa"]'); s.value = '27'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      await step('tropical', `document.querySelector('.seg [data-v="tropical"]').click()`);
      await step('all aspects', `document.querySelector('[data-preset="all"]').click()`);
      await step('all bodies', `document.querySelectorAll('.tg:not(.on)').forEach(x => x.click())`);
      await step('select planet', `(() => { const g = document.querySelector('.planet'); g && g.dispatchEvent(new MouseEvent('click', { bubbles: true })); })()`);
      await step('topo', `document.querySelector('.seg [data-v="topo"]').click()`);
      await step('rotate', `StarApp.act('rotate')`);
      await step('glyphs', `StarApp.act('toggle-glyphs')`);
      await step('step time', `document.querySelector('[data-step="h"]') && document.querySelector('[data-step="h"]').click()`);
      await step('geo', `document.querySelector('.seg [data-v="geo"]').click()`);
      await step('hide sign', `document.querySelector('[data-sign="3"]').click()`);
      await step('hide layer', `document.querySelector('[data-layer="degrees"]').click()`);
      await step('hide body (eye)', `document.querySelector('[data-eye="moon"]').click()`);
      await step('right-click hide', `(() => { const g = document.querySelector('.planet'); g && g.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); })()`);
      await step('show all', `StarApp.act('show-all')`);
      await step('check no hidden', `(() => { if (StarApp.state.slots[StarApp.state.active].bodies.length !== 18) throw new Error('show-all did not restore bodies'); })()`);
    }
    await step('polar profile', `(() => { const s = document.querySelector('[data-k="profile"]'); s.value = 't3'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await step('natal polar', `document.querySelector('[data-type="natal"]').click()`);
    await step('add slot', `StarApp.act('add-slot')`); await step('add slot', `StarApp.act('add-slot')`); await step('add slot', `StarApp.act('add-slot')`);
    await step('slot 2', `document.querySelector('[data-slot="1"]').click()`);
    await step('play', `StarApp.act('play')`); await p.waitForTimeout(400); await step('pause', `StarApp.act('play')`);
    await step('sky profile', `(() => { const s = document.querySelector('[data-k="profile"]'); s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await step('profile modal', `StarApp.openProfile('t1')`); await step('close modal', `document.querySelector('[data-close]').click()`);
    await step('new profile', `StarApp.openProfile(null)`);
    await step('fill', `(() => { const f = (k, v) => { const i = document.getElementById('pf-' + k); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }; f('first', 'Cara'); f('blat', '35°41′22″N'); f('blon', '139 41 30 E'); f('y', '1975'); })()`);
    await step('save', `document.querySelector('[data-act="save-profile"]').click()`);
    for (const t of ['appearance', 'display', 'defaults', 'updates', 'about']) await step('settings ' + t, `StarSettings.open('${t}')`);
    await step('theme tab', `StarSettings.open('appearance')`);
    await step('theme', `document.querySelector('[data-theme="kharak"]').click()`);
    await step('close settings', `StarSettings.close()`);
    await step('snapshot', `StarApp.act('snapshot')`);
    await step('harmonics lab', `StarApp.go('harmonics')`);
    for (const n of ['12', '90', '180']) await step('lab N ' + n, `document.querySelector('.hlab .seg [data-v="${n}"]').click()`);
    await step('lab bar', `document.querySelector('.hlab .bar[data-h="7"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
    await step('lab synth', `document.querySelector('.hlab [data-v="synth"]').click()`);
    await step('lab profile', `(() => { const s = document.querySelector('.hlab [data-l="profile"]'); s.value = 't2'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await step('lab check', `(() => { if (StarLab.state.h !== 7) throw new Error('harmonic not selected'); if (!document.querySelector('#lab-wheel svg')) throw new Error('no wheel'); })()`);
    await step('city modal', `StarApp.openProfile(null)`);
    await step('city type', `(() => { const i = document.getElementById('pf-bcity'); i.value = 'springfield, illinois'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await p.waitForTimeout(1500);
    await step('city pick', `(() => { const b = document.querySelector('.city-dd [data-i="0"]'); if (!b) throw new Error('no city results'); b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); if (document.getElementById('pf-btz').value !== 'America/Chicago') throw new Error('tz ' + document.getElementById('pf-btz').value); if (!/39°4/.test(document.getElementById('pf-blat').value)) throw new Error('lat ' + document.getElementById('pf-blat').value); })()`);
    await step('close city modal', `document.querySelector('[data-close]').click()`);
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('starsource.profiles')).length);
    if (saved !== 4) errs.push('profile creator did not save (have ' + saved + ')');
    const tzOk = await p.evaluate(() => JSON.parse(localStorage.getItem('starsource.profiles'))[3].birthTz);
    if (tzOk !== 'Asia/Tokyo') errs.push('time zone from coordinates: ' + tzOk);
    console.log(`${W}px: ${errs.length ? '✗ ' + errs.length + ' errors\n  ' + errs.slice(0, 12).join('\n  ') : '✓ no errors'}`);
    fails += errs.length; await ctx.close();
  }
  await b.close(); server.close();
  process.exit(fails ? 1 : 0);
})();
