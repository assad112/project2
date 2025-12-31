/**
 * نظام إدارة المطعم - البيانات المشتركة
 * يستخدم localStorage لتخزين البيانات
 */

// ==========================================
// البيانات الافتراضية للمنيو
// ==========================================
const defaultMenuItems = [
    // ==================== المقبلات ====================
    {
        id: 1,
        name: 'حمص بالطحينة',
        category: 'appetizers',
        price: 1.5,
        description: 'حمص طازج مع طحينة وزيت زيتون',
        emoji: '🥙'
    },
    {
        id: 2,
        name: 'متبل',
        category: 'appetizers',
        price: 1.5,
        description: 'باذنجان مشوي مع طحينة',
        emoji: '🍆'
    },
    {
        id: 3,
        name: 'فتوش',
        category: 'appetizers',
        price: 1.8,
        description: 'سلطة فتوش طازجة بالخضار',
        emoji: '🥗'
    },
    {
        id: 4,
        name: 'تبولة',
        category: 'appetizers',
        price: 1.6,
        description: 'تبولة بالبقدونس الطازج',
        emoji: '🌿'
    },
    {
        id: 5,
        name: 'ورق عنب',
        category: 'appetizers',
        price: 2.0,
        description: 'ورق عنب محشي بالأرز',
        emoji: '🍃'
    },
    {
        id: 6,
        name: 'كبة مقلية',
        category: 'appetizers',
        price: 2.5,
        description: 'كبة لحم مقلية مقرمشة',
        emoji: '🥟'
    },
    {
        id: 7,
        name: 'سمبوسة لحم',
        category: 'appetizers',
        price: 1.2,
        description: 'سمبوسة محشية باللحم المفروم',
        emoji: '🔺'
    },
    {
        id: 8,
        name: 'سمبوسة جبن',
        category: 'appetizers',
        price: 1.0,
        description: 'سمبوسة محشية بالجبن',
        emoji: '🧀'
    },
    {
        id: 9,
        name: 'فلافل',
        category: 'appetizers',
        price: 1.5,
        description: 'فلافل مقرمشة مع الطحينة',
        emoji: '🧆'
    },
    {
        id: 10,
        name: 'سلطة يونانية',
        category: 'appetizers',
        price: 2.0,
        description: 'سلطة بالخيار والطماطم والجبن',
        emoji: '🥒'
    },
    
    // ==================== الأطباق الرئيسية ====================
    {
        id: 11,
        name: 'كبسة لحم',
        category: 'main',
        price: 4.5,
        description: 'كبسة لحم مع أرز بسمتي',
        emoji: '🍛'
    },
    {
        id: 12,
        name: 'كبسة دجاج',
        category: 'main',
        price: 3.5,
        description: 'كبسة دجاج مع أرز بسمتي',
        emoji: '🍗'
    },
    {
        id: 13,
        name: 'مندي لحم',
        category: 'main',
        price: 5.0,
        description: 'مندي لحم على الطريقة اليمنية',
        emoji: '🥘'
    },
    {
        id: 14,
        name: 'مندي دجاج',
        category: 'main',
        price: 3.8,
        description: 'مندي دجاج على الطريقة اليمنية',
        emoji: '🍗'
    },
    {
        id: 15,
        name: 'برياني لحم',
        category: 'main',
        price: 4.5,
        description: 'برياني لحم بالتوابل الهندية',
        emoji: '🍚'
    },
    {
        id: 16,
        name: 'برياني دجاج',
        category: 'main',
        price: 3.5,
        description: 'برياني دجاج بالتوابل الهندية',
        emoji: '🍚'
    },
    {
        id: 17,
        name: 'مقلوبة',
        category: 'main',
        price: 4.0,
        description: 'مقلوبة باللحم والخضار',
        emoji: '🥘'
    },
    {
        id: 18,
        name: 'منسف',
        category: 'main',
        price: 5.5,
        description: 'منسف أردني باللبن الجميد',
        emoji: '🍲'
    },
    {
        id: 19,
        name: 'مجبوس ربيان',
        category: 'main',
        price: 4.5,
        description: 'مجبوس ربيان خليجي',
        emoji: '🦐'
    },
    {
        id: 20,
        name: 'سمك مشوي',
        category: 'main',
        price: 6.0,
        description: 'سمك طازج مشوي مع الأرز',
        emoji: '🐟'
    },
    {
        id: 21,
        name: 'ستيك لحم',
        category: 'main',
        price: 7.0,
        description: 'ستيك لحم بقري مع الخضار',
        emoji: '🥩'
    },
    {
        id: 22,
        name: 'باستا ألفريدو',
        category: 'main',
        price: 3.5,
        description: 'باستا بصلصة الكريمة والدجاج',
        emoji: '🍝'
    },
    {
        id: 23,
        name: 'برجر لحم',
        category: 'main',
        price: 2.5,
        description: 'برجر لحم بقري مع البطاطس',
        emoji: '🍔'
    },
    {
        id: 24,
        name: 'برجر دجاج',
        category: 'main',
        price: 2.0,
        description: 'برجر دجاج مقرمش مع البطاطس',
        emoji: '🍔'
    },
    
    // ==================== المشويات ====================
    {
        id: 25,
        name: 'مشكل مشاوي',
        category: 'grills',
        price: 8.5,
        description: 'تشكيلة من اللحوم المشوية',
        emoji: '🥩'
    },
    {
        id: 26,
        name: 'كباب لحم',
        category: 'grills',
        price: 5.5,
        description: 'كباب لحم مشوي على الفحم',
        emoji: '🍢'
    },
    {
        id: 27,
        name: 'كفتة مشوية',
        category: 'grills',
        price: 4.5,
        description: 'كفتة لحم مشوية بالبهارات',
        emoji: '🍖'
    },
    {
        id: 28,
        name: 'شيش طاووق',
        category: 'grills',
        price: 4.0,
        description: 'دجاج متبل مشوي على الفحم',
        emoji: '🍗'
    },
    {
        id: 29,
        name: 'ريش غنم',
        category: 'grills',
        price: 7.5,
        description: 'ريش غنم مشوية على الفحم',
        emoji: '🍖'
    },
    {
        id: 30,
        name: 'دجاج مشوي كامل',
        category: 'grills',
        price: 5.0,
        description: 'دجاج كامل مشوي على الفحم',
        emoji: '🍗'
    },
    {
        id: 31,
        name: 'نصف دجاج مشوي',
        category: 'grills',
        price: 2.8,
        description: 'نصف دجاج مشوي على الفحم',
        emoji: '🍗'
    },
    {
        id: 32,
        name: 'تكة لحم',
        category: 'grills',
        price: 5.0,
        description: 'قطع لحم متبلة مشوية',
        emoji: '🥩'
    },
    {
        id: 33,
        name: 'شقف لحم',
        category: 'grills',
        price: 6.0,
        description: 'شرائح لحم مشوية بالبصل',
        emoji: '🥩'
    },
    {
        id: 34,
        name: 'جوانح دجاج',
        category: 'grills',
        price: 3.0,
        description: 'جوانح دجاج مشوية بالصوص',
        emoji: '🍗'
    },
    
    // ==================== المشروبات ====================
    {
        id: 35,
        name: 'عصير برتقال',
        category: 'drinks',
        price: 1.0,
        description: 'عصير برتقال طازج',
        emoji: '🍊'
    },
    {
        id: 36,
        name: 'عصير مانجو',
        category: 'drinks',
        price: 1.2,
        description: 'عصير مانجو طبيعي',
        emoji: '🥭'
    },
    {
        id: 37,
        name: 'عصير فراولة',
        category: 'drinks',
        price: 1.2,
        description: 'عصير فراولة طازج',
        emoji: '🍓'
    },
    {
        id: 38,
        name: 'عصير ليمون بالنعناع',
        category: 'drinks',
        price: 0.8,
        description: 'ليمون طازج بالنعناع',
        emoji: '🍋'
    },
    {
        id: 39,
        name: 'كوكتيل فواكه',
        category: 'drinks',
        price: 1.5,
        description: 'مزيج من الفواكه الطازجة',
        emoji: '🍹'
    },
    {
        id: 40,
        name: 'شاي أحمر',
        category: 'drinks',
        price: 0.5,
        description: 'شاي أحمر ساخن',
        emoji: '🍵'
    },
    {
        id: 41,
        name: 'شاي أخضر',
        category: 'drinks',
        price: 0.5,
        description: 'شاي أخضر ساخن',
        emoji: '🍵'
    },
    {
        id: 42,
        name: 'شاي كرك',
        category: 'drinks',
        price: 0.6,
        description: 'شاي كرك بالحليب والهيل',
        emoji: '☕'
    },
    {
        id: 43,
        name: 'قهوة عربية',
        category: 'drinks',
        price: 0.8,
        description: 'قهوة عربية مع التمر',
        emoji: '☕'
    },
    {
        id: 44,
        name: 'قهوة تركية',
        category: 'drinks',
        price: 0.8,
        description: 'قهوة تركية أصلية',
        emoji: '☕'
    },
    {
        id: 45,
        name: 'كابتشينو',
        category: 'drinks',
        price: 1.2,
        description: 'كابتشينو إيطالي',
        emoji: '☕'
    },
    {
        id: 46,
        name: 'لاتيه',
        category: 'drinks',
        price: 1.2,
        description: 'لاتيه بالحليب الكريمي',
        emoji: '☕'
    },
    {
        id: 47,
        name: 'موكا',
        category: 'drinks',
        price: 1.5,
        description: 'قهوة موكا بالشوكولاتة',
        emoji: '☕'
    },
    {
        id: 48,
        name: 'ماء معدني',
        category: 'drinks',
        price: 0.3,
        description: 'ماء معدني صغير',
        emoji: '💧'
    },
    {
        id: 49,
        name: 'بيبسي',
        category: 'drinks',
        price: 0.4,
        description: 'بيبسي بارد',
        emoji: '🥤'
    },
    {
        id: 50,
        name: 'سفن أب',
        category: 'drinks',
        price: 0.4,
        description: 'سفن أب بارد',
        emoji: '🥤'
    },
    
    // ==================== الحلويات ====================
    {
        id: 51,
        name: 'كنافة نابلسية',
        category: 'desserts',
        price: 2.0,
        description: 'كنافة بالجبن الحلو',
        emoji: '🧀'
    },
    {
        id: 52,
        name: 'كنافة بالقشطة',
        category: 'desserts',
        price: 2.0,
        description: 'كنافة بالقشطة اللذيذة',
        emoji: '🍮'
    },
    {
        id: 53,
        name: 'بقلاوة',
        category: 'desserts',
        price: 1.8,
        description: 'بقلاوة بالفستق الحلبي',
        emoji: '🥜'
    },
    {
        id: 54,
        name: 'أم علي',
        category: 'desserts',
        price: 1.5,
        description: 'أم علي بالمكسرات والزبيب',
        emoji: '🥛'
    },
    {
        id: 55,
        name: 'بسبوسة',
        category: 'desserts',
        price: 1.0,
        description: 'بسبوسة بالقطر',
        emoji: '🍰'
    },
    {
        id: 56,
        name: 'هريسة',
        category: 'desserts',
        price: 1.0,
        description: 'هريسة عمانية تقليدية',
        emoji: '🍮'
    },
    {
        id: 57,
        name: 'لقيمات',
        category: 'desserts',
        price: 1.5,
        description: 'لقيمات بالعسل والسمسم',
        emoji: '🍩'
    },
    {
        id: 58,
        name: 'آيس كريم فانيلا',
        category: 'desserts',
        price: 1.0,
        description: 'آيس كريم فانيلا طبيعي',
        emoji: '🍨'
    },
    {
        id: 59,
        name: 'آيس كريم شوكولاتة',
        category: 'desserts',
        price: 1.0,
        description: 'آيس كريم شوكولاتة غني',
        emoji: '🍫'
    },
    {
        id: 60,
        name: 'آيس كريم مانجو',
        category: 'desserts',
        price: 1.2,
        description: 'آيس كريم مانجو طبيعي',
        emoji: '🥭'
    },
    {
        id: 61,
        name: 'كيك شوكولاتة',
        category: 'desserts',
        price: 2.0,
        description: 'كيك شوكولاتة غني بالصوص',
        emoji: '🍰'
    },
    {
        id: 62,
        name: 'تشيز كيك',
        category: 'desserts',
        price: 2.5,
        description: 'تشيز كيك بالفراولة',
        emoji: '🍰'
    },
    {
        id: 63,
        name: 'كريم كراميل',
        category: 'desserts',
        price: 1.2,
        description: 'كريم كراميل منزلي',
        emoji: '🍮'
    },
    {
        id: 64,
        name: 'مهلبية',
        category: 'desserts',
        price: 1.0,
        description: 'مهلبية بماء الورد',
        emoji: '🥛'
    },
    {
        id: 65,
        name: 'فواكه طازجة',
        category: 'desserts',
        price: 2.0,
        description: 'تشكيلة فواكه موسمية',
        emoji: '🍇'
    }
];

