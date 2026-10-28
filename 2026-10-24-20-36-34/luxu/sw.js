var CACHE = 'luxu-v16';
var ASSETS = [
  './', './index.html', './app.css', './store.js', './charts.js', './views.js', './app.js',
  './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'
];

/* 代码类资源走「网络优先」：联网时永远拿最新代码，断网时用缓存兜底。
   图标走「缓存优先」：省流量、秒开。 */
function isCode(url) {
  return /\.(html|js|css|webmanifest)$/.test(url.pathname) || url.pathname.slice(-1) === '/';
}

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ASSETS.map(function (u) {
      return c.add(u).catch(function () { return null; });
    }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  function put(res) {
    if (res && res.status === 200 && res.type === 'basic') {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
    }
    return res;
  }
  function fromCache() {
    return caches.match(req).then(function (hit) {
      if (hit) return hit;
      if (req.mode === 'navigate') return caches.match('./index.html');
      return new Response('', { status: 504 });
    });
  }

  if (isCode(url)) {
    e.respondWith(fetch(req).then(put).catch(fromCache));
    return;
  }
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(put).catch(function () { return new Response('', { status: 504 }); });
    })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
