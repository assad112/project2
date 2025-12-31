/**
 * إعدادات Firebase - محسّنة للأداء والاستقرار
 * نظام إدارة المطاعم
 * يدعم عدد كبير من المستخدمين المتزامنين
 */

// إعدادات Firebase - مشروع restaurant-system-demo
const firebaseConfig = {
    apiKey: "AIzaSyDugky7_OlgKzWmyIRgzhOmhLju_hOgTjE",
    authDomain: "restaurant-system-demo.firebaseapp.com",
    databaseURL: "https://restaurant-system-demo-default-rtdb.firebaseio.com",
    projectId: "restaurant-system-demo",
    storageBucket: "restaurant-system-demo.firebasestorage.app",
    messagingSenderId: "901037324084",
    appId: "1:901037324084:web:2a654641ce729b0158d761",
    measurementId: "G-LFXMBP6C4N"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// مرجع قاعدة البيانات
const database = firebase.database();

// ==========================================
// إعدادات الاتصال المحسّنة
// ==========================================

// تمكين الوضع غير المتصل للحفاظ على البيانات
firebase.database().goOnline();

// مراقبة حالة الاتصال مع Firebase
const connectedRef = firebase.database().ref('.info/connected');
let isFirebaseConnected = true;
let connectionListeners = [];

connectedRef.on('value', (snap) => {
    isFirebaseConnected = snap.val() === true;
    console.log(isFirebaseConnected ? '🟢 متصل بـ Firebase' : '🔴 غير متصل بـ Firebase');
    connectionListeners.forEach(cb => cb(isFirebaseConnected));
});

// دالة للاشتراك في تغييرات حالة الاتصال
function onFirebaseConnectionChange(callback) {
    connectionListeners.push(callback);
    callback(isFirebaseConnected); // استدعاء فوري بالحالة الحالية
}

// ==========================================
// نظام التخزين المؤقت المحسّن للبيانات
// ==========================================
const firebaseCache = {
    data: new Map(),
    ttl: 60000, // 60 ثانية (زيادة للاستقرار)
    maxSize: 500, // الحد الأقصى للعناصر
    hits: 0,
    misses: 0,
    
    set(key, value, customTtl = null) {
        // تنظيف إذا امتلأ الكاش
        if (this.data.size >= this.maxSize) {
            this._evictOldest();
        }
        this.data.set(key, {
            value,
            timestamp: Date.now(),
            ttl: customTtl || this.ttl,
            accessCount: 1
        });
    },
    
    get(key) {
        const item = this.data.get(key);
        if (!item) {
            this.misses++;
            return null;
        }
        if (Date.now() - item.timestamp > item.ttl) {
            this.data.delete(key);
            this.misses++;
            return null;
        }
        item.accessCount++;
        this.hits++;
        return item.value;
    },
    
    invalidate(key) {
        if (key) {
            // حذف كل المفاتيح التي تبدأ بهذا المسار
            for (const k of this.data.keys()) {
                if (k.startsWith(key)) {
                    this.data.delete(k);
                }
            }
        } else {
            this.data.clear();
        }
    },
    
    _evictOldest() {
        // حذف 25% من العناصر الأقل استخداماً
        const entries = Array.from(this.data.entries())
            .sort((a, b) => a[1].accessCount - b[1].accessCount);
        const toRemove = Math.ceil(entries.length / 4);
        entries.slice(0, toRemove).forEach(([key]) => this.data.delete(key));
    },
    
    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.data.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0%'
        };
    }
};

// ==========================================
// دوال مساعدة للتعامل مع الأخطاء والإعادة المحسّنة
// ==========================================
async function executeWithRetry(fn, maxRetries = 3, delay = 500) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            // لا نحاول مرة أخرى إذا كان خطأ في الإذن أو البيانات
            if (error.code === 'PERMISSION_DENIED' || error.code === 'INVALID_ARGUMENT') {
                throw error;
            }
            
            console.warn(`محاولة ${i + 1}/${maxRetries} فشلت:`, error.message);
            if (i < maxRetries - 1) {
                // Exponential backoff
                await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
            }
        }
    }
    throw lastError;
}

// دالة لتنفيذ العمليات مع timeout
function withTimeout(promise, ms = 10000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('انتهت مهلة العملية')), ms)
        )
    ]);
}