// ==========================================
// تهيئة البيانات
// ==========================================
function initializeData() {
    // تحديث المنيو بالمنتجات الجديدة (إعادة تحميل دائماً)
    localStorage.setItem('menuItems', JSON.stringify(defaultMenuItems));
    
    // تهيئة الطاولات
    if (!localStorage.getItem('tables')) {
        const tables = [];
        for (let i = 1; i <= 10; i++) {
            tables.push({
                id: i,
                status: 'available', // available, occupied, pending
                currentOrder: null
            });
        }
        localStorage.setItem('tables', JSON.stringify(tables));
    }
    
    // تهيئة الطلبات
    if (!localStorage.getItem('orders')) {
        localStorage.setItem('orders', JSON.stringify([]));
    }
    
    // تهيئة الإعدادات
    if (!localStorage.getItem('settings')) {
        localStorage.setItem('settings', JSON.stringify({
            tablesCount: 10,
            restaurantName: 'مطعم الذواقة',
            currency: 'ر.ع'
        }));
    }
}

// ==========================================
// وظائف المنيو
// ==========================================
function getMenuItems() {
    return JSON.parse(localStorage.getItem('menuItems')) || [];
}

function getMenuItemsByCategory(category) {
    const items = getMenuItems();
    if (category === 'all') return items;
    return items.filter(item => item.category === category);
}

