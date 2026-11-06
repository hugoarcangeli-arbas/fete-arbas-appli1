const VERSION = "5f0f6de515";
const CACHE = "fete-arbas-" + VERSION;
const CORE = ["./", "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/maskable-512.png", "manifest.webmanifest"];    // indispensables : la page, le manifeste, les icônes
const MEDIA = ["audio/acclame.mp3", "audio/accueil.mp3", "audio/bombe-boum.mp3", "audio/bombe-tictac.mp3", "audio/brebis.mp3", "audio/clac1.wav", "audio/clac2.wav", "audio/decu.mp3", "audio/guepes1.mp3", "audio/guepes2.mp3", "audio/guepes3.mp3", "audio/guepes4.mp3", "audio/guepes5.mp3", "audio/moyen.mp3", "audio/parfait.mp3", "audio/petanque.mp3", "audio/tapas.mp3", "audio/tour.mp3", "images/allemagne.webp", "images/churchill.webp", "images/dos-carte.webp", "images/merch-bob.webp", "images/merch-short.webp", "images/neptune.webp", "images/neville.webp", "images/rolling-stones.webp"];  // sons et images : un fichier qui échoue n'empêche pas les autres
// Safari refuse une réponse « redirigée » pour ouvrir une page : on en refait une copie propre
const clean = (r) => r.redirected ? r.blob().then((b) => new Response(b, { status: r.status, statusText: r.statusText, headers: r.headers })) : r;
self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const f of CORE) { const r = await fetch(f, { cache: "reload" }); if (!r.ok) throw new Error(f); await c.put(f === "./" ? "./" : f, await clean(r)); }
    await c.put("index.html", (await c.match("./")).clone());
    let miss = 0;
    for (const f of MEDIA) { try { const r = await fetch(f, { cache: "reload" }); if (r.ok) await c.put(f, await clean(r)); else miss++; } catch (err) { miss++; } }
    await c.put("__pret__", new Response(String(miss)));   // repère lu par la page : tout est en mémoire
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("fete-arbas-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return;   // réservé aux futurs services en ligne (scores, multijoueur) : jamais mis en cache
  if (url.origin !== location.origin) {           // polices Google : copie gardée après la première visite
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => { c.put(req, r.clone()); return r; }))));
    return;
  }
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html")) {
    e.respondWith((async () => {
      try {
        const r = await clean(await fetch(req));
        if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put("./", copy)); }
        return r;
      } catch (err) {
        return (await caches.match("./")) || (await caches.match("index.html")) || new Response("Hors connexion : rouvre l'appli avec du réseau une première fois.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
