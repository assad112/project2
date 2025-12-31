/**
 * نظام إدارة المطعم - صفحة الكاشير
 */

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    loadOrders();
    updateStats();
    setupEventListeners();
    
    // تحديث تلقائي كل 3 ثواني
    setInterval(() => {
        loadOrders();
        updateStats();
    }, 3000);
});

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // فلترة الطلبات
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            loadOrders();
        });
    });
    
    // إغلاق Modal
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-print').addEventListener('click', printOrder);
}

// تحميل الطلبات
function loadOrders() {
    const container = document.getElementById('orders-list');
    let orders = getOrders();
    
    // فلترة
    if (currentFilter !== 'all') {
        orders = orders.filter(o => o.status === currentFilter);
    }
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-receipt"></i>
                <p>لا توجد طلبات ${currentFilter !== 'all' ? getStatusName(currentFilter) : ''}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-card" data-id="${order.id}">
            <div class="order-header">
                <div class="order-info">
                    <h3><i class="fas fa-chair"></i> طاولة ${order.tableId}</h3>
                    <span><i class="fas fa-clock"></i> ${formatTime(order.createdAt)}</span>
                </div>
                <span class="order-status ${order.status}">${getStatusName(order.status)}</span>
            </div>
            
            <div class="order-items">
                ${order.items.slice(0, 3).map(item => `
                    <div class="order-item">
                        <span>${item.emoji || '🍽️'} ${item.name}</span>
                        <span>× ${item.quantity}</span>
                    </div>
                `).join('')}
                ${order.items.length > 3 ? `
                    <div class="order-item" style="color: var(--light-text);">
                        <span>+ ${order.items.length - 3} أصناف أخرى</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="order-footer">
                <span class="order-total">${formatPrice(order.total)}</span>
                <div class="order-actions">
                    ${getOrderActions(order)}
                </div>
            </div>
        </div>
    `).join('');
    
    // تشغيل صوت للطلبات الجديدة
    const newOrders = orders.filter(o => o.status === 'new');
    if (newOrders.length > 0 && document.hidden === false) {
        playNotificationSound();
    }
}

// الحصول على أزرار الإجراءات حسب حالة الطلب
function getOrderActions(order) {
    switch (order.status) {
        case 'new':
            return `
                <button class="action-btn accept" onclick="acceptOrder(${order.id})">
                    <i class="fas fa-fire"></i> بدء التحضير
                </button>
            `;
        case 'preparing':
            return `
                <button class="action-btn complete" onclick="markReady(${order.id})">
                    <i class="fas fa-check"></i> جاهز
                </button>
            `;
        case 'ready':
            return `
                <button class="action-btn accept" onclick="completeOrder(${order.id})">
                    <i class="fas fa-check-double"></i> تم التسليم
                </button>
            `;
        case 'completed':
            return `
                <button class="action-btn print" onclick="showOrderDetails(${order.id})">
                    <i class="fas fa-eye"></i> عرض
                </button>
            `;
        default:
            return '';
    }
}

// قبول الطلب (بدء التحضير)
function acceptOrder(orderId) {
    updateOrderStatus(orderId, 'preparing');
    showNotification('تم بدء تحضير الطلب');
    loadOrders();
    updateStats();
}

// تجهيز الطلب
function markReady(orderId) {
    updateOrderStatus(orderId, 'ready');
    showNotification('الطلب جاهز للتسليم');
    loadOrders();
    updateStats();
}

// إكمال الطلب
function completeOrder(orderId) {
    updateOrderStatus(orderId, 'completed');
    showNotification('تم إكمال الطلب بنجاح');
    loadOrders();
    updateStats();
}

// عرض تفاصيل الطلب
function showOrderDetails(orderId) {
    const order = getOrderById(orderId);
    if (!order) return;
    
    const modal = document.getElementById('order-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    modalTitle.textContent = `طلب طاولة ${order.tableId}`;
    modalContent.innerHTML = `
        <div style="margin-bottom: 10px;">
            <strong>التاريخ:</strong> ${formatDate(order.createdAt)}
        </div>
        <div style="margin-bottom: 10px;">
            <strong>الحالة:</strong> 
            <span class="order-status ${order.status}">${getStatusName(order.status)}</span>
        </div>
        <hr style="border: 1px solid var(--light-bg); margin: 15px 0;">
        <div>
            ${order.items.map(item => `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--light-bg);">
                    <span>${item.emoji || '🍽️'} ${item.name} × ${item.quantity}</span>
                    <span>${formatPrice(item.price * item.quantity)}</span>
                </div>
            `).join('')}
        </div>
        <div style="display: flex; justify-content: space-between; padding: 15px 0; font-size: 1.2rem; font-weight: 700;">
            <span>المجموع:</span>
            <span style="color: var(--primary-color);">${formatPrice(order.total)}</span>
        </div>
    `;
    
    document.getElementById('modal-print').dataset.orderId = orderId;
    modal.classList.add('active');
}

// إغلاق النافذة
function closeModal() {
    document.getElementById('order-modal').classList.remove('active');
}

// طباعة الطلب
function printOrder() {
    const orderId = parseInt(document.getElementById('modal-print').dataset.orderId);
    const order = getOrderById(orderId);
    if (!order) return;
    
    const printContent = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>فاتورة - طاولة ${order.tableId}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    max-width: 300px;
                    margin: 0 auto;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                }
                .item {
                    display: flex;
                    justify-content: space-between;
                    padding: 5px 0;
                    border-bottom: 1px solid #eee;
                }
                .total {
                    display: flex;
                    justify-content: space-between;
                    font-weight: bold;
                    font-size: 1.2em;
                    border-top: 2px dashed #000;
                    margin-top: 10px;
                    padding-top: 10px;
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 0.9em;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>مطعم الذواقة</h2>
                <p>طاولة ${order.tableId}</p>
                <p>${formatDate(order.createdAt)}</p>
            </div>
            <div>
                ${order.items.map(item => `
                    <div class="item">
                        <span>${item.name} × ${item.quantity}</span>
                        <span>${item.price * item.quantity} ر.ع</span>
                    </div>
                `).join('')}
            </div>
            <div class="total">
                <span>المجموع:</span>
                <span>${order.total} ر.ع</span>
            </div>
            <div class="footer">
                <p>شكراً لزيارتكم</p>
                <p>نتمنى لكم وجبة شهية</p>
            </div>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// تحديث الإحصائيات
function updateStats() {
    const orders = getOrders();
    const stats = getStatistics('today');
    
    const newOrders = orders.filter(o => o.status === 'new').length;
    const preparingOrders = orders.filter(o => o.status === 'preparing').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    
    document.getElementById('new-orders').textContent = newOrders;
    document.getElementById('preparing-orders').textContent = preparingOrders;
    document.getElementById('completed-orders').textContent = completedOrders;
    document.getElementById('today-revenue').textContent = stats.totalRevenue;
}

// تشغيل صوت الإشعار
function playNotificationSound() {
    try {
        const audio = document.getElementById('notification-sound');
        if (audio) {
            audio.volume = 0.5;
            audio.play().catch(() => {});
        }
    } catch (e) {
        // تجاهل الأخطاء
    }
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