function addMenuItem(item) {
    const items = getMenuItems();
    item.id = Date.now();
    items.push(item);
    localStorage.setItem('menuItems', JSON.stringify(items));
    return item;
}

function updateMenuItem(id, updatedItem) {
    const items = getMenuItems();
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
        items[index] = { ...items[index], ...updatedItem };
        localStorage.setItem('menuItems', JSON.stringify(items));
        return true;
    }
    return false;
}

function deleteMenuItem(id) {
    const items = getMenuItems();
    const filtered = items.filter(item => item.id !== id);
    localStorage.setItem('menuItems', JSON.stringify(filtered));
}

// ==========================================
// وظائف الطاولات
// ==========================================
function getTables() {
    return JSON.parse(localStorage.getItem('tables')) || [];
}

function getTable(id) {
    const tables = getTables();
    return tables.find(table => table.id === id);
}

function updateTable(id, updates) {
    const tables = getTables();
    const index = tables.findIndex(table => table.id === id);
    if (index !== -1) {
        tables[index] = { ...tables[index], ...updates };
        localStorage.setItem('tables', JSON.stringify(tables));
        return true;
    }
    return false;
}

function setTablesCount(count) {
    const currentTables = getTables();
    const newTables = [];
    
    for (let i = 1; i <= count; i++) {
        const existing = currentTables.find(t => t.id === i);
        if (existing) {
            newTables.push(existing);
        } else {
            newTables.push({
                id: i,
                status: 'available',
                currentOrder: null
            });
        }
    }
    
    localStorage.setItem('tables', JSON.stringify(newTables));
}

