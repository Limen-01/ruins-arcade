const CACHE='__CACHE__';
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);const root=new URL('./',self.registration.scope);const manifest=await fetch(new URL('asset-list.json',root));const files=await manifest.json();await cache.addAll(files.map(path=>new URL(path,root)));})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;event.respondWith((async()=>{const hit=await caches.match(req,{ignoreSearch:true});return hit||fetch(req);})());});
