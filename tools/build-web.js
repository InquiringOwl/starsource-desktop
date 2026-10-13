// Builds app/index.html (the page Electron loads from starsource://app/) from web/: CSS inlined, scripts inlined in order.
// Engine (app/engine/swisseph.wasm), data files (app/ephe/) and fonts (app/fonts/) are served next to it.
// Fails on any syntax error so a broken script never ships.
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..');
const JS = ['web/pwa/pwa.js', 'web/engine/tz-lookup.js', 'web/engine/swe.js', 'web/src/astro-data.js', 'web/src/astro.js', 'web/src/techniques.js', 'web/src/store.js',
  'web/src/wheel.js', 'web/src/starfield.js', 'web/src/settings.js', 'web/src/lab.js', 'web/src/cities.js', 'web/src/app.js'];
const CSS = ['web/src/style.css'];
let ok = true;
const scripts = JS.map(f => {
  const src = fs.readFileSync(path.join(R, f), 'utf8');
  try { new vm.Script(src, { filename: f }); } catch (e) { ok = false; console.error('✗ ' + f + ': ' + e.message); }
  return `<script>/* ${f} */\n${src.replace(/<\/script/gi, '<\\/script')}\n</script>`;
}).join('\n');
if (!ok) process.exit(1);
const css = CSS.map(f => fs.readFileSync(path.join(R, f), 'utf8')).join('\n');
const pkg = JSON.parse(fs.readFileSync(path.join(R, 'package.json'), 'utf8'));
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#05070C">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="StarSource">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-180.png">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'">
<title>StarSource</title>
<meta name="generator" content="StarSource ${pkg.version}">
<link rel="stylesheet" href="fonts/fonts.css">
<style>${css}</style>
</head><body>
<canvas id="sky" aria-hidden="true"></canvas>
<div id="app"></div>
${scripts}
</body></html>
`;
fs.writeFileSync(path.join(R, 'app', 'index.html'), html);
// PWA: manifest + service worker with the precache list (everything in app/ except the 5 MB city list, cached on first use)
const walk = d => fs.readdirSync(path.join(R, 'app', d)).flatMap(f => { const rel = d ? d + '/' + f : f; return fs.statSync(path.join(R, 'app', rel)).isDirectory() ? walk(rel) : [rel]; });
const files = ['./'].concat(walk('').filter(f => !/^(sw\.js|data\/|.*\.DS_Store$)/.test(f)));
fs.writeFileSync(path.join(R, 'app', 'sw.js'), fs.readFileSync(path.join(R, 'web/pwa/sw.js'), 'utf8').replace('__VERSION__', pkg.version + '-' + require('crypto').createHash('sha1').update(html).digest('hex').slice(0, 8)).replace('__FILES__', JSON.stringify(files)));
fs.writeFileSync(path.join(R, 'app', 'manifest.webmanifest'), JSON.stringify({
  name: 'StarSource', short_name: 'StarSource', description: pkg.description, id: './', start_url: './#menu', scope: './',
  display: 'standalone', orientation: 'any', background_color: '#05070C', theme_color: '#05070C', categories: ['education', 'lifestyle'],
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
}, null, 2));
console.log(`✓ app/index.html ${(html.length / 1024).toFixed(0)} KB (StarSource ${pkg.version})`);
