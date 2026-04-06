// Service Worker para PWA
// Versão do cache — mude para invalidar cache antigo a cada deploy
const CACHE_VERSION = 'v2'
const CACHE_NAME = `nubox-${CACHE_VERSION}`

// Páginas essenciais para cache offline (apenas área pública do morador)
const urlsToCache = [
  '/',
  '/select-condominium',
  '/favorites',
  '/cart',
  '/offline-data.json'
]

// Instalar Service Worker — força ativação imediata
self.addEventListener('install', (event) => {
  self.skipWaiting() // Ativa o novo SW imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache aberto:', CACHE_NAME)
        return cache.addAll(urlsToCache)
      })
  )
})

// Ativar Service Worker — limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Assume controle de todas as abas imediatamente
      return self.clients.claim()
    })
  )
})

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Nunca interceptar para métodos diferentes de GET
  if (req.method !== 'GET') return

  // Nunca cachear: API, admin, login
  const skipCache =
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/login')

  if (skipCache) return // vai direto para a rede

  // Para páginas HTML: network-first (busca da rede, fallback pro cache)
  if (req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((netRes) => {
          // Atualiza cache com a versão mais recente
          if (netRes && netRes.status === 200) {
            const resClone = netRes.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone))
          }
          return netRes
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/offline-data.json')))
    )
    return
  }

  // Para assets (JS/CSS/imagens): cache-first
  event.respondWith(
    caches.match(req)
      .then((cached) => {
        if (cached) return cached
        return fetch(req).then((netRes) => {
          if (!netRes || netRes.status !== 200 || netRes.type !== 'basic') return netRes
          const resClone = netRes.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone))
          return netRes
        })
      })
      .catch(() => {
        // fallback offline para assets não encontrados
        return new Response('', { status: 404 })
      })
  )
})
