/**
 * نظام سياق المطعم - مرتبط بـ Firebase
 * كل مطعم له بيانات مستقلة تماماً ومزامنة فورية
 */

const RestaurantContext = {
    // متغيرات داخلية
    _listeners: {},
    _cache: {},
    _isOnline: true,
    
    // الحصول على معرف المطعم الحالي
    getRestaurantId: function() {
        // أولاً: من الرابط
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('r');
        if (urlId) {
            return urlId;
        }
        
        // ثانياً: من localStorage
        const current = localStorage.getItem('currentRestaurant');
        if (current) {
            try {
                const restaurant = JSON.parse(current);
                return restaurant.id;
            } catch(e) {}
        }
        
        return null;
    },
    
    // الحصول على بيانات المطعم الحالي
    getRestaurant: function() {
        const current = localStorage.getItem('currentRestaurant');
        if (current) {
            try {
                const restaurant = JSON.parse(current);
                if (restaurant && restaurant.id) {
                    return restaurant;
                }
            } catch(e) {}
        }
        return null;
    },
    
    // مسار Firebase للمطعم
    getFirebasePath: function(collection) {
        const id = this.getRestaurantId();
        if (!id) return null;
        return `restaurant-system/restaurantData/${id}/${collection}`;
    },
    
    // ==========================================
    // دوال الطلبات - مع Firebase
    // ==========================================
    
    // جلب الطلبات
    getOrders: async function() {
        const path = this.getFirebasePath('orders');
        if (!path || typeof firebase === 'undefined') {
            return this._getLocal('orders', []);
        }
        
        try {
            const snapshot = await firebase.database().ref(path).once('value');
            const data = snapshot.val() || {};
            const orders = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            // ترتيب حسب الوقت (الأحدث أولاً)
            orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            this._cache.orders = orders;
            return orders;
        } catch (error) {
            console.error('خطأ في جلب الطلبات:', error);
            return this._cache.orders || this._getLocal('orders', []);
        }
    },
    
    // الاستماع للطلبات (تحديث مباشر)
    listenToOrders: function(callback) {
        const path = this.getFirebasePath('orders');
        if (!path || typeof firebase === 'undefined') {
            callback(this._getLocal('orders', []));
            return;
        }
        
        // إلغاء الاستماع السابق
        if (this._listeners.orders) {
            firebase.database().ref(path).off('value', this._listeners.orders);
        }
        
        // Throttle لتجنب التحديثات المتكررة
        let lastUpdate = 0;
        const throttleMs = 300;
        
        this._listeners.orders = firebase.database().ref(path).on('value', (snapshot) => {
            const now = Date.now();
            if (now - lastUpdate < throttleMs) return;
            lastUpdate = now;
            
            const data = snapshot.val() || {};
            const orders = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            this._cache.orders = orders;
            callback(orders);
        });
    },
    
    // إيقاف الاستماع للطلبات
    stopListeningToOrders: function() {
        const path = this.getFirebasePath('orders');
        if (path && this._listeners.orders) {
            firebase.database().ref(path).off('value', this._listeners.orders);
            delete this._listeners.orders;
        }
    },
    
    // إضافة طلب جديد
    addOrder: async function(order) {
        const path = this.getFirebasePath('orders');
        order.id = order.id || Date.now();
        order.createdAt = order.createdAt || Date.now();
        order.status = order.status || 'pending';
        
        if (!path || typeof firebase === 'undefined') {
            const orders = this._getLocal('orders', []);
            orders.unshift(order);
            this._setLocal('orders', orders);
            return order;
        }
        
        try {
            await firebase.database().ref(`${path}/${order.id}`).set(order);
            
            // تحديث الطاولة
            if (order.tableId) {
                await this.updateTableStatus(order.tableId, 'pending', order.id);
            }
            
            return order;
        } catch (error) {
            console.error('خطأ في إضافة الطلب:', error);
            // حفظ محلي كـ fallback
            const orders = this._getLocal('orders', []);
            orders.unshift(order);
            this._setLocal('orders', orders);
            return order;
        }
    },
    
    // تحديث حالة طلب
    updateOrderStatus: async function(orderId, status) {
        const path = this.getFirebasePath('orders');
        
        if (!path || typeof firebase === 'undefined') {
            const orders = this._getLocal('orders', []);
            const idx = orders.findIndex(o => o.id == orderId);
            if (idx !== -1) {
                orders[idx].status = status;
                this._setLocal('orders', orders);
                
                // تحديث الطاولة
                if (status === 'completed') {
                    this.updateTableStatus(orders[idx].tableId, 'available', null);
                }
            }
            return;
        }
        
        try {
            await firebase.database().ref(`${path}/${orderId}/status`).set(status);
            
            // تحديث الطاولة عند اكتمال الطلب
            if (status === 'completed') {
                const snapshot = await firebase.database().ref(`${path}/${orderId}`).once('value');
                const order = snapshot.val();
                if (order && order.tableId) {
                    await this.updateTableStatus(order.tableId, 'available', null);
                }
            }
        } catch (error) {
            console.error('خطأ في تحديث حالة الطلب:', error);
        }
    },
    
    // حذف طلب
    deleteOrder: async function(orderId) {
        const path = this.getFirebasePath('orders');
        
        if (!path || typeof firebase === 'undefined') {
            let orders = this._getLocal('orders', []);
            orders = orders.filter(o => o.id != orderId);
            this._setLocal('orders', orders);
            return;
        }
        
        try {
            await firebase.database().ref(`${path}/${orderId}`).remove();
        } catch (error) {
            console.error('خطأ في حذف الطلب:', error);
        }
    },
    
    // ==========================================
    // دوال الطاولات - مع Firebase
    // ==========================================
    
    // جلب الطاولات
    getTables: async function() {
        const path = this.getFirebasePath('tables');
        const restaurant = this.getRestaurant();
        const tablesCount = restaurant ? (restaurant.tables || 10) : 10;
        
        if (!path || typeof firebase === 'undefined') {
            return this._getLocalTables(tablesCount);
        }
        
        try {
            const snapshot = await firebase.database().ref(path).once('value');
            let tables = snapshot.val();
            
            // إنشاء الطاولات إذا لم تكن موجودة
            if (!tables || Object.keys(tables).length === 0) {
                tables = {};
                for (let i = 1; i <= tablesCount; i++) {
                    tables[i] = {
                        id: i,
                        status: 'available',
                        currentOrder: null
                    };
                }
                await firebase.database().ref(path).set(tables);
            }
            
            // تحويل لمصفوفة
            const tablesArray = Object.keys(tables).map(key => ({
                id: parseInt(key),
                ...tables[key]
            }));
            tablesArray.sort((a, b) => a.id - b.id);
            
            this._cache.tables = tablesArray;
            return tablesArray;
        } catch (error) {
            console.error('خطأ في جلب الطاولات:', error);
            return this._cache.tables || this._getLocalTables(tablesCount);
        }
    },
    
    // جلب الطاولات (متزامن - للتوافق)
    getTablesSync: function() {
        if (this._cache.tables) {
            return this._cache.tables;
        }
        const restaurant = this.getRestaurant();
        const tablesCount = restaurant ? (restaurant.tables || 10) : 10;
        return this._getLocalTables(tablesCount);
    },
    
    // الاستماع للطاولات
    listenToTables: function(callback) {
        const path = this.getFirebasePath('tables');
        const restaurant = this.getRestaurant();
        const tablesCount = restaurant ? (restaurant.tables || 10) : 10;
        
        if (!path || typeof firebase === 'undefined') {
            callback(this._getLocalTables(tablesCount));
            return;
        }
        
        if (this._listeners.tables) {
            firebase.database().ref(path).off('value', this._listeners.tables);
        }
        
        this._listeners.tables = firebase.database().ref(path).on('value', (snapshot) => {
            let tables = snapshot.val();
            if (!tables) {
                callback(this._getLocalTables(tablesCount));
                return;
            }
            
            const tablesArray = Object.keys(tables).map(key => ({
                id: parseInt(key),
                ...tables[key]
            }));
            tablesArray.sort((a, b) => a.id - b.id);
            this._cache.tables = tablesArray;
            callback(tablesArray);
        });
    },
    
    // تحديث حالة طاولة
    updateTableStatus: async function(tableId, status, orderId = null) {
        const path = this.getFirebasePath('tables');
        
        if (!path || typeof firebase === 'undefined') {
            const tables = this._getLocalTables(10);
            const idx = tables.findIndex(t => t.id == tableId);
            if (idx !== -1) {
                tables[idx].status = status;
                tables[idx].currentOrder = orderId;
                this._setLocal('tables', tables);
            }
            return;
        }
        
        try {
            await firebase.database().ref(`${path}/${tableId}`).update({
                status: status,
                currentOrder: orderId
            });
        } catch (error) {
            console.error('خطأ في تحديث الطاولة:', error);
        }
    },
    
    // الحصول على طاولة واحدة
    getTable: function(tableId) {
        const tables = this._cache.tables || this.getTablesSync();
        return tables.find(t => t.id == tableId);
    },
    
    // ==========================================
    // دوال المنيو - مع Firebase
    // ==========================================
    
    // جلب المنيو
    getMenu: async function() {
        const path = this.getFirebasePath('menu');
        
        if (!path || typeof firebase === 'undefined') {
            return this._getLocal('menu', null);
        }
        
        try {
            const snapshot = await firebase.database().ref(path).once('value');
            const menu = snapshot.val();
            if (menu) {
                this._cache.menu = menu;
            }
            return menu;
        } catch (error) {
            console.error('خطأ في جلب المنيو:', error);
            return this._cache.menu || this._getLocal('menu', null);
        }
    },
    
    // حفظ المنيو
    setMenu: async function(menu) {
        const path = this.getFirebasePath('menu');
        
        if (!path || typeof firebase === 'undefined') {
            this._setLocal('menu', menu);
            return;
        }
        
        try {
            await firebase.database().ref(path).set(menu);
            this._cache.menu = menu;
        } catch (error) {
            console.error('خطأ في حفظ المنيو:', error);
            this._setLocal('menu', menu);
        }
    },
    
    // ==========================================
    // دوال البيانات العامة
    // ==========================================
    
    // حفظ بيانات عامة
    setData: async function(key, value) {
        const path = this.getFirebasePath(key);
        
        if (!path || typeof firebase === 'undefined') {
            this._setLocal(key, value);
            return;
        }
        
        try {
            await firebase.database().ref(path).set(value);
            this._cache[key] = value;
        } catch (error) {
            console.error(`خطأ في حفظ ${key}:`, error);
            this._setLocal(key, value);
        }
    },
    
    // جلب بيانات عامة
    getData: async function(key, defaultValue = null) {
        const path = this.getFirebasePath(key);
        
        if (!path || typeof firebase === 'undefined') {
            return this._getLocal(key, defaultValue);
        }
        
        try {
            const snapshot = await firebase.database().ref(path).once('value');
            const data = snapshot.val();
            if (data !== null) {
                this._cache[key] = data;
                return data;
            }
            return defaultValue;
        } catch (error) {
            console.error(`خطأ في جلب ${key}:`, error);
            return this._cache[key] || this._getLocal(key, defaultValue);
        }
    },
    
    // ==========================================
    // دوال محلية (fallback)
    // ==========================================
    
    _getStorageKey: function(key) {
        const id = this.getRestaurantId();
        if (!id) return key;
        return `r${id}_${key}`;
    },
    
    _getLocal: function(key, defaultValue = null) {
        const storageKey = this._getStorageKey(key);
        const data = localStorage.getItem(storageKey);
        if (data) {
            try {
                return JSON.parse(data);
            } catch(e) {
                return defaultValue;
            }
        }
        return defaultValue;
    },
    
    _setLocal: function(key, value) {
        const storageKey = this._getStorageKey(key);
        localStorage.setItem(storageKey, JSON.stringify(value));
    },
    
    _getLocalTables: function(count) {
        let tables = this._getLocal('tables', null);
        if (!tables) {
            tables = [];
            for (let i = 1; i <= count; i++) {
                tables.push({
                    id: i,
                    status: 'available',
                    currentOrder: null
                });
            }
            this._setLocal('tables', tables);
        }
        return tables;
    },
    
    // ==========================================
    // دوال التوافق (للكود القديم)
    // ==========================================
    
    // للتوافق مع الكود القديم
    setOrders: function(orders) {
        this._setLocal('orders', orders);
    },
    
    setTables: function(tables) {
        this._setLocal('tables', tables);
    },
    
    // إضافة معرف المطعم للرابط
    addRestaurantToUrl: function(url) {
        const id = this.getRestaurantId();
        if (!id) return url;
        
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}r=${id}`;
    },
    
    // التحقق من تسجيل الدخول
    checkAuth: function() {
        const id = this.getRestaurantId();
        if (!id) {
            window.location.href = 'login-restaurant.html';
            return false;
        }
        
        const restaurant = this.getRestaurant();
        if (!restaurant) {
            window.location.href = 'login-restaurant.html';
            return false;
        }
        
        return true;
    },
    
    // تسجيل الخروج
    logout: function() {
        // إيقاف جميع المستمعين
        this.stopListeningToOrders();
        if (this._listeners.tables) {
            const path = this.getFirebasePath('tables');
            if (path) {
                firebase.database().ref(path).off('value', this._listeners.tables);
            }
        }
        
        localStorage.removeItem('restaurantLoggedIn');
        localStorage.removeItem('currentRestaurant');
        window.location.href = 'login-restaurant.html';
    },
    
    // تهيئة الاتصال
    init: function() {
        // مراقبة حالة الاتصال
        if (typeof firebase !== 'undefined') {
            firebase.database().ref('.info/connected').on('value', (snap) => {
                this._isOnline = snap.val() === true;
                console.log(this._isOnline ? '🟢 متصل بـ Firebase' : '🔴 غير متصل');
            });
        }
    }
};

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    RestaurantContext.init();
    
    const restaurantId = RestaurantContext.getRestaurantId();
    if (restaurantId) {
        // تحديث جميع الروابط الداخلية
        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.includes('login')) {
                if (!href.includes('r=')) {
                    link.href = RestaurantContext.addRestaurantToUrl(href);
                }
            }
        });
    }
});

// دوال مساعدة للتوافق مع الكود القديم
function getTables() { 
    return RestaurantContext.getTablesSync(); 
}

function getTable(id) { 
    return RestaurantContext.getTable(id); 
}

function getOrders() { 
    return RestaurantContext._cache.orders || RestaurantContext._getLocal('orders', []); 
}

function getOrderById(id) {
    const orders = getOrders();
    return orders.find(o => o.id == id);
}

function addOrder(order) {
    RestaurantContext.addOrder(order);
    return order;
}

function updateOrderStatus(orderId, status) {
    RestaurantContext.updateOrderStatus(orderId, status);
}

function deleteOrder(orderId) {
    RestaurantContext.deleteOrder(orderId);
}

function updateTable(tableId, updates) {
    RestaurantContext.updateTableStatus(tableId, updates.status, updates.currentOrder);
}

console.log('🔗 Restaurant Context متصل بـ Firebase');
