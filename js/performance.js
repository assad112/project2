/**
 * نظام تحسين الأداء والاستقرار
 * يضمن عمل الموقع بشكل مستقر مع عدد كبير من المستخدمين
 */

// ==========================================
// نظام إدارة الاتصال
// ==========================================
class ConnectionManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.listeners = [];
        this.connectionQuality = 'good';
        
        this.init();
    }
    
    init() {
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // مراقبة جودة الاتصال
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => this.checkConnectionQuality());
            this.checkConnectionQuality();
        }
        
        // فحص دوري للاتصال
        setInterval(() => this.healthCheck(), 30000);
    }
    
    handleOnline() {
        this.isOnline = true;
        this.reconnectAttempts = 0;
        this.notifyListeners('online');
        console.log('🟢 تم استعادة الاتصال');
        this.showConnectionStatus('تم استعادة الاتصال', 'success');
    }
    
    handleOffline() {
        this.isOnline = false;
        this.notifyListeners('offline');
        console.log('🔴 انقطع الاتصال');
        this.showConnectionStatus('انقطع الاتصال - يتم استخدام البيانات المحلية', 'warning');
    }
    
    checkConnectionQuality() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            if (conn.effectiveType === '4g') {
                this.connectionQuality = 'excellent';
            } else if (conn.effectiveType === '3g') {
                this.connectionQuality = 'good';
            } else {
                this.connectionQuality = 'slow';
            }
        }
    }
    
    async healthCheck() {
        if (!this.isOnline) return;
        
        try {
            const start = performance.now();
            await fetch(window.location.origin + '/favicon.ico', { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            const latency = performance.now() - start;
            
            if (latency < 200) {
                this.connectionQuality = 'excellent';
            } else if (latency < 500) {
                this.connectionQuality = 'good';
            } else {
                this.connectionQuality = 'slow';
            }
        } catch (error) {
            // الاتصال قد يكون متقطع
        }
    }
    
    onStatusChange(callback) {
        this.listeners.push(callback);
    }
    
    notifyListeners(status) {
        this.listeners.forEach(cb => cb(status));
    }
    
    showConnectionStatus(message, type) {
        const existing = document.getElementById('connection-status');
        if (existing) existing.remove();
        
        const div = document.createElement('div');
        div.id = 'connection-status';
        div.className = `connection-status ${type}`;
        div.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'wifi' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(div);
        
        if (type === 'success') {
            setTimeout(() => div.remove(), 3000);
        }
    }
}

// ==========================================
// نظام التخزين المؤقت المتقدم
// ==========================================
class CacheManager {
    constructor(options = {}) {
        this.prefix = options.prefix || 'app_cache_';
        this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 دقائق
        this.maxSize = options.maxSize || 50;
        this.memoryCache = new Map();
        
        this.cleanupOldCache();
    }
    
    set(key, data, ttl = this.defaultTTL) {
        const cacheItem = {
            data,
            timestamp: Date.now(),
            expiry: Date.now() + ttl
        };
        
        // حفظ في الذاكرة
        this.memoryCache.set(key, cacheItem);
        
        // حفظ في localStorage
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(cacheItem));
        } catch (e) {
            // إذا امتلأت localStorage، نحذف الأقدم
            this.cleanupOldCache();
            try {
                localStorage.setItem(this.prefix + key, JSON.stringify(cacheItem));
            } catch (e2) {
                console.warn('فشل حفظ الكاش:', e2);
            }
        }
        
        // تحديد حجم الكاش
        if (this.memoryCache.size > this.maxSize) {
            this.evictOldest();
        }
    }
    
    get(key) {
        // أولاً نتحقق من الذاكرة
        if (this.memoryCache.has(key)) {
            const item = this.memoryCache.get(key);
            if (item.expiry > Date.now()) {
                return item.data;
            }
            this.memoryCache.delete(key);
        }
        
        // ثم نتحقق من localStorage
        try {
            const stored = localStorage.getItem(this.prefix + key);
            if (stored) {
                const item = JSON.parse(stored);
                if (item.expiry > Date.now()) {
                    this.memoryCache.set(key, item);
                    return item.data;
                }
                localStorage.removeItem(this.prefix + key);
            }
        } catch (e) {
            console.warn('خطأ في قراءة الكاش:', e);
        }
        
        return null;
    }
    
    has(key) {
        return this.get(key) !== null;
    }
    
    delete(key) {
        this.memoryCache.delete(key);
        localStorage.removeItem(this.prefix + key);
    }
    
    clear() {
        this.memoryCache.clear();
        Object.keys(localStorage)
            .filter(k => k.startsWith(this.prefix))
            .forEach(k => localStorage.removeItem(k));
    }
    
    evictOldest() {
        let oldest = null;
        let oldestKey = null;
        
        for (const [key, item] of this.memoryCache) {
            if (!oldest || item.timestamp < oldest.timestamp) {
                oldest = item;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.delete(oldestKey);
        }
    }
    
    cleanupOldCache() {
        const now = Date.now();
        Object.keys(localStorage)
            .filter(k => k.startsWith(this.prefix))
            .forEach(k => {
                try {
                    const item = JSON.parse(localStorage.getItem(k));
                    if (item.expiry < now) {
                        localStorage.removeItem(k);
                    }
                } catch (e) {
                    localStorage.removeItem(k);
                }
            });
    }
}

