const CACHE='__CACHE__',PREFIX='ruins-arcade-';
// 預快取完成即啟用：不強制重新整理進行中的遊戲，下一次導覽／重新整理即取得新版
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);const root=new URL('./',self.registration.scope);const manifest=await fetch(new URL('asset-list.json',root),{cache:'reload'});if(!manifest.ok)throw new Error('asset-list '+manifest.status);const files=await manifest.json();for(const path of files){const url=new URL(path,root);const res=await fetch(url,{cache:'reload'});if(!res.ok)throw new Error(url+' '+res.status);await cache.put(url,res);}await self.skipWaiting();})());});
// 同一 origin 由多個 Pages 專案共用，只清除本遊戲的舊版快取
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;event.respondWith((async()=>{const hit=await (await caches.open(CACHE)).match(req,{ignoreSearch:true});return hit||fetch(req);})());});