// ==========================================
// وظائف الطلبات
// ==========================================
function getOrders() {
    return JSON.parse(localStorage.getItem('orders')) || [];
}

function getOrdersByStatus(status) {
    const orders = getOrders();
    if (status === 'all') return orders;
    return orders.filter(order => order.status === status);
}

function getOrderById(id) {
    const orders = getOrders();
    return orders.find(order => order.id === id);
}

function addOrder(order) {
    const orders = getOrders();
    order.id = Date.now();
    order.createdAt = new Date().toISOString();
    order.status = 'new';
    orders.unshift(order);
    localStorage.setItem('orders', JSON.stringify(orders));
    
    // تحديث حالة الطاولة
    updateTable(order.tableId, {
        status: 'pending',
        currentOrder: order.id
    });
    
    return order;
}

function updateOrderStatus(id, status) {
    const orders = getOrders();
    const index = orders.findIndex(order => order.id === id);
    if (index !== -1) {
        orders[index].status = status;
        orders[index].updatedAt = new Date().toISOString();
        
        // إذا اكتمل الطلب، حرر الطاولة
        if (status === 'completed') {
            updateTable(orders[index].tableId, {
                status: 'available',
                currentOrder: null
            });
        } else if (status === 'preparing') {
            updateTable(orders[index].tableId, {
                status: 'occupied'
            });
        }
        
        localStorage.setItem('orders', JSON.stringify(orders));
        return true;
    }
    return false;
}