// ==========================================
// نظام إعادة المحاولة الذكي
// ==========================================
class RetryManager {
    static async execute(fn, options = {}) {
        const maxRetries = options.maxRetries || 3;
        const baseDelay = options.baseDelay || 1000;
        const maxDelay = options.maxDelay || 10000;
        
        let lastError;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries - 1) {
                    // Exponential backoff with jitter
                    const delay = Math.min(
                        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
                        maxDelay
                    );
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }
}

// ==========================================
// نظام الطابور للعمليات
// ==========================================
class OperationQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.batchSize = 5;
        this.batchDelay = 100;
    }
    
    add(operation) {
        return new Promise((resolve, reject) => {
            this.queue.push({ operation, resolve, reject });
            this.processQueue();
        });
    }
    
    async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        
        while (this.queue.length > 0) {
            const batch = this.queue.splice(0, this.batchSize);
            
            await Promise.all(batch.map(async ({ operation, resolve, reject }) => {
                try {
                    const result = await operation();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            }));
            
            if (this.queue.length > 0) {
                await new Promise(r => setTimeout(r, this.batchDelay));
            }
        }
        
        this.processing = false;
    }
}

// ==========================================
// نظام التحديثات المتفائلة
// ==========================================
class OptimisticUpdater {
    constructor(cache) {
        this.cache = cache;
        this.pendingUpdates = new Map();
    }
    
    async update(key, optimisticData, serverFn) {
        const previousData = this.cache.get(key);
        
        // تحديث متفائل فوري
        this.cache.set(key, optimisticData);
        this.pendingUpdates.set(key, previousData);
        
        try {
            const result = await serverFn();
            this.pendingUpdates.delete(key);
            return result;
        } catch (error) {
            // التراجع عند الفشل
            if (previousData) {
                this.cache.set(key, previousData);
            } else {
                this.cache.delete(key);
            }
            this.pendingUpdates.delete(key);
            throw error;
        }
    }
}

// ==========================================
// نظام Rate Limiting للعميل
// ==========================================
class RateLimiter {
    constructor(options = {}) {
        this.requests = [];
        this.maxRequests = options.maxRequests || 50;
        this.windowMs = options.windowMs || 60000; // دقيقة واحدة
    }
    
    canMakeRequest() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.windowMs);
        return this.requests.length < this.maxRequests;
    }
    
    recordRequest() {
        this.requests.push(Date.now());
    }
    
    async waitForSlot() {
        while (!this.canMakeRequest()) {
            await new Promise(r => setTimeout(r, 100));
        }
        this.recordRequest();
    }
}

// ==========================================
// نظام Debounce و Throttle
// ==========================================
function debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