/**
 * هيكل قاعدة البيانات:
 * 
 * restaurant-system/
 * ├── sites/
 * │   ├── restaurant-system-demo/
 * │   │   ├── name: "السوبر أدمن"
 * │   │   ├── type: "super-admin"
 * │   │   └── url: "https://restaurant-system-demo.web.app"
 * │   │
 * │   └── bon-coffee-1/
 * │       ├── name: "كافيه بون"
 * │       ├── type: "restaurant"
 * │       ├── url: "https://bon-coffee-1.web.app"
 * │       └── restaurantId: "..."
 * │
 * ├── restaurants/
 * │   └── {restaurantId}/
 * │       ├── name: "Bon"
 * │       ├── type: "cafe"
 * │       ├── tables: 10
 * │       ├── username: "Bon"
 * │       ├── password: "Bon"
 * │       ├── siteId: "bon-coffee-1"
 * │       └── status: "active"
 * │
 * ├── superAdmins/
 * │   └── {adminId}/
 * │       ├── username: "admin"
 * │       ├── password: "..."
 * │       └── name: "المدير العام"
 * │
 * └── orders/
 *     └── {restaurantId}/
 *         └── {orderId}/
 *             ├── items: [...]
 *             ├── total: 0
 *             └── status: "pending"
 */

// ========== دوال المواقع (محسّنة) ==========

// جلب جميع المواقع مع التخزين المؤقت
async function getSites() {
    const cacheKey = 'sites';
    const cached = firebaseCache.get(cacheKey);
    if (cached) return cached;
    
    return executeWithRetry(async () => {
        const snapshot = await withTimeout(
            database.ref('restaurant-system/sites').once('value')
        );
        const data = snapshot.val() || {};
        firebaseCache.set(cacheKey, data);
        return data;
    });
}

// إضافة/تحديث موقع
async function saveSite(siteId, data) {
    await executeWithRetry(async () => {
        await withTimeout(
            database.ref(`restaurant-system/sites/${siteId}`).set(data)
        );
    });
    firebaseCache.invalidate('sites');
}

// تحديث جزئي لموقع (بدون استبدال كامل البيانات)
async function updateSite(siteId, partialData) {
    await executeWithRetry(async () => {
        await withTimeout(
            database.ref(`restaurant-system/sites/${siteId}`).update(partialData)
        );
    });
    firebaseCache.invalidate('sites');
}

// حذف موقع
async function deleteSite(siteId) {
    await executeWithRetry(async () => {
        await withTimeout(
            database.ref(`restaurant-system/sites/${siteId}`).remove()
        );
    });
    firebaseCache.invalidate('sites');
}

// ========== دوال المطاعم (محسّنة) ==========

// جلب جميع المطاعم مع التخزين المؤقت
async function getRestaurants() {
    const cacheKey = 'restaurants';
    const cached = firebaseCache.get(cacheKey);
    if (cached) return cached;
    
    return executeWithRetry(async () => {
        const snapshot = await withTimeout(
            database.ref('restaurant-system/restaurants').once('value')
        );
        const data = snapshot.val() || {};
        const result = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        firebaseCache.set(cacheKey, result);
        return result;
    });
}

// جلب مطعم واحد مع التخزين المؤقت
async function getRestaurant(restaurantId) {
    const cacheKey = `restaurant_${restaurantId}`;
    const cached = firebaseCache.get(cacheKey);
    if (cached) return cached;
    
    return executeWithRetry(async () => {
        const snapshot = await withTimeout(
            database.ref(`restaurant-system/restaurants/${restaurantId}`).once('value')
        );
        const data = snapshot.val();
        if (data) firebaseCache.set(cacheKey, data);
        return data;
    });
}

// حفظ مطعم
async function saveRestaurant(restaurantId, data) {
    await executeWithRetry(async () => {
        await withTimeout(
            database.ref(`restaurant-system/restaurants/${restaurantId}`).set(data)
        );
    });
    firebaseCache.invalidate('restaurant');
}

// حذف مطعم
async function deleteRestaurant(restaurantId) {
    await executeWithRetry(async () => {
        await withTimeout(
            database.ref(`restaurant-system/restaurants/${restaurantId}`).remove()
        );
    });
    firebaseCache.invalidate('restaurant');
}

// ========== دوال السوبر أدمن (محسّنة) ==========

// جلب بيانات السوبر أدمن مع التخزين المؤقت
async function getSuperAdmins() {
    const cacheKey = 'superAdmins';
    const cached = firebaseCache.get(cacheKey);
    if (cached) return cached;
    
    return executeWithRetry(async () => {
        const snapshot = await withTimeout(
            database.ref('restaurant-system/superAdmins').once('value')
        );
        const data = snapshot.val() || {};
        firebaseCache.set(cacheKey, data);
        return data;
    });
}

