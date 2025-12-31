/**
 * نظام إدارة المطعم - لوحة الإدارة
 * محسّن للأداء مع Lazy Loading وتجميع DOM
 */

let currentTab = 'menu-management';

// ==========================================
// نظام Lazy Loading للتبويبات
// ==========================================
const LazyLoader = {
    loaded: new Set(),
    
    async load(tabId) {
        if (this.loaded.has(tabId)) return;
        
        switch(tabId) {
            case 'menu-management':
                await this.loadMenuTab();
                break;
            case 'tables-management':
                await this.loadTablesTab();
                break;
            case 'reports':
                await this.loadReportsTab();
                break;
            case 'qr-codes':
                await this.loadQRTab();
                break;
        }
        this.loaded.add(tabId);
    },
    
    async loadMenuTab() {
        loadMenuItems();
    },
    
    async loadTablesTab() {
        loadTables();
    },
    
    async loadReportsTab() {
        loadReports();
    },
    
    async loadQRTab() {
        generateQRCodes();
    },
    
    invalidate(tabId) {
        if (tabId) this.loaded.delete(tabId);
        else this.loaded.clear();
    }
};

// ==========================================
// نظام تجميع DOM
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

document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    // تحميل التبويب الأول فقط (Lazy Loading)
    LazyLoader.load('menu-management');
    setupEventListeners();
});

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // التبويبات مع Lazy Loading
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const tabId = this.dataset.tab;
            document.querySelectorAll('.admin-section').forEach(section => {
                section.style.display = section.id === tabId ? 'block' : 'none';
            });
            
            currentTab = tabId;
            
            // Lazy Loading للتبويب
            LazyLoader.load(tabId);
        });
    });
    
    // نموذج إضافة صنف
    document.getElementById('add-item-form').addEventListener('submit', handleAddItem);
    
    // نموذج الطاولات
    document.getElementById('tables-form').addEventListener('submit', handleTablesUpdate);
    
    // نموذج تعديل صنف
    document.getElementById('edit-item-form').addEventListener('submit', handleEditItem);
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    
    // فترة التقارير
    document.getElementById('report-period').addEventListener('change', loadReports);
}

// تحميل الإحصائيات
function loadStats() {
    const stats = getStatistics('all');
    const menuItems = getMenuItems();
    const tables = getTables();
    
    document.getElementById('total-orders').textContent = stats.totalOrders;
    document.getElementById('total-revenue').textContent = stats.totalRevenue + ' ر.ع';
    document.getElementById('total-tables').textContent = tables.length;
    document.getElementById('total-items').textContent = menuItems.length;
}

// تحميل قائمة الأصناف
function loadMenuItems() {
    const container = document.getElementById('items-table');
    const items = getMenuItems();
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils"></i>
                <p>لا توجد أصناف</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = items.map(item => `
        <div class="item-row">
            <div class="item-details">
                <h4>${item.emoji || '🍽️'} ${item.name}</h4>
                <p>${getCategoryName(item.category)} - ${formatPrice(item.price)}</p>
            </div>
            <div class="item-actions">
                <button class="edit-btn" onclick="editItem(${item.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="deleteItem(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// إضافة صنف جديد
function handleAddItem(e) {
    e.preventDefault();
    
    const item = {
        name: document.getElementById('item-name').value,
        category: document.getElementById('item-category').value,
        price: parseFloat(document.getElementById('item-price').value),
        description: document.getElementById('item-desc').value,
        emoji: document.getElementById('item-emoji').value || '🍽️'
    };
    
    addMenuItem(item);
    
    // تنظيف النموذج
    e.target.reset();
    
    // تحديث القائمة
    loadMenuItems();
    loadStats();
    
    showNotification('تم إضافة الصنف بنجاح');
}

// تعديل صنف
function editItem(itemId) {
    const items = getMenuItems();
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    document.getElementById('edit-item-id').value = item.id;
    document.getElementById('edit-name').value = item.name;
    document.getElementById('edit-category').value = item.category;
    document.getElementById('edit-price').value = item.price;
    document.getElementById('edit-desc').value = item.description || '';
    document.getElementById('edit-emoji').value = item.emoji || '';
    
    document.getElementById('edit-modal').classList.add('active');
}

// حفظ تعديل الصنف
function handleEditItem(e) {
    e.preventDefault();
    
    const itemId = parseInt(document.getElementById('edit-item-id').value);
    const updatedItem = {
        name: document.getElementById('edit-name').value,
        category: document.getElementById('edit-category').value,
        price: parseFloat(document.getElementById('edit-price').value),
        description: document.getElementById('edit-desc').value,
        emoji: document.getElementById('edit-emoji').value || '🍽️'
    };
    
    updateMenuItem(itemId, updatedItem);
    closeEditModal();
    loadMenuItems();
    
    showNotification('تم تحديث الصنف');
}

// إغلاق نافذة التعديل
function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
}

// حذف صنف
function deleteItem(itemId) {
    if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
        deleteMenuItem(itemId);
        loadMenuItems();
        loadStats();
        showNotification('تم حذف الصنف');
    }
}

// تحميل الطاولات
function loadTables() {
    const tables = getTables();
    document.getElementById('tables-count').value = tables.length;
    
    const container = document.getElementById('admin-tables-grid');
    container.innerHTML = tables.map(table => {
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
                statusText = 'طلب جديد';
                statusClass = 'pending';
                break;
        }
        
        return `
            <div class="table-card ${statusClass}">
                <div class="table-number">${table.id}</div>
                <span class="table-status">${statusText}</span>
            </div>
        `;
    }).join('');
}

// تحديث عدد الطاولات
function handleTablesUpdate(e) {
    e.preventDefault();
    
    const count = parseInt(document.getElementById('tables-count').value);
    if (count < 1 || count > 50) {
        showNotification('عدد الطاولات يجب أن يكون بين 1 و 50', 'error');
        return;
    }
    
    setTablesCount(count);
    loadTables();
    loadStats();
    generateQRCodes();
    
    showNotification('تم تحديث عدد الطاولات');
}

// تحميل التقارير
function loadReports() {
    const period = document.getElementById('report-period').value;
    const stats = getStatistics(period);
    
    document.getElementById('report-orders').textContent = stats.totalOrders;
    document.getElementById('report-revenue').textContent = stats.totalRevenue + ' ر.ع';
    document.getElementById('report-bestseller').textContent = stats.bestseller;
    document.getElementById('report-average').textContent = stats.averageOrder + ' ر.ع';
    
    // آخر الطلبات
    const orders = getOrders().slice(0, 5);
    const container = document.getElementById('recent-orders');
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>لا توجد طلبات</p>
            </div>
        `;
    } else {
        container.innerHTML = orders.map(order => `
            <div class="item-row">
                <div class="item-details">
                    <h4><i class="fas fa-chair"></i> طاولة ${order.tableId}</h4>
                    <p>${formatTime(order.createdAt)} - ${getStatusName(order.status)}</p>
                </div>
                <div>
                    <strong style="color: var(--primary-color);">${formatPrice(order.total)}</strong>
                </div>
            </div>
        `).join('');
    }
}

