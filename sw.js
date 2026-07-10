// 簡易CAD Service Worker:頁面走網路優先(保持更新),資產(wasm/圖示)快取優先(離線可用)
// 改動 libredwg/ 或 icons/ 檔案時,請把 CACHE 版本字串 +1,舊快取會自動清掉
const CACHE = "cad-v1";

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(["./", "./index.html", "./manifest.webmanifest"]).catch(() => { })
    )
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== location.origin) return;

  // 頁面:網路優先,離線時退回快取
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    e.respondWith(
      fetch(req).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
        return r;
      }).catch(() =>
        caches.match(req).then(r => r || caches.match("./index.html"))
      )
    );
    return;
  }
  // 其他資產:快取優先,首次抓到就存
  e.respondWith(
    caches.match(req).then(hit =>
      hit || fetch(req).then(r => {
        if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
        return r;
      })
    )
  );
});
