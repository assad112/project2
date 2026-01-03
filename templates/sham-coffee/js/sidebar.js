// Sidebar Logic - Runs immediately to ensure elements exist before other scripts
(function() {
    const sidebarContainer = document.querySelector('.sidebar');
    if (!sidebarContainer) return;

    // Get current page filename
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';

    // التحقق من نوع المستخدم
    const isAdmin = localStorage.getItem('admin_logged_in') === 'true';
    const isWorker = localStorage.getItem('worker_logged_in') === 'true';

    // قائمة الأدمن (جميع الصفحات)
    const adminMenuItems = [
        { name: 'لوحة التحكم', icon: 'fa-home', link: 'index.html', id: 'dashboard' },
        { name: 'قائمة الشيشة', icon: 'fa-cloud', link: 'menu.html', id: 'menu' },
        { name: 'إدارة القائمة', icon: 'fa-edit', link: 'admin-menu.html', id: 'admin-menu' },
        { name: 'الطلبات', icon: 'fa-list-alt', link: 'all-orders.html', id: 'all-orders' },
        { name: 'إدارة الطلبات', icon: 'fa-clipboard-list', link: 'admin-orders.html', id: 'admin-orders' },
        { name: 'الجلسات الخاصة', icon: 'fa-couch', link: 'rooms.html', id: 'rooms' },
        { name: 'المتجر', icon: 'fa-store', link: 'store.html', id: 'store' },
        { name: 'إدارة المتجر', icon: 'fa-boxes', link: 'admin-store.html', id: 'admin-store' },
        { name: 'إدارة العمال', icon: 'fa-users', link: 'admin-workers.html', id: 'admin-workers' },
        { name: 'الكاشير', icon: 'fa-cash-register', link: 'cashier.html', id: 'cashier' },
        { name: 'المخزن', icon: 'fa-warehouse', link: 'inventory.html', id: 'inventory' },
        { name: 'نظام الباركود', icon: 'fa-barcode', link: 'barcode.html', id: 'barcode' }
    ];

    // قائمة العامل (المنيو والكاشير فقط)
    const workerMenuItems = [
        { name: 'قائمة الشيشة', icon: 'fa-cloud', link: 'menu.html', id: 'menu' },
        { name: 'الكاشير', icon: 'fa-cash-register', link: 'cashier.html', id: 'cashier' }
    ];

    // اختيار القائمة المناسبة - للعامل فقط المنيو والكاشير
    let menuItems;
    if (isWorker) {
        // للعامل: فقط المنيو والكاشير - لا تظهر أي عناصر إدارية
        menuItems = workerMenuItems;
    } else if (isAdmin) {
        // للأدمن: جميع الصفحات
        menuItems = adminMenuItems;
    } else {
        // إذا لم يكن مسجل دخول: توجيه لتسجيل الدخول
        menuItems = [];
    }

    // معلومات المستخدم
    const userName = isAdmin ? (localStorage.getItem('admin_name') || 'مدير النظام') : 
                   (isWorker ? (localStorage.getItem('worker_name') || 'عامل') : 'مستخدم');
    const userRole = isAdmin ? 'أدمن' : (isWorker ? 'عامل' : 'مستخدم');

    let sidebarHTML = `
        <div class="sidebar-header">
            <div class="logo">💨</div>
            <div class="brand">
                <h1>قهوة الشام</h1>
                <p>${userRole}</p>
            </div>
        </div>

        <nav class="nav-menu">
    `;

    // التأكد من أن العامل لا يرى عناصر إدارية
    if (isWorker) {
        // للعامل: فقط عرض عناصر workerMenuItems
        workerMenuItems.forEach(item => {
            let isActive = page === item.link;
            sidebarHTML += `
                <a href="${item.link}" class="nav-item ${isActive ? 'active' : ''}" data-section="${item.id}">
                    <i class="fas ${item.icon}"></i>
                    <span>${item.name}</span>
                </a>
            `;
        });
    } else {
        // للأدمن أو غير المسجلين
        menuItems.forEach(item => {
            // Check if active
            let isActive = false;
            if (page === item.link) {
                isActive = true;
            }
            // Special case for admin-orders if it was merged or redirected
            if (item.link === 'admin-menu.html' && page === 'admin-orders.html') {
                isActive = true;
            }

            sidebarHTML += `
                <a href="${item.link}" class="nav-item ${isActive ? 'active' : ''}" data-section="${item.id}">
                    <i class="fas ${item.icon}"></i>
                    <span>${item.name}</span>
                </a>
            `;
        });
    }

    sidebarHTML += `
        </nav>

        <div class="sidebar-footer">
            <button class="btn btn-secondary" onclick="if(typeof BonApp !== 'undefined') BonApp.toggleTheme(); else toggleThemeFallback()" style="width: 100%; margin-bottom: 10px;">
                <i class="fas fa-moon"></i>
                <span>تغيير المظهر</span>
            </button>
            <button class="btn btn-danger" onclick="logout()" style="width: 100%; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); margin-bottom: 10px;">
                <i class="fas fa-sign-out-alt"></i>
                <span>تسجيل الخروج</span>
            </button>
            <button class="btn btn-danger" onclick="clearAppCache()" style="width: 100%; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);">
                <i class="fas fa-sync-alt"></i>
                <span>تحديث التطبيق</span>
            </button>
        </div>
    `;

    sidebarContainer.innerHTML = sidebarHTML;
})();

// Function to clear cache and reload
async function clearAppCache() {
    if (!confirm('هل تريد تحديث التطبيق ومسح الذاكرة المؤقتة؟ سيتم إعادة تحميل الصفحة.')) return;

    try {
        // 1. Unregister Service Workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }

        // 2. Delete all Caches
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }

        // 3. Reload page
        window.location.reload(true);
    } catch (error) {
        console.error('Error clearing cache:', error);
        alert('حدث خطأ أثناء مسح الذاكرة المؤقتة. يرجى تحديث الصفحة يدوياً.');
        window.location.reload();
    }
}

// Fallback theme toggler if BonApp is not loaded
function toggleThemeFallback() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('bon-theme', isLight ? 'light' : 'dark');
}

// Apply theme on load if BonApp didn't do it
if (localStorage.getItem('bon-theme') === 'light') {
    document.body.classList.add('light-mode');
}

// تسجيل الخروج
function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        const isWorker = localStorage.getItem('worker_logged_in') === 'true';
        
        localStorage.removeItem('admin_logged_in');
        localStorage.removeItem('admin_username');
        localStorage.removeItem('admin_name');
        localStorage.removeItem('admin_role');
        localStorage.removeItem('worker_logged_in');
        localStorage.removeItem('worker_username');
        localStorage.removeItem('worker_name');
        localStorage.removeItem('worker_role');
        localStorage.removeItem('worker_position');
        localStorage.removeItem('worker_id');
        localStorage.removeItem('restaurant_id');
        
        // توجيه حسب نوع المستخدم
        window.location.href = isWorker ? 'login-worker.html' : 'login-admin.html';
    }
}
