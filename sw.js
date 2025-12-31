/**
 * Service Worker - للعمل بدون اتصال وتحسين الأداء
 * نظام إدارة المطاعم
 */

const CACHE_NAME = 'restaurant-system-v1.1.0';
const STATIC_CACHE = 'static-v1.1.0';
const DYNAMIC_CACHE = 'dynamic-v1.1.0';
const API_CACHE = 'api-v1.1.0';

// إعدادات الأداء
const CACHE_CONFIG = {
    maxAge: 24 * 60 * 60 * 1000, // 24 ساعة للملفات الثابتة
    apiMaxAge: 5 * 60 * 1000,     // 5 دقائق للـ API
    maxEntries: 100,               // الحد الأقصى للعناصر
    networkTimeout: 3000           // 3 ثواني مهلة الشبكة
};

// الملفات التي يجب تخزينها مسبقاً
const STATIC_FILES = [
    '/',
    '/index.html',
    '/menu.html',
    '/admin.html',
    '/waiter.html',
    '/cashier.html',
    '/inventory.html',
    '/profile.html',
    '/store.html',
    '/store-admin.html',
    '/super-admin.html',
    '/login.html',
    '/login-restaurant.html',
    '/css/style.css',
    '/js/performance.js',
    '/js/firebase-config.js',
    '/js/restaurant-context.js',
    '/js/data.js',
    '/js/app.js',
    '/js/menu.js',
    '/js/waiter.js',
    '/js/admin.js',
    '/js/cashier.js',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// الملفات التي يمكن تخزينها ديناميكياً
const CACHEABLE_HOSTS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com'
];

// ==========================================
// تثبيت Service Worker
// ==========================================
self.addEventListener('install', event => {
    console.log('📦 Service Worker: تثبيت...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📦 تخزين الملفات الثابتة...');
                return cache.addAll(STATIC_FILES.filter(url => !url.startsWith('http')));
            })
            .then(() => {
                console.log('✅ Service Worker مثبت');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ خطأ في التثبيت:', error);
            })
    );
});

// ==========================================
// تفعيل Service Worker
// ==========================================
self.addEventListener('activate', event => {
    console.log('🔄 Service Worker: تفعيل...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                        .map(name => {
                            console.log('🗑️ حذف كاش قديم:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('✅ Service Worker مفعّل');
                return self.clients.claim();
            })
    );
});

// ==========================================
// استراتيجيات التخزين المؤقت المحسّنة
// ==========================================

// Cache First - للملفات الثابتة (مع timeout للشبكة)
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CACHE_CONFIG.networkTimeout);
        
        const response = await fetch(request, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.warn('⚠️ Cache First fallback:', request.url);
        return new Response('غير متصل', { status: 503 });
    }
}

// Network First - للبيانات الديناميكية (مع timeout سريع)
async function networkFirst(request) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CACHE_CONFIG.networkTimeout);
        
        const response = await fetch(request, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            console.log('📦 Serving from cache:', request.url);
            return cached;
        }
        
        return new Response(
            JSON.stringify({ error: 'غير متصل', offline: true }),
            { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Stale While Revalidate المحسّن - توازن بين السرعة والتحديث
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);
    
    // تحديث في الخلفية
    const fetchPromise = fetch(request)
        .then(response => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);
    
    // إرجاع الكاش فوراً إذا متوفر
    if (cached) {
        // تحديث في الخلفية
        fetchPromise.then(response => {
            if (response) {
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'CACHE_UPDATED', url: request.url });
                    });
                });
            }
        });
        return cached;
    }
    
    return fetchPromise || new Response('غير متصل', { status: 503 });
}

// Network Only مع Rate Limiting للـ API
async function networkOnlyWithRetry(request, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(request);
            return response;
        } catch (error) {
            if (i === retries) throw error;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
}

// ==========================================
// معالجة الطلبات
// ==========================================
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // تجاهل طلبات Chrome extensions
    if (url.protocol === 'chrome-extension:') return;
    
    // تجاهل طلبات Firebase realtime
    if (url.hostname.includes('firebaseio.com') || 
        url.hostname.includes('firebasedatabase.app')) {
        return;
    }
    
    // API requests - Network First
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Templates (مثل /templates/bon/...) تتغير كثيراً أثناء التطوير
    // لا نستخدم Cache-First لها لتجنب بقاء ملفات قديمة (مثل العملة).
    if (url.pathname.startsWith('/templates/')) {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // الموارد الخارجية (الخطوط، الأيقونات)
    if (CACHEABLE_HOSTS.some(host => url.hostname.includes(host))) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }
    
    // HTML documents - Network First لتجنب بقاء صفحات قديمة في الكاش
    if (request.destination === 'document') {
        event.respondWith(networkFirst(request));
        return;
    }

    // الملفات الثابتة (CSS/JS/Images) - Cache First
    if (request.destination === 'style' || 
        request.destination === 'script' ||
        request.destination === 'image') {
        event.respondWith(cacheFirst(request));
        return;
    }
    
    // باقي الطلبات
    event.respondWith(networkFirst(request));
});

// ==========================================
// مزامنة الخلفية
// ==========================================
self.addEventListener('sync', event => {
    console.log('🔄 Background Sync:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(syncPendingOperations());
    }
});

async function syncPendingOperations() {
    try {
        const pendingOps = JSON.parse(localStorage.getItem('pending_sync_operations') || '[]');
        
        for (const op of pendingOps) {
            try {
                await fetch(op.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(op.data)
                });
            } catch (e) {
                console.error('فشل مزامنة العملية:', e);
            }
        }
        
        localStorage.removeItem('pending_sync_operations');
    } catch (error) {
        console.error('خطأ في المزامنة:', error);
    }
}

// ==========================================
// الرسائل
// ==========================================
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data === 'clearCache') {
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        });
    }
});

// ==========================================
// الإشعارات Push
// ==========================================
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    
    const options = {
        body: data.body || 'طلب جديد!',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: [
            { action: 'view', title: 'عرض' },
            { action: 'dismiss', title: 'تجاهل' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'نظام المطعم', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

console.log('✅ Service Worker محمّل');
