const CACHE = 'finance-v10'

const PAGES = ['/index.html', '/transactions.html', '/investments.html', '/report.html', '/reconcile.html', '/add.html']

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(PAGES.map(url =>
        fetch(url).then(r => {
          if (r.ok && !r.redirected) cache.put(url, r)
        }).catch(() => {})
      ))
    )
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname === '/sw.js') return

  // 帶 ?v= 版本號的 CSS/JS：cache-first
  if (url.search.includes('v=')) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(r => {
          if (r.ok) caches.open(CACHE).then(c => c.put(request, r.clone()))
          return r
        })
      })
    )
    return
  }

  // HTML navigation：cache-first，背景更新
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        // 嘗試精確命中，再試 pathname（處理 / vs /index.html）
        let cached = await cache.match(request)
        if (!cached && url.pathname === '/') cached = await cache.match('/index.html')
        if (!cached) cached = await cache.match(url.pathname)

        // 背景更新
        const revalidate = fetch(request).then(r => {
          if (r.ok && !r.redirected) cache.put(request, r.clone())
          return r
        }).catch(() => null)

        return cached || revalidate
      })
    )
    return
  }

  // 其他靜態資源：stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(request).then(cached => {
        const fetchAndCache = fetch(request).then(r => {
          if (r.ok) cache.put(request, r.clone())
          return r
        }).catch(() => cached)
        return cached || fetchAndCache
      })
    )
  )
})
