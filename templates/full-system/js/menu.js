/**
 * نظام إدارة المطعم - صفحة المنيو (تصميم جديد للهاتف)
 */

// السلة
let cart = [];
let selectedTable = null;

document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('menu-items');
    
    // تشخيص المشكلة
    try {
        // تأكد من تحميل البيانات أولاً
        if (typeof initializeData === 'function') {
            initializeData();
            container.innerHTML = '<p style="color:green;text-align:center;">✅ initializeData موجودة</p>';
        } else {
            container.innerHTML = '<p style="color:red;text-align:center;">❌ initializeData غير موجودة - ملف data.js لم يتم تحميله</p>';
            return;
        }
        
        // تحقق من وجود البيانات
        if (typeof getMenuItems === 'function') {
            const allItems = getMenuItems();
            container.innerHTML += '<p style="color:blue;text-align:center;">📦 عدد المنتجات: ' + allItems.length + '</p>';
            
            if (allItems.length === 0) {
                container.innerHTML += '<p style="color:red;text-align:center;">❌ لا توجد منتجات في localStorage</p>';
                return;
            }
        } else {
            container.innerHTML += '<p style="color:red;text-align:center;">❌ getMenuItems غير موجودة</p>';
            return;
        }
    } catch(e) {
        container.innerHTML = '<p style="color:red;text-align:center;">❌ خطأ: ' + e.message + '</p>';
        return;
    }
    
    // إذا وصلنا هنا، كل شيء يعمل
    setTimeout(function() {
        loadMenuItems('all');
        setupEventListeners();
        loadCartFromSession();
        checkTableFromURL();
        updateFloatingCart();
    }, 500);
});

// التحقق من رقم الطاولة في URL
function checkTableFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const tableId = urlParams.get('table');
    if (tableId) {
        document.getElementById('table-select').value = tableId;
        selectedTable = parseInt(tableId);
    }
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // التصنيفات
    document.querySelectorAll('.category-chip').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadMenuItems(this.dataset.category);
        });
    });
    
    // اختيار الطاولة
    document.getElementById('table-select').addEventListener('change', function() {
        selectedTable = this.value ? parseInt(this.value) : null;
    });
    
    // فتح السلة
    document.getElementById('floating-cart').addEventListener('click', function() {
        openCart();
    });
    
    // إغلاق السلة
    document.getElementById('close-sheet').addEventListener('click', closeCart);
    document.getElementById('cart-overlay').addEventListener('click', closeCart);
    
    // إرسال الطلب
    document.getElementById('send-order').addEventListener('click', sendOrder);
    
    // منع السحب على الصفحة عند فتح السلة
    document.getElementById('cart-sheet').addEventListener('touchmove', function(e) {
        e.stopPropagation();
    }, { passive: true });
}

