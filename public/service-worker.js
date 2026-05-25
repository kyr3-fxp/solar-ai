const CACHE_NAME    = 'agente-solar-v1';
const API_CACHE     = 'agente-solar-api-v1';

// Archivos estáticos a cachear al instalar
const STATIC_ASSETS = [
    '/',
    '/manifest.json'
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME && k !== API_CACHE)
                    .map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Ignorar solicitudes de extensiones del navegador
    if (!url.protocol.startsWith('http')) return;

    // Rutas de API → network-first con fallback a caché
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstApi(event.request));
        return;
    }

    // Assets estáticos → cache-first
    if (
        url.pathname.startsWith('/build/') ||
        url.pathname.endsWith('.css')       ||
        url.pathname.endsWith('.js')        ||
        url.pathname.endsWith('.ico')
    ) {
        event.respondWith(cacheFirstStatic(event.request));
        return;
    }

    // Navegación (HTML) → network-first con fallback offline
    if (event.request.mode === 'navigate') {
        event.respondWith(networkFirstNavigation(event.request));
        return;
    }
});

// ── Estrategias ──────────────────────────────────────────────────────────────

async function networkFirstApi(request) {
    const cache = await caches.open(API_CACHE);
    try {
        const response = await fetch(request.clone());
        if (response.ok) {
            // Solo cachear GET y endpoints de blackout history (datos estáticos)
            if (request.method === 'GET' || request.url.includes('/blackout/history')) {
                cache.put(request, response.clone());
            }
        }
        return response;
    } catch {
        // Sin red — intentar desde caché
        const cached = await cache.match(request);
        if (cached) return cached;

        // Sin caché — devolver respuesta offline genérica
        return new Response(
            JSON.stringify({ success: false, error: 'Sin conexión. Usando datos en caché.', offline: true }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    }
}

async function cacheFirstStatic(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Asset no disponible offline', { status: 503 });
    }
}

async function networkFirstNavigation(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request) || await caches.match('/');
        return cached || new Response('<h1>Sin conexión</h1><p>Agente Solar no disponible offline.</p>', {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}
