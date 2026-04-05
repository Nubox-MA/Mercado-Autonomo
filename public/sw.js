// Service Worker para PWA
const CACHE_NAME = 'nubox-v1'
const urlsToCache = [
  '/',
  '/select-condominium',
  '/favorites',
  '/cart',
  '/offline-data.json'
]

// Instalar Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto')
        return cache.addAll(urlsToCache)
      })
  )
})

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Nunca interceptar/caching para métodos diferentes de GET
  // e para chamadas de API (evita erros em POST/stream)
  const isApi = url.pathname.startsWith('/api/')
  if (req.method !== 'GET' || isApi) {
    return // deixa seguir normal (network)
  }

  event.respondWith(
    caches.match(req)
      .then((response) => {
        if (response) return response
        return fetch(req).then((netRes) => {
          // Só cacheia respostas GET válidas e do mesmo domínio
          if (!netRes || netRes.status !== 200 || netRes.type !== 'basic') return netRes
          const resClone = netRes.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone)
          })
          return netRes
        })
      })
      .catch(() => {
        if (req.destination === 'document') {
          return caches.match('/offline-data.json')
        }
      })
  )
})
