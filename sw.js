// PWA SW v9: bump cache name to ensure update
const CACHE_NAME='talk-request-v9';
const ASSETS=['./','./index.html','./style.css','./script.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS))); self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null)))); self.clients.claim();});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(res=>{const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put('./',copy)); return res;})
      .catch(()=>caches.match('./index.html')));
  } else {
    e.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{
      if(req.method==='GET' && res.ok){const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req,copy));}
      return res;
    })));
  }
});