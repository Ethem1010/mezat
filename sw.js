// Basit çevrimdışı önbellek: oyun bir kez açıldıktan sonra internetsiz de çalışır.
// Kategori veya kod değiştirince SURUM'u bir artır ki telefonlar yeni dosyaları alsın.
const SURUM = "mezat-v7";
const CEKIRDEK = ["./", "index.html", "css/style.css", "js/engine.js", "js/temalar.js", "js/app.js", "data/kategoriler.json", "icon.svg", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SURUM).then((c) => c.addAll(CEKIRDEK)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SURUM).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(SURUM).then((c) => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