function deleteOrder(id) {
    const orders = getOrders();
    const order = orders.find(o => o.id === id);
    if (order) {
        updateTable(order.tableId, {
            status: 'available',
            currentOrder: null
        });
    }
    const filtered = orders.filter(o => o.id !== id);
    localStorage.setItem('orders', JSON.stringify(filtered));
}

// ==========================================
// وظائف الإحصائيات
// ==========================================
function getStatistics(period = 'all') {
    const orders = getOrders();
    let filteredOrders = orders;
    
    const now = new Date();
    
    if (period === 'today') {
        const today = now.toDateString();
        filteredOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    } else if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredOrders = orders.filter(o => new Date(o.createdAt) >= weekAgo);
    } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredOrders = orders.filter(o => new Date(o.createdAt) >= monthAgo);
    }
    
    const completedOrders = filteredOrders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    
    // أكثر صنف مطلوب
    const itemCounts = {};
    filteredOrders.forEach(order => {
        order.items.forEach(item => {
            if (!itemCounts[item.name]) {
                itemCounts[item.name] = 0;
            }
            itemCounts[item.name] += item.quantity;
        });
    });
    
    let bestseller = '-';
    let maxCount = 0;
    Object.entries(itemCounts).forEach(([name, count]) => {
        if (count > maxCount) {
            maxCount = count;
            bestseller = name;
        }
    });
    
    return {
        totalOrders: filteredOrders.length,
        completedOrders: completedOrders.length,
        totalRevenue: totalRevenue,
        averageOrder: completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0,
        bestseller: bestseller
    };
}

// ==========================================
// وظائف مساعدة
// ==========================================
function formatPrice(price) {
    return `${price} ر.ع`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getCategoryName(category) {
    const categories = {
        'appetizers': 'المقبلات',
        'main': 'الأطباق الرئيسية',
        'grills': 'المشويات',
        'drinks': 'المشروبات',
        'desserts': 'الحلويات'
    };
    return categories[category] || category;
}

function getStatusName(status) {
    const statuses = {
        'new': 'جديد',
        'preparing': 'قيد التحضير',
        'ready': 'جاهز',
        'completed': 'مكتمل'
    };
    return statuses[status] || status;
}

// تهيئة البيانات عند تحميل الصفحة
initializeData();