// التحقق من تسجيل دخول السوبر أدمن
async function verifySuperAdmin(username, password) {
    const admins = await getSuperAdmins();
    for (const key in admins) {
        if (admins[key].username === username && admins[key].password === password) {
            return { id: key, ...admins[key] };
        }
    }
    return null;
}

// ========== دوال الطلبات (محسّنة مع throttling) ==========

// متغيرات للتحكم في التحديثات
const orderListeners = new Map();
let orderUpdateQueue = [];
let isProcessingOrders = false;

// جلب طلبات مطعم مع التخزين المؤقت
async function getOrders(restaurantId) {
    const cacheKey = `orders_${restaurantId}`;
    const cached = firebaseCache.get(cacheKey);
    if (cached) return cached;
    
    return executeWithRetry(async () => {
        const snapshot = await withTimeout(
            database.ref(`restaurant-system/orders/${restaurantId}`).once('value')
        );
        const data = snapshot.val() || {};
        const result = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        firebaseCache.set(cacheKey, result);
        return result;
    });
}

// الاستماع لتغييرات الطلبات (realtime) مع throttling
function listenToOrders(restaurantId, callback) {
    // إلغاء الاستماع السابق إن وجد
    if (orderListeners.has(restaurantId)) {
        database.ref(`restaurant-system/orders/${restaurantId}`).off('value', orderListeners.get(restaurantId));
    }
    
    // Throttled callback لتجنب التحديثات المفرطة
    let lastUpdate = 0;
    const throttleMs = 500; // تحديث كل نصف ثانية كحد أقصى
    let pendingData = null;
    
    const throttledCallback = (data) => {
        const now = Date.now();
        if (now - lastUpdate >= throttleMs) {
            lastUpdate = now;
            callback(data);
        } else {
            pendingData = data;
            setTimeout(() => {
                if (pendingData) {
                    callback(pendingData);
                    pendingData = null;
                    lastUpdate = Date.now();
                }
            }, throttleMs - (now - lastUpdate));
        }
    };
    
    const listener = (snapshot) => {
        const data = snapshot.val() || {};
        const orders = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        // تحديث الكاش
        firebaseCache.set(`orders_${restaurantId}`, orders);
        throttledCallback(orders);
    };
    
    orderListeners.set(restaurantId, listener);
    database.ref(`restaurant-system/orders/${restaurantId}`).on('value', listener);
}

// إيقاف الاستماع للطلبات
function stopListeningToOrders(restaurantId) {
    if (orderListeners.has(restaurantId)) {
        database.ref(`restaurant-system/orders/${restaurantId}`).off('value', orderListeners.get(restaurantId));
        orderListeners.delete(restaurantId);
    }
}

// حفظ طلب مع Optimistic Update
async function saveOrder(restaurantId, orderId, data) {
    // تحديث الكاش فوراً (Optimistic)
    const cacheKey = `orders_${restaurantId}`;
    let cachedOrders = firebaseCache.get(cacheKey) || [];
    const existingIndex = cachedOrders.findIndex(o => o.id === orderId);
    if (existingIndex >= 0) {
        cachedOrders[existingIndex] = { id: orderId, ...data };
    } else {
        cachedOrders.push({ id: orderId, ...data });
    }
    firebaseCache.set(cacheKey, cachedOrders);
    
    // حفظ في الخلفية
    try {
        await executeWithRetry(async () => {
            await withTimeout(
                database.ref(`restaurant-system/orders/${restaurantId}/${orderId}`).set(data)
            );
        });
    } catch (error) {
        // إذا فشل، نضيف للمزامنة لاحقاً
        if (window.PerformanceUtils?.backgroundSync) {
            window.PerformanceUtils.backgroundSync.addOperation({
                type: 'order',
                restaurantId,
                orderId,
                data
            });
        }
        throw error;
    }
}

// تحديث حالة الطلب
async function updateOrderStatus(restaurantId, orderId, status) {
    await executeWithRetry(async () => {
        await withTimeout(
            database.ref(`restaurant-system/orders/${restaurantId}/${orderId}/status`).set(status)
        );
    });
    firebaseCache.invalidate(`orders_${restaurantId}`);
}

// ========== تهيئة البيانات الافتراضية ==========