function throttle(fn, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==========================================
// نظام WebSocket للتحديثات الفورية
// ==========================================
class RealtimeConnection {
    constructor(options = {}) {
        this.url = options.url || null;
        this.reconnectDelay = options.reconnectDelay || 3000;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
        this.reconnectAttempts = 0;
        this.socket = null;
        this.listeners = new Map();
        this.isConnected = false;
        this.messageQueue = [];
        
        // استخدام Firebase Realtime بدلاً من WebSocket مباشر
        this.useFirebase = options.useFirebase !== false;
    }
    
    connect() {
        if (this.useFirebase && typeof firebase !== 'undefined') {
            this.connectFirebase();
        } else if (this.url) {
            this.connectWebSocket();
        }
    }
    
    connectFirebase() {
        // الاستماع للتغييرات في Firebase
        const database = firebase.database();
        
        // الاستماع لتغييرات الطلبات
        database.ref('restaurant-system/orders').on('child_changed', (snapshot) => {
            this.emit('order:updated', { id: snapshot.key, data: snapshot.val() });
        });
        
        database.ref('restaurant-system/orders').on('child_added', (snapshot) => {
            this.emit('order:new', { id: snapshot.key, data: snapshot.val() });
        });
        
        // الاستماع لتغييرات الطاولات
        database.ref('restaurant-system/tables').on('child_changed', (snapshot) => {
            this.emit('table:updated', { id: snapshot.key, data: snapshot.val() });
        });
        
        this.isConnected = true;
        this.emit('connected');
        console.log('🔄 Realtime: متصل عبر Firebase');
    }
    
    connectWebSocket() {
        try {
            this.socket = new WebSocket(this.url);
            
            this.socket.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log('🔌 WebSocket: متصل');
                this.emit('connected');
                this.flushMessageQueue();
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.emit(data.type, data.payload);
                } catch (e) {
                    console.warn('خطأ في تحليل الرسالة:', e);
                }
            };
            
            this.socket.onclose = () => {
                this.isConnected = false;
                console.log('🔌 WebSocket: انقطع الاتصال');
                this.emit('disconnected');
                this.attemptReconnect();
            };
            
            this.socket.onerror = (error) => {
                console.error('🔌 WebSocket خطأ:', error);
                this.emit('error', error);
            };
        } catch (error) {
            console.error('فشل الاتصال بـ WebSocket:', error);
        }
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('🔌 تم استنفاد محاولات إعادة الاتصال');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
        
        console.log(`🔌 إعادة الاتصال خلال ${delay}ms (محاولة ${this.reconnectAttempts})`);
        
        setTimeout(() => this.connectWebSocket(), delay);
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
    }
    
    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(data));
    }
    
    send(type, payload) {
        const message = JSON.stringify({ type, payload });
        
        if (this.isConnected && this.socket) {
            this.socket.send(message);
        } else {
            this.messageQueue.push(message);
        }
    }
    
    flushMessageQueue() {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            this.socket.send(message);
        }
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
        this.isConnected = false;
    }
}

// إنشاء اتصال Realtime عام
const realtimeConnection = new RealtimeConnection({ useFirebase: true });

// تهيئة الاتصال عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => realtimeConnection.connect());
} else {
    realtimeConnection.connect();
}

// ==========================================
// نظام مزامنة البيانات في الخلفية
// ==========================================
class BackgroundSync {
    constructor() {
        this.pendingOperations = [];
        this.storageKey = 'pending_sync_operations';
        
        this.loadPendingOperations();
        this.setupServiceWorkerSync();
    }
    
    loadPendingOperations() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.pendingOperations = JSON.parse(stored);
            }
        } catch (e) {
            this.pendingOperations = [];
        }
    }
    
    savePendingOperations() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.pendingOperations));
    }
    
    addOperation(operation) {
        this.pendingOperations.push({
            ...operation,
            id: Date.now() + Math.random(),
            timestamp: Date.now()
        });
        this.savePendingOperations();
    }
    
    async syncAll() {
        if (!navigator.onLine || this.pendingOperations.length === 0) return;
        
        const operations = [...this.pendingOperations];
        const successful = [];
        
        for (const op of operations) {
            try {
                await this.executeOperation(op);
                successful.push(op.id);
            } catch (error) {
                console.warn('فشل مزامنة العملية:', op.id, error);
            }
        }
        
        this.pendingOperations = this.pendingOperations.filter(
            op => !successful.includes(op.id)
        );
        this.savePendingOperations();
    }
    
    async executeOperation(op) {
        // تنفيذ حسب نوع العملية
        switch (op.type) {
            case 'order':
                return await window.FirebaseDB?.saveOrder(op.restaurantId, op.orderId, op.data);
            case 'update':
                return await fetch(op.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(op.data)
                });
            default:
                throw new Error('نوع عملية غير معروف');
        }
    }
    
    setupServiceWorkerSync() {
        if ('serviceWorker' in navigator && 'sync' in window.SyncManager) {
            navigator.serviceWorker.ready.then(registration => {
                registration.sync.register('background-sync');
            });
        }
    }
}

