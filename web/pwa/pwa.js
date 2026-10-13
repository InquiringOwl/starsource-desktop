/* PWA glue: registers the service worker when StarSource runs as a web page (not Electron, not the native phone app),
   and reports update state to Settings → Updates through the same shape the desktop updater uses. */
(function () {
  "use strict";
  const isDesktop = !!window.starsourceDesktop, isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const P = window.StarPWA = { kind: isDesktop ? "desktop" : isNative ? "native" : "web", state: { status: "current" }, waiting: null, listeners: [],
    onUpdate(cb) { this.listeners.push(cb); }, set(s) { this.state = s; this.listeners.forEach(f => f(s)); },
    apply() { if (this.waiting) { this.waiting.postMessage("skip-waiting"); } else location.reload(); },
    check() { if (this.reg) { this.set({ status: "checking" }); this.reg.update().then(() => { if (!this.waiting) this.set({ status: "current" }); }).catch(() => this.set({ status: "error", message: "Offline" })); } },
    installable: null, install() { if (this.installable) { this.installable.prompt(); this.installable = null; } } };
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); P.installable = e; });
  if (P.kind !== "web" || !("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol) || location.hostname === "localhost" && !/[?&]sw\b/.test(location.search)) return;
  navigator.serviceWorker.register("sw.js").then(reg => {
    P.reg = reg;
    const watch = w => w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) { P.waiting = w; P.set({ status: "ready", version: "new" }); } });
    if (reg.waiting && navigator.serviceWorker.controller) { P.waiting = reg.waiting; P.set({ status: "ready", version: "new" }); }
    reg.addEventListener("updatefound", () => watch(reg.installing));
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloading) { reloading = true; location.reload(); } });
})();
