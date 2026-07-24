const CACHE = 'finance-v16'

// SPA：五個頁面路徑都由 index.html 提供
// 預快取用 '/' 和 '/add'（.html 路徑會被 assets 307 轉址，fetch 結果 redirected 無法入快取）
const PAGES = ['/', '/add']
const SPA_PATHS = new Set(['/', '/index.html', '/transactions.html', '/investments.html', '/report.html', '/reconcile.html'])

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(PAGES.map(url =>
        fetch(url).then(r => {
          if (!r.ok || r.redirected) return
          const keys = url === '/' ? ['/index.html'] : [url, url + '.html']
          return Promise.all(keys.map(k => cache.put(k, r.clone())))
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
    // SPA 頁面路徑一律對應 /index.html 的快取
    const cacheKey = SPA_PATHS.has(url.pathname) ? '/index.html' : url.pathname
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(cacheKey)

        // 背景更新（存回統一的 cacheKey）
        const revalidate = fetch(request).then(r => {
          if (r.ok && !r.redirected) cache.put(cacheKey, r.clone())
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
