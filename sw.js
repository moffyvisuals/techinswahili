// Tech In Swahili service worker (v52): the app opens from the phone's own copy instantly,
// and checks for a newer copy in the background (it shows on the next open).
const V="tis-shell-v74",SB="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js",SHELL=["./","index.html","config.js","manifest.webmanifest","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>Promise.all([...SHELL.map(u=>c.add(u).catch(()=>{})),c.add(SB).catch(()=>{})])).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
async function tell(){const l=await self.clients.matchAll();l.forEach(c=>c.postMessage("tis-updated"))}
// answer from the saved copy at once; fetch a fresh copy behind the scenes
async function swr(e,key,url){const c=await caches.open(V),m=await c.match(key,{ignoreSearch:true});
const net=fetch(url,{cache:"no-cache"}).then(async res=>{if(res.ok&&!res.redirected){const old=m&&m.headers.get("etag"),nw=res.headers.get("etag");await c.put(key,res.clone());if(m&&old&&nw&&old!==nw)tell()}return res}).catch(()=>null);
if(m){e.waitUntil(net);return m}
return(await net)||Response.error()}
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);
if(r.url===SB){e.respondWith(caches.match(SB).then(m=>m||fetch(r)));return}
if(u.origin!==location.origin)return;
if(r.mode==="navigate"){
// shared link /a/<id> or /d/<id>: send the person straight into the app, no network round trip
const m=u.pathname.match(/^\/([ad])\/([0-9a-fA-F-]{8,40})\/?$/);
if(m){e.respondWith(Response.redirect(u.origin+"/#/"+(m[1]==="a"?"article":"disc")+"/"+m[2],302));return}
if(u.pathname==="/"||u.pathname==="/index.html"){e.respondWith(swr(e,"./","./"));return}
return}
const p=u.pathname.replace(/^\//,"");
if(["config.js","manifest.webmanifest","icon-192.png","icon-512.png"].includes(p))e.respondWith(swr(e,p,p))});
