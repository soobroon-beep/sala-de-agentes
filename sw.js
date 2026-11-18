/* SALA DE AGENTES · funciona como app instalada (PWA). Red primero: siempre la versión más nueva; sin conexión, la copia guardada. */
const CACHE = 'sala-v3', SHELL = ['./', 'index.html', 'css/sala.css', 'js/rooms.js', 'js/engine.js', 'js/cloud.js', 'js/ai.js', 'js/tools.js', 'js/scene.js', 'js/memoria.js', 'js/app.js', 'vortex/llm.js', 'vortex/botlab-engine.js', 'vortex/nova-nexus.js', 'manifest.webmanifest', 'icons/app-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