// ==========================================
// نظام مراقبة الأداء
// ==========================================
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.maxMetrics = 100;
    }
    
    recordMetric(name, value) {
        this.metrics.push({
            name,
            value,
            timestamp: Date.now()
        });
        
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }
    }
    
    measureAsync(name, fn) {
        const start = performance.now();
        return fn().then(result => {
            this.recordMetric(name, performance.now() - start);
            return result;
        }).catch(error => {
            this.recordMetric(name + '_error', performance.now() - start);
            throw error;
        });
    }
    
    getAverageTime(name) {
        const relevant = this.metrics.filter(m => m.name === name);
        if (relevant.length === 0) return 0;
        return relevant.reduce((sum, m) => sum + m.value, 0) / relevant.length;
    }
    
    getReport() {
        const names = [...new Set(this.metrics.map(m => m.name))];
        return names.map(name => ({
            name,
            average: this.getAverageTime(name),
            count: this.metrics.filter(m => m.name === name).length
        }));
    }
}

// ==========================================
// نظام إدارة الذاكرة
// ==========================================
class MemoryManager {
    static cleanup() {
        // تنظيف الكاش القديم
        const now = Date.now();
        Object.keys(localStorage).forEach(key => {
            try {
                if (key.startsWith('app_cache_')) {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (item.expiry && item.expiry < now) {
                        localStorage.removeItem(key);
                    }
                }
            } catch (e) {
                // تجاهل الأخطاء
            }
        });
    }
    
    static getStorageUsage() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            total += localStorage.getItem(key).length * 2; // UTF-16
        }
        return total;
    }
    
    static isStorageNearFull() {
        // معظم المتصفحات تسمح بـ 5MB
        return this.getStorageUsage() > 4 * 1024 * 1024;
    }
}

// ==========================================
// تهيئة النظام
// ==========================================
const connectionManager = new ConnectionManager();
const cacheManager = new CacheManager({ prefix: 'restaurant_', ttl: 10 * 60 * 1000 });
const operationQueue = new OperationQueue();
const rateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
const backgroundSync = new BackgroundSync();
const performanceMonitor = new PerformanceMonitor();

// مزامنة عند استعادة الاتصال
connectionManager.onStatusChange(status => {
    if (status === 'online') {
        backgroundSync.syncAll();
    }
});

// تنظيف دوري
setInterval(() => MemoryManager.cleanup(), 5 * 60 * 1000);

// تصدير للاستخدام العام
window.PerformanceUtils = {
    connectionManager,
    cacheManager,
    operationQueue,
    rateLimiter,
    backgroundSync,
    performanceMonitor,
    realtimeConnection,  // إضافة Realtime Connection
    RetryManager,
    OptimisticUpdater,
    MemoryManager,
    RealtimeConnection,  // الـ Class للاستخدام المخصص
    debounce,
    throttle
};

console.log('⚡ نظام تحسين الأداء جاهز (v2.0 - مع Realtime)');

// ==========================================
// تسجيل Service Worker
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker مسجّل:', registration.scope);
                
                // التحقق من التحديثات
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // يوجد تحديث جديد
                            if (confirm('يوجد تحديث جديد. هل تريد تحديث الصفحة؟')) {
                                newWorker.postMessage('skipWaiting');
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch(error => {
                console.warn('⚠️ فشل تسجيل Service Worker:', error);
            });
    });
}

// CSS للإشعارات
const style = document.createElement('style');
style.textContent = `
    .connection-status {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideDown 0.3s ease;
    }
    
    .connection-status.success {
        background: linear-gradient(135deg, #27ae60, #2ecc71);
    }
    
    .connection-status.warning {
        background: linear-gradient(135deg, #f39c12, #e74c3c);
    }
    
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);
