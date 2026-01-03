/**
 * إعدادات Firebase - مرمرية
 * نظام إدارة المقاهي
 */

// إعدادات Firebase - مشروع dashbord
const firebaseConfig = {
    apiKey: "AIzaSyBnBV5NJKy34uUYseMxGjpDRlkclKHiqmU",
    authDomain: "dashbord-fcb7b.firebaseapp.com",
    databaseURL: "https://dashbord-fcb7b-default-rtdb.firebaseio.com",
    projectId: "dashbord-fcb7b",
    storageBucket: "dashbord-fcb7b.firebasestorage.app",
    messagingSenderId: "31514864344",
    appId: "1:31514864344:web:00ef93b07bcf88ec6245ad",
    measurementId: "G-C1Y2NWR8DN"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// مرجع قاعدة البيانات
const database = firebase.database();

// تمكين الوضع المتصل
firebase.database().goOnline();

// مراقبة حالة الاتصال
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
    callback(isFirebaseConnected);
}

// نظام التخزين المؤقت
const firebaseCache = {
    data: new Map(),
    ttl: 60000,
    maxSize: 500,
    
    set(key, value, customTtl = null) {
        if (this.data.size >= this.maxSize) {
            const firstKey = this.data.keys().next().value;
            this.data.delete(firstKey);
        }
        this.data.set(key, {
            value,
            timestamp: Date.now(),
            ttl: customTtl || this.ttl
        });
    },
    
    get(key) {
        const item = this.data.get(key);
        if (!item) return null;
        if (Date.now() - item.timestamp > item.ttl) {
            this.data.delete(key);
            return null;
        }
        return item.value;
    },
    
    invalidate(key) {
        if (key) {
            for (const k of this.data.keys()) {
                if (k.startsWith(key)) {
                    this.data.delete(k);
                }
            }
        } else {
            this.data.clear();
        }
    }
};

// دوال مساعدة
async function executeWithRetry(fn, maxRetries = 3, delay = 500) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (error.code === 'PERMISSION_DENIED') throw error;
            if (i < maxRetries - 1) {
                await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
            }
        }
    }
    throw lastError;
}

function withTimeout(promise, ms = 10000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('انتهت مهلة العملية')), ms)
        )
    ]);
}

// دوال المواقع
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

async function saveSite(siteId, data) {
    await executeWithRetry(async () => {
        await withTimeout(
            database.ref(`restaurant-system/sites/${siteId}`).set(data)
        );
    });
    firebaseCache.invalidate('sites');
}

// دوال المطاعم
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

async function saveRestaurant(restaurantId, data) {
    await executeWithRetry(async () => {
        await withTimeout(
            database.ref(`restaurant-system/restaurants/${restaurantId}`).set(data)
        );
    });
    firebaseCache.invalidate('restaurant');
}

// دوال الطلبات
const orderListeners = new Map();

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

function listenToOrders(restaurantId, callback) {
    if (orderListeners.has(restaurantId)) {
        database.ref(`restaurant-system/orders/${restaurantId}`).off('value', orderListeners.get(restaurantId));
    }
    
    const listener = (snapshot) => {
        const data = snapshot.val() || {};
        const orders = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        firebaseCache.set(`orders_${restaurantId}`, orders);
        callback(orders);
    };
    
    orderListeners.set(restaurantId, listener);
    database.ref(`restaurant-system/orders/${restaurantId}`).on('value', listener);
}

function stopListeningToOrders(restaurantId) {
    if (orderListeners.has(restaurantId)) {
        database.ref(`restaurant-system/orders/${restaurantId}`).off('value', orderListeners.get(restaurantId));
        orderListeners.delete(restaurantId);
    }
}

async function saveOrder(restaurantId, orderId, data) {
    await executeWithRetry(async () => {
        await withTimeout(
            database.ref(`restaurant-system/orders/${restaurantId}/${orderId}`).set(data)
        );
    });
    firebaseCache.invalidate(`orders_${restaurantId}`);
}

async function updateOrderStatus(restaurantId, orderId, status) {
    await executeWithRetry(async () => {
        await withTimeout(
            database.ref(`restaurant-system/orders/${restaurantId}/${orderId}/status`).set(status)
        );
    });
    firebaseCache.invalidate(`orders_${restaurantId}`);
}

// تصدير للاستخدام العام
window.FirebaseDB = {
    getSites,
    saveSite,
    getRestaurants,
    getRestaurant,
    saveRestaurant,
    getOrders,
    listenToOrders,
    stopListeningToOrders,
    saveOrder,
    updateOrderStatus,
    onFirebaseConnectionChange,
    isConnected: () => isFirebaseConnected,
    invalidateCache: (key) => firebaseCache.invalidate(key),
    clearCache: () => firebaseCache.data.clear()
};

console.log('🔥 Firebase متصل بنجاح - مرمرية');