// توليد أكواد QR
function generateQRCodes() {
    const container = document.getElementById('qr-codes-grid');
    const tables = getTables();
    
    // الحصول على رابط المنيو
    const baseUrl = window.location.origin + '/menu.html';
    
    container.innerHTML = tables.map(table => `
        <div class="table-card" style="padding: 15px; text-align: center;">
            <div style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 10px; border-radius: 10px; margin-bottom: 10px;">
                <div style="font-size: 0.9rem;">طاولة رقم</div>
                <div style="font-size: 2.5rem; font-weight: 700;">${table.id}</div>
            </div>
            <div id="qr-table-${table.id}" style="display: flex; justify-content: center; background: white; padding: 10px; border-radius: 10px; min-height: 140px; align-items: center;">
                <div class="spinner"></div>
            </div>
            <p style="font-size: 0.8rem; color: var(--light-text); margin: 10px 0;">امسح للوصول للمنيو</p>
            <button onclick="downloadQR(${table.id})" style="margin-top: 5px; padding: 8px 15px; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; width: 100%;">
                <i class="fas fa-download"></i> تحميل
            </button>
        </div>
    `).join('');
    
    // توليد QR لكل طاولة
    tables.forEach(table => {
        const url = `${baseUrl}?table=${table.id}`;
        const qrContainer = document.getElementById(`qr-table-${table.id}`);
        
        // استخدام مكتبة QRCode
        if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(document.createElement('canvas'), url, {
                width: 120,
                margin: 1,
                color: {
                    dark: '#2c3e50',
                    light: '#ffffff'
                }
            }, function(error, canvas) {
                qrContainer.innerHTML = '';
                if (!error) {
                    canvas.id = `qr-canvas-${table.id}`;
                    canvas.style.borderRadius = '8px';
                    qrContainer.appendChild(canvas);
                } else {
                    // استخدام API خارجي كبديل
                    const img = document.createElement('img');
                    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}`;
                    img.id = `qr-canvas-${table.id}`;
                    img.style.borderRadius = '8px';
                    img.onload = () => qrContainer.innerHTML = '';
                    qrContainer.appendChild(img);
                }
            });
        } else {
            // استخدام API خارجي
            qrContainer.innerHTML = `
                <img 
                    id="qr-canvas-${table.id}" 
                    src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}" 
                    style="border-radius: 8px;"
                    alt="QR Code طاولة ${table.id}"
                />
            `;
        }
    });
    
    showNotification('تم توليد الباركودات بنجاح');
}

// تحميل QR Code
function downloadQR(tableId) {
    const element = document.getElementById(`qr-canvas-${tableId}`);
    if (!element) {
        showNotification('الرجاء توليد الباركود أولاً', 'error');
        return;
    }
    
    const link = document.createElement('a');
    link.download = `table-${tableId}-qr.png`;
    
    // التحقق إذا كان canvas أو img
    if (element.tagName === 'CANVAS') {
        link.href = element.toDataURL('image/png');
    } else if (element.tagName === 'IMG') {
        // تحويل الصورة إلى canvas ثم تحميلها
        const canvas = document.createElement('canvas');
        canvas.width = element.naturalWidth || 120;
        canvas.height = element.naturalHeight || 120;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(element, 0, 0);
        link.href = canvas.toDataURL('image/png');
    }
    
    link.click();
    showNotification(`تم تحميل QR طاولة ${tableId}`);
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
