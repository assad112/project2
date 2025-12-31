/**
 * نظام إدارة المطعم - صفحة النادل (إدارة الطاولات)
 * محسّن للأداء مع منع الطلبات المكررة وتجميع DOM
 */

// ==========================================
// نظام منع الطلبات المكررة (Request Deduplication)
// ==========================================
const RequestDedup = {
    cache: new Map(),
    ttl: 2000, // 2 ثانية
    
    async fetch(key, fetchFn) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.ttl) {
            return cached.data;
        }
        const data = await fetchFn();
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
    },
    
    invalidate(key) {
        if (key) this.cache.delete(key);
        else this.cache.clear();
    }
};

// ==========================================
// نظام تجميع تحديثات DOM (DOM Batching)
// ==========================================
const DOMBatcher = {
    queue: [],
    scheduled: false,
    
    add(fn) {
        this.queue.push(fn);
        if (!this.scheduled) {
            this.scheduled = true;
            requestAnimationFrame(() => this.flush());
        }
    },
    
    flush() {
        const updates = this.queue.splice(0);
        updates.forEach(fn => fn());
        this.scheduled = false;
    }
};

// ==========================================
// نظام مقارنة البيانات (لتجنب التحديث غير الضروري)
// ==========================================
let lastTablesHash = null;
let lastOrdersHash = null;

function hashData(data) {
    return JSON.stringify(data);
}

document.addEventListener('DOMContentLoaded', function() {
    loadTables();
    updateStats();
    setupEventListeners();
    
    // تحديث ذكي كل 5 ثواني (فقط إذا تغيرت البيانات)
    setInterval(() => {
        smartUpdate();
    }, 5000);
});

// تحديث ذكي - فقط عند تغير البيانات
function smartUpdate() {
    const tables = getTables();
    const orders = getOrders();
    
    const tablesHash = hashData(tables);
    const ordersHash = hashData(orders);
    
    if (tablesHash !== lastTablesHash) {
        lastTablesHash = tablesHash;
        DOMBatcher.add(() => loadTables(tables));
    }
    
    if (ordersHash !== lastOrdersHash || tablesHash !== lastTablesHash) {
        lastOrdersHash = ordersHash;
        DOMBatcher.add(() => updateStats(tables, orders));
    }
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-action').addEventListener('click', handleModalAction);
}

// تحميل الطاولات (مع تجميع DOM)
function loadTables(tables) {
    tables = tables || getTables();
    const container = document.getElementById('tables-grid');
    
    // استخدام DocumentFragment لتحسين الأداء
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    tempDiv.innerHTML = tables.map(table => {
        let statusText = '';
        let statusClass = '';
        
        switch (table.status) {
            case 'available':
                statusText = 'متاحة';
                statusClass = 'available';
                break;
            case 'occupied':
                statusText = 'مشغولة';
                statusClass = 'occupied';
                break;
            case 'pending':
                statusText = 'طلب جديد!';
                statusClass = 'pending';
                break;
        }
        
        return `
            <div class="table-card ${statusClass}" onclick="showTableDetails(${table.id})">
                <div class="table-number">
                    <i class="fas fa-chair"></i>
                    ${table.id}
                </div>
                <span class="table-status">${statusText}</span>
            </div>
        `;
    }).join('');
    
    // تحديث DOM مرة واحدة
    container.innerHTML = tempDiv.innerHTML;
}

// تحديث الإحصائيات (مع cache)
function updateStats(tables, orders) {
    tables = tables || getTables();
    orders = orders || getOrders();
    
    const available = tables.filter(t => t.status === 'available').length;
    const occupied = tables.filter(t => t.status === 'occupied').length;
    const pending = tables.filter(t => t.status === 'pending').length;
    
    // تحديث فقط إذا تغيرت القيم
    const elements = {
        'available-count': available,
        'occupied-count': occupied,
        'pending-count': pending,
        'total-orders': orders.length
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el && el.textContent !== String(value)) {
            el.textContent = value;
        }
    });
}

// عرض تفاصيل الطاولة
function showTableDetails(tableId) {
    const table = getTable(tableId);
    const modal = document.getElementById('table-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalAction = document.getElementById('modal-action');
    
    modalTitle.textContent = `طاولة ${tableId}`;
    
    if (table.status === 'available') {
        modalContent.innerHTML = `
            <p style="text-align: center; color: var(--accent-color); font-size: 3rem; margin: 20px 0;">
                <i class="fas fa-check-circle"></i>
            </p>
            <p style="text-align: center; color: var(--light-text);">هذه الطاولة متاحة</p>
        `;
        modalAction.textContent = 'إنشاء طلب جديد';
        modalAction.dataset.action = 'new-order';
        modalAction.dataset.tableId = tableId;
    } else {
        const order = getOrderById(table.currentOrder);
        if (order) {
            modalContent.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <strong>حالة الطلب:</strong>
                    <span class="order-status ${order.status}" style="margin-right: 10px;">
                        ${getStatusName(order.status)}
                    </span>
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>الوقت:</strong> ${formatTime(order.createdAt)}
                </div>
                <div style="border-top: 1px solid var(--light-bg); padding-top: 10px;">
                    <strong>الطلب:</strong>
                    ${order.items.map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                            <span>${item.emoji || '🍽️'} ${item.name} × ${item.quantity}</span>
                            <span>${formatPrice(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="border-top: 2px solid var(--light-bg); margin-top: 10px; padding-top: 10px;">
                    <strong style="font-size: 1.2rem;">المجموع: ${formatPrice(order.total)}</strong>
                </div>
            `;
            
            if (order.status === 'ready') {
                modalAction.textContent = 'تم التوصيل للطاولة';
                modalAction.dataset.action = 'complete';
                modalAction.dataset.orderId = order.id;
            } else {
                modalAction.textContent = 'تحرير الطاولة';
                modalAction.dataset.action = 'free-table';
                modalAction.dataset.tableId = tableId;
                modalAction.dataset.orderId = order.id;
            }
        } else {
            modalContent.innerHTML = `
                <p style="text-align: center; color: var(--light-text);">
                    لا توجد تفاصيل للطلب
                </p>
            `;
            modalAction.textContent = 'تحرير الطاولة';
            modalAction.dataset.action = 'free-table';
            modalAction.dataset.tableId = tableId;
        }
    }
    
    modal.classList.add('active');
}

// إغلاق النافذة
function closeModal() {
    document.getElementById('table-modal').classList.remove('active');
}

// معالجة إجراء النافذة
function handleModalAction() {
    const action = this.dataset.action;
    const tableId = parseInt(this.dataset.tableId);
    const orderId = parseInt(this.dataset.orderId);
    
    switch (action) {
        case 'new-order':
            window.location.href = `menu.html?table=${tableId}`;
            break;
            
        case 'free-table':
            if (orderId) {
                deleteOrder(orderId);
            }
            updateTable(tableId, {
                status: 'available',
                currentOrder: null
            });
            showNotification('تم تحرير الطاولة');
            break;
            
        case 'complete':
            updateOrderStatus(orderId, 'completed');
            showNotification('تم إكمال الطلب');
            break;
    }
    
    closeModal();
    loadTables();
    updateStats();
}

// عرض إشعار
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    
    notificationText.textContent = message;
    notification.className = 'notification show' + (type === 'error' ? ' error' : '');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
