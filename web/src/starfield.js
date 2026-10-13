/* Procedural space backdrop on <canvas id="sky">: nebula clouds in the theme's colours, three layers of stars, slow twinkle.
   Original art (no game assets). StarSky.setNebula([c1, c2], bg), StarSky.enable(on, animate). */
(function () {
  "use strict";
  const cv = document.getElementById("sky"); if (!cv) return;
  const g = cv.getContext("2d");
  let neb = ["#1B3A66", "#3A2466"], bg = "#05070C", on = true, anim = true, stars = [], W = 0, H = 0, seed = 7, base = null;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  function build() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.width = Math.round(innerWidth * dpr); H = cv.height = Math.round(innerHeight * dpr);
    cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
    seed = 7; stars = [];
    const n = Math.round(W * H / 2600);
    for (let i = 0; i < n; i++) stars.push({ x: rnd() * W, y: rnd() * H, r: (rnd() ** 3) * 1.6 * dpr + .3 * dpr, a: .25 + rnd() * .75, p: rnd() * 6.28, s: .3 + rnd() * 1.2, c: rnd() < .12 ? "#FFD9A0" : rnd() < .2 ? "#A9D8FF" : "#FFFFFF" });
    // static layer: background + nebula + dust band
    base = document.createElement("canvas"); base.width = W; base.height = H;
    const b = base.getContext("2d");
    b.fillStyle = bg; b.fillRect(0, 0, W, H);
    const blob = (x, y, r, col, a) => { const gr = b.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, hexA(col, a)); gr.addColorStop(1, hexA(col, 0)); b.fillStyle = gr; b.fillRect(0, 0, W, H); };
    seed = 99;
    for (let i = 0; i < 9; i++) blob(W * (.15 + rnd() * .8), H * (.05 + rnd() * .9), Math.max(W, H) * (.18 + rnd() * .3), neb[i % 2], .10 + rnd() * .14);
    // a faint galactic band
    b.save(); b.translate(W / 2, H / 2); b.rotate(-.42);
    const band = b.createLinearGradient(0, -H * .25, 0, H * .25); band.addColorStop(0, "rgba(255,255,255,0)"); band.addColorStop(.5, "rgba(220,228,255,.05)"); band.addColorStop(1, "rgba(255,255,255,0)");
    b.fillStyle = band; b.fillRect(-W, -H * .25, W * 2, H * .5); b.restore();
    const vg = b.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.55)");
    b.fillStyle = vg; b.fillRect(0, 0, W, H);
    draw(0);
  }
  function hexA(h, a) { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return `rgba(${v.join(",")},${a})`; }
  function draw(t) {
    if (!base) return;
    g.drawImage(base, 0, 0);
    if (!on) return;
    for (const s of stars) {
      const tw = anim ? .75 + .25 * Math.sin(t / 1000 * s.s + s.p) : 1;
      g.globalAlpha = s.a * tw; g.fillStyle = s.c;
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
  }
  let last = 0;
  function loop(t) { if (anim && on && !document.hidden && t - last > 66) { draw(t); last = t; } requestAnimationFrame(loop); }
  addEventListener("resize", () => { clearTimeout(build.t); build.t = setTimeout(build, 120); });
  window.StarSky = {
    setNebula(n, b) { neb = n; bg = b; build(); },
    enable(o, a) { on = o; anim = a; draw(performance.now()); }
  };
  build(); requestAnimationFrame(loop);
})();
