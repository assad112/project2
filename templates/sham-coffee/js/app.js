// Bon Coffee - Main Application
const BonApp = {
    // Configuration
    config: {
        appName: 'قهوة الشام',
        currency: 'ر.ع',
        version: '1.0.0'
    },
    
    // State
    state: {
        currentSection: 'dashboard',
        cart: [],
        orders: [],
        products: [],
        inventory: [],
        theme: 'dark'
    },
    
    // Initialize
    init() {
        this.loadTheme();
        this.setupNavigation();
        this.loadData();
        this.setupEventListeners();
        console.log('☕ قهوة الشام App Initialized');
    },
    
    // Theme
    loadTheme() {
        const savedTheme = localStorage.getItem('bon-theme') || 'dark';
        this.state.theme = savedTheme;
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
        }
    },
    
    toggleTheme() {
        document.body.classList.toggle('light-mode');
        this.state.theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        localStorage.setItem('bon-theme', this.state.theme);
        this.showToast('تم تغيير المظهر', 'success');
    },
    
    // Navigation
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = item.dataset.section;
                if (section) {
                    this.navigateTo(section);
                }
            });
        });
    },
    
    navigateTo(section) {
        // Update active nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === section) {
                item.classList.add('active');
            }
        });
        
        // Hide all sections
        document.querySelectorAll('.section').forEach(sec => {
            sec.style.display = 'none';
        });
        
        // Show target section
        const targetSection = document.getElementById(`${section}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
        
        this.state.currentSection = section;
    },
    
    // Data
    loadData() {
        // Load from localStorage or use defaults
        this.state.products = JSON.parse(localStorage.getItem('bon-products')) || this.getDefaultProducts();
        this.state.orders = JSON.parse(localStorage.getItem('bon-orders')) || [];
        this.state.inventory = JSON.parse(localStorage.getItem('bon-inventory')) || this.getDefaultInventory();
        this.state.cart = JSON.parse(localStorage.getItem('bon-cart')) || [];
    },
    
    saveData() {
        localStorage.setItem('bon-products', JSON.stringify(this.state.products));
        localStorage.setItem('bon-orders', JSON.stringify(this.state.orders));
        localStorage.setItem('bon-inventory', JSON.stringify(this.state.inventory));
        localStorage.setItem('bon-cart', JSON.stringify(this.state.cart));
    },
    
    getDefaultProducts() {
        return [
            { id: 1, name: 'قهوة عربية', category: 'hot', price: 15, image: '☕', description: 'قهوة عربية أصيلة', barcode: '1001' },
            { id: 2, name: 'لاتيه', category: 'hot', price: 18, image: '🥛', description: 'لاتيه كريمي', barcode: '1002' },
            { id: 3, name: 'كابتشينو', category: 'hot', price: 20, image: '☕', description: 'كابتشينو إيطالي', barcode: '1003' },
            { id: 4, name: 'موكا', category: 'hot', price: 22, image: '🍫', description: 'موكا بالشوكولاتة', barcode: '1004' },
            { id: 5, name: 'آيس لاتيه', category: 'cold', price: 20, image: '🧊', description: 'لاتيه مثلج منعش', barcode: '1005' },
            { id: 6, name: 'فرابتشينو', category: 'cold', price: 25, image: '🥤', description: 'فرابتشينو كريمي', barcode: '1006' },
            { id: 7, name: 'كرواسون', category: 'food', price: 12, image: '🥐', description: 'كرواسون طازج', barcode: '2001' },
            { id: 8, name: 'كيك شوكولاتة', category: 'food', price: 18, image: '🍰', description: 'كيك شوكولاتة فاخر', barcode: '2002' },
            { id: 9, name: 'بن برازيلي', category: 'beans', price: 80, image: '🫘', description: 'بن برازيلي فاخر - 250 جرام', barcode: '3001' },
            { id: 10, name: 'بن كولومبي', category: 'beans', price: 95, image: '🫘', description: 'بن كولومبي ممتاز - 250 جرام', barcode: '3002' }
        ];
    },
    
    getDefaultInventory() {
        return [
            { id: 1, name: 'بن برازيلي', quantity: 50, unit: 'كجم', minStock: 10, price: 80 },
            { id: 2, name: 'حليب طازج', quantity: 100, unit: 'لتر', minStock: 20, price: 8 },
            { id: 3, name: 'سكر', quantity: 30, unit: 'كجم', minStock: 5, price: 5 },
            { id: 4, name: 'كريمة خفق', quantity: 25, unit: 'لتر', minStock: 5, price: 15 },
            { id: 5, name: 'شوكولاتة', quantity: 20, unit: 'كجم', minStock: 3, price: 40 },
            { id: 6, name: 'أكواب ورقية', quantity: 500, unit: 'قطعة', minStock: 100, price: 0.5 }
        ];
    },
    
    // Event Listeners
    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
        
        // Barcode scanner input
        const barcodeInput = document.getElementById('barcode-input');
        if (barcodeInput) {
            barcodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.scanBarcode(e.target.value);
                    e.target.value = '';
                }
            });
        }
    },
    
    // Cart Functions
    addToCart(productId) {
        const product = this.state.products.find(p => p.id === productId);
        if (!product) return;
        
        const existingItem = this.state.cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            this.state.cart.push({ ...product, quantity: 1 });
        }
        
        this.saveData();
        this.updateCartUI();
        this.showToast(`تمت إضافة ${product.name} للسلة`, 'success');
    },
    
    removeFromCart(productId) {
        this.state.cart = this.state.cart.filter(item => item.id !== productId);
        this.saveData();
        this.updateCartUI();
    },
    
    updateCartQuantity(productId, quantity) {
        const item = this.state.cart.find(item => item.id === productId);
        if (item) {
            item.quantity = Math.max(0, quantity);
            if (item.quantity === 0) {
                this.removeFromCart(productId);
            }
        }
        this.saveData();
        this.updateCartUI();
    },
    
    getCartTotal() {
        return this.state.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },
    
    clearCart() {
        this.state.cart = [];
        this.saveData();
        this.updateCartUI();
    },
    
    updateCartUI() {
        const cartCount = document.getElementById('cart-count');
        const cartTotal = document.getElementById('cart-total');
        const cartItems = document.getElementById('cart-items');
        const subtotalEl = document.getElementById('subtotal');
        const checkoutBtn = document.getElementById('checkout-btn');
        
        const totalItems = this.state.cart.reduce((sum, item) => sum + item.quantity, 0);
        
        if (cartCount) cartCount.textContent = totalItems;
        if (cartTotal) cartTotal.textContent = this.formatPrice(this.getCartTotal());
        if (subtotalEl) subtotalEl.textContent = this.formatPrice(this.getCartTotal());
        if (checkoutBtn) checkoutBtn.disabled = this.state.cart.length === 0;
        
        if (cartItems) {
            cartItems.innerHTML = this.state.cart.map(item => `
                <div class="cart-item">
                    <span class="cart-item-icon">${item.image}</span>
                    <div class="cart-item-info">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-price">${this.formatPrice(Number(item.price || 0))}</span>
                    </div>
                    <div class="cart-item-quantity">
                        <button onclick="BonApp.updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="BonApp.updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
                    </div>
                </div>
            `).join('');
        }
    },
    
    // Barcode
    scanBarcode(barcode) {
        const product = this.state.products.find(p => p.barcode === barcode);
        if (product) {
            this.addToCart(product.id);
        } else {
            this.showToast('المنتج غير موجود', 'error');
        }
    },
    
    generateBarcode(productId) {
        const product = this.state.products.find(p => p.id === productId);
        if (product) {
            // Generate QR code or barcode
            this.showToast(`باركود: ${product.barcode}`, 'success');
        }
    },
    
    // Orders
    createOrder(extra = {}) {
        if (this.state.cart.length === 0) {
            this.showToast('السلة فارغة', 'error');
            return;
        }

        const subtotal = this.getCartTotal();
        const deliveryFee = typeof extra.deliveryFee === 'number' ? extra.deliveryFee : 0;
        const computedTotal = typeof extra.total === 'number' ? extra.total : (subtotal + deliveryFee);
        
        const order = {
            id: Date.now(),
            items: [...this.state.cart],
            subtotal,
            deliveryFee,
            total: computedTotal,
            date: new Date().toISOString(),
            status: 'pending',
            ...extra
        };
        
        this.state.orders.unshift(order);
        this.clearCart();
        this.saveData();
        this.showToast('تم إنشاء الطلب بنجاح', 'success');
        
        return order;
    },
    
    updateOrderStatus(orderId, status) {
        const order = this.state.orders.find(o => o.id === orderId);
        if (order) {
            order.status = status;
            this.saveData();
            this.showToast('تم تحديث حالة الطلب', 'success');
        }
    },
    
    // Inventory
    updateInventory(itemId, quantity) {
        const item = this.state.inventory.find(i => i.id === itemId);
        if (item) {
            item.quantity = quantity;
            this.saveData();
            
            if (item.quantity <= item.minStock) {
                this.showToast(`تحذير: ${item.name} أقل من الحد الأدنى`, 'warning');
            }
        }
    },
    
    addInventoryItem(item) {
        item.id = Date.now();
        this.state.inventory.push(item);
        this.saveData();
        this.showToast('تمت إضافة المنتج للمخزن', 'success');
    },
    
    // Search
    handleSearch(query) {
        const results = this.state.products.filter(p => 
            p.name.includes(query) || 
            p.description.includes(query) ||
            p.barcode.includes(query)
        );
        this.renderSearchResults(results);
    },
    
    renderSearchResults(results) {
        const container = document.getElementById('search-results');
        if (!container) return;
        
        // Implement search results rendering
    },
    
    // Toast
    showToast(message, type = 'success') {
        const container = document.querySelector('.toast-container') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
    
    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    },
    
    // Stats
    getStats() {
        const today = new Date().toDateString();
        const todayOrders = this.state.orders.filter(o => 
            new Date(o.date).toDateString() === today
        );
        
        return {
            totalProducts: this.state.products.length,
            totalOrders: this.state.orders.length,
            todayOrders: todayOrders.length,
            todayRevenue: todayOrders.reduce((sum, o) => sum + o.total, 0),
            lowStock: this.state.inventory.filter(i => i.quantity <= i.minStock).length
        };
    },
    
    // Format
    formatPrice(price) {
        const value = Number(price || 0);
        // OMR typically uses 3 decimal places
        return `${value.toFixed(3)} ${this.config.currency}`;
    },
    
    formatDate(date) {
        return new Date(date).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => BonApp.init());

// Export for use in other scripts
window.BonApp = BonApp;