async function initializeDefaultData() {
    const sites = await getSites();
    
    // إذا لا توجد بيانات، أضف الافتراضية
    if (Object.keys(sites).length === 0) {
        // المواقع
        await saveSite('restaurant-system-demo', {
            name: 'السوبر أدمن',
            type: 'super-admin',
            url: 'https://restaurant-system-demo.web.app',
            status: 'active',
            createdAt: new Date().toISOString()
        });
        
        await saveSite('bon-coffee-1', {
            name: 'كافيه بون',
            type: 'restaurant',
            url: 'https://bon-coffee-1.web.app',
            restaurantId: 'bon-1',
            status: 'active',
            createdAt: new Date().toISOString()
        });
        
        // المطعم الافتراضي
        await saveRestaurant('bon-1', {
            name: 'Bon',
            type: 'cafe',
            tables: 10,
            phone: '99123456',
            address: 'كافيه • Bon',
            username: 'Bon',
            password: 'Bon',
            siteId: 'bon-coffee-1',
            status: 'active',
            createdAt: new Date().toISOString()
        });
        
        // السوبر أدمن الافتراضي
        await database.ref('restaurant-system/superAdmins/admin-1').set({
            username: 'admin',
            password: 'admin123',
            name: 'المدير العام',
            createdAt: new Date().toISOString()
        });
        
        console.log('✅ تم تهيئة البيانات الافتراضية');
    }
}

// تصدير للاستخدام العام
window.FirebaseDB = {
    getSites,
    saveSite,
    updateSite,
    deleteSite,
    getRestaurants,
    getRestaurant,
    saveRestaurant,
    deleteRestaurant,
    getSuperAdmins,
    verifySuperAdmin,
    getOrders,
    listenToOrders,
    stopListeningToOrders,
    saveOrder,
    updateOrderStatus,
    initializeDefaultData,
    // دوال إضافية للاستقرار
    onFirebaseConnectionChange,
    isConnected: () => isFirebaseConnected,
    invalidateCache: (key) => firebaseCache.invalidate(key),
    clearCache: () => firebaseCache.data.clear()
};

function getCurrentSiteIdFromHostname() {
    try {
        const host = window.location.hostname;
        if (!host) return null;

        // تطوير محلي
        if (host === 'localhost' || host === '127.0.0.1') return null;

        // Firebase Hosting: <siteId>.web.app أو <siteId>.firebaseapp.com
        if (host.endsWith('.web.app') || host.endsWith('.firebaseapp.com')) {
            return host.split('.')[0];
        }

        return null;
    } catch (e) {
        return null;
    }
}

function showSiteDisabledScreen(siteId) {
    const render = () => {
        try {
            document.body.innerHTML = `
                <div style="min-height: 100vh; display:flex; align-items:center; justify-content:center; padding: 24px; font-family: Cairo, sans-serif; background: #0f172a; color: #f1f5f9;">
                    <div style="max-width: 520px; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 22px; text-align: center;">
                        <div style="font-size: 42px; margin-bottom: 10px;">⛔</div>
                        <h2 style="margin: 0 0 8px 0; font-size: 1.35rem;">الموقع موقوف</h2>
                        <p style="margin: 0 0 16px 0; color: #94a3b8; line-height: 1.6;">
                            تم إيقاف هذا الموقع من قِبل الإدارة (${siteId}).
                            <br>للاستفسار يرجى التواصل مع المسؤول.
                        </p>
                        <button onclick="location.reload()" style="width: 100%; padding: 12px 14px; border-radius: 12px; border: none; cursor: pointer; font-weight: 700; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); color: white;">
                            إعادة المحاولة
                        </button>
                    </div>
                </div>
            `;
        } catch (e) {
            // ignore
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
}

async function enforceCurrentSiteStatus() {
    const siteId = getCurrentSiteIdFromHostname();
    if (!siteId) return;

    // لا تقفل موقع السوبر أدمن حتى لا تنحبس الإدارة
    if (siteId === 'restaurant-system-demo') return;

    try {
        const sites = await getSites();
        const site = sites?.[siteId];
        const status = site?.status;

        const isDisabled = status === 'disabled' || status === 'inactive' || status === false;
        if (isDisabled) {
            window.__SITE_DISABLED__ = true;
            showSiteDisabledScreen(siteId);
        }
    } catch (error) {
        // إذا فشل التحقق (أوفلاين مثلاً) لا نقفل الموقع لتجنب تعطيل غير مقصود
        console.warn('تعذر التحقق من حالة الموقع:', error?.message || error);
    }
}

// تنفيذ التحقق بشكل غير حاجز
enforceCurrentSiteStatus();

console.log('🔥 Firebase متصل بنجاح - النسخة المحسّنة للأداء');
