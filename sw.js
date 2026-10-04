/* Bản lưu để mở app khi không có mạng.
   Ưu tiên mạng: có mạng thì luôn lấy bản mới nhất; mất mạng (hoặc mạng quá chậm) thì dùng bản đã lưu.
   Chỉ xử lý file cùng địa chỉ với app; Firebase và các nguồn bên ngoài không qua đây. */
const CACHE = 'tkmb-flashcard-v1';
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>Promise.all(['./', 'apple-touch-icon.png'].map(u=>c.add(u).catch(()=>{}))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k !== CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(networkFirst(req));
});

async function networkFirst(req){
  const cache = await caches.open(CACHE);
  try{
    const ctrl = new AbortController();
    const timer = setTimeout(()=>ctrl.abort(), NETWORK_TIMEOUT_MS);
    const res = await fetch(req, {signal: ctrl.signal});
    clearTimeout(timer);
    if(res.ok) cache.put(req, res.clone());
    return res;
  }catch(err){
    const hit = (await cache.match(req, {ignoreSearch: true})) || (req.mode === 'navigate' ? await cache.match('./') : null);
    return hit || Response.error();
  }
}
