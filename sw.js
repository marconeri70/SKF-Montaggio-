const CACHE = 'skf5s-montaggio-v3';
const ASSETS = [
  './','./index.html','./checklist.html',
  './style.css','./app.js','./checklist.js',
  './manifest.json','./assets/skf-192.png','./assets/skf-512.png','./assets/5s-hero.png'
];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