// فتح السلة
function openCart() {
    document.getElementById('cart-overlay').classList.add('active');
    document.getElementById('cart-sheet').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// إغلاق السلة
function closeCart() {
    document.getElementById('cart-overlay').classList.remove('active');
    document.getElementById('cart-sheet').classList.remove('active');
    document.body.style.overflow = '';
}

// تحميل أصناف المنيو
function loadMenuItems(category) {
    const container = document.getElementById('menu-items');
    const items = getMenuItemsByCategory(category);
    
    console.log('Loading items for category:', category);
    console.log('Found items:', items.length);
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-utensils"></i>
                <p>لا توجد أصناف في هذا التصنيف</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = items.map((item, index) => `
        <div class="food-card" style="animation-delay: ${index * 0.05}s">
            <div class="food-emoji">${item.emoji || '🍽️'}</div>
            <div class="food-details">
                <h3 class="food-name">${item.name}</h3>
                <p class="food-desc">${item.description || 'وصف الصنف'}</p>
                <div class="food-footer">
                    <span class="food-price">${item.price} <small>ر.ع</small></span>
                    <button class="add-to-cart" onclick="addToCart(${item.id})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    \`).join('');
}

// إضافة للسلة
function addToCart(itemId) {
    const item = getMenuItems().find(i => i.id === itemId);
    if (!item) return;
    
    const existingItem = cart.find(i => i.id === itemId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            emoji: item.emoji
        });
    }
    
    updateCartUI();
    updateFloatingCart();
    saveCartToSession();
    showToast('تم إضافة ' + item.name, 'success');
    
    // تأثير اهتزاز خفيف
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

// حذف من السلة
function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCartUI();
    updateFloatingCart();
    saveCartToSession();
}

// تحديث الكمية
function updateQuantity(itemId, delta) {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    
    item.quantity += delta;
    if (item.quantity <= 0) {
        removeFromCart(itemId);
    } else {
        updateCartUI();
        updateFloatingCart();
        saveCartToSession();
    }
}

// تحديث زر السلة العائم
function updateFloatingCart() {
    const floatingCart = document.getElementById('floating-cart');
    const cartCount = document.getElementById('cart-count');
    const cartTotalDisplay = document.getElementById('cart-total-display');
    const itemsCountText = document.getElementById('items-count-text');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    cartCount.textContent = totalItems;
    cartTotalDisplay.textContent = total + ' ر.ع';
    itemsCountText.textContent = totalItems + ' أصناف';
    
    if (totalItems > 0) {
        floatingCart.classList.remove('hidden');
    } else {
        floatingCart.classList.add('hidden');
    }
}

// تحديث واجهة السلة
function updateCartUI() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    // المجموع
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = total + ' ر.ع';
    
    // عناصر السلة
    if (cart.length === 0) {
        cartItems.innerHTML = \`
            <div class="empty-cart">
                <i class="fas fa-shopping-bag"></i>
                <p>السلة فارغة</p>
            </div>
        \`;
    } else {
        cartItems.innerHTML = cart.map(item => \`
            <div class="cart-item">
                <div class="cart-item-emoji">\${item.emoji || '🍽️'}</div>
                <div class="cart-item-details">
                    <h4>\${item.name}</h4>
                    <p>\${(item.price * item.quantity).toFixed(2)} ر.ع</p>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="updateQuantity(\${item.id}, -1)">−</button>
                    <span>\${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(\${item.id}, 1)">+</button>
                </div>
            </div>
        \`).join('');
    }
}

// حفظ السلة في الجلسة
function saveCartToSession() {
    sessionStorage.setItem('cart', JSON.stringify(cart));
}

// تحميل السلة من الجلسة
function loadCartFromSession() {
    const savedCart = sessionStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
        updateFloatingCart();
    }
}

// إرسال الطلب
function sendOrder() {
    if (!selectedTable) {
        showToast('الرجاء اختيار رقم الطاولة', 'error');
        closeCart();
        document.getElementById('table-select').focus();
        return;
    }
    
    if (cart.length === 0) {
        showToast('السلة فارغة', 'error');
        return;
    }
    
    // التحقق من حالة الطاولة
    const table = getTable(selectedTable);
    if (table && table.status === 'pending') {
        showToast('هذه الطاولة لديها طلب قيد الانتظار', 'error');
        return;
    }
    
    // إنشاء الطلب
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const order = {
        tableId: selectedTable,
        items: [...cart],
        total: total,
        notes: ''
    };
    
    // إضافة الطلب
    addOrder(order);
    
    // تنظيف السلة
    cart = [];
    updateCartUI();
    updateFloatingCart();
    saveCartToSession();
    
    // إغلاق السلة وإظهار رسالة
    closeCart();
    showToast('تم إرسال الطلب بنجاح! 🎉', 'success');
    
    // تشغيل صوت
    playNotificationSound();
}

// تشغيل صوت الإشعار
function playNotificationSound() {
    try {
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2354.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch (e) {
        // تجاهل الأخطاء
    }
}

// عرض إشعار Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    
    toastText.textContent = message;
    toast.className = 'toast show ' + type;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
