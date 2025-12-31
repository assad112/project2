/**
 * ROASTERY COFFEE - Professional JavaScript
 * Mobile-First Optimized
 * Currency: Omani Rial (ر.ع)
 */

// ============================================
// MENU DATA
// ============================================
const menuItems = [
    {
        id: 1,
        name: 'إسبريسو',
        description: 'قهوة غنية ومركزة بنكهة قوية',
        price: 0.800,
        category: 'hot',
        badge: 'hot',
        image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400'
    },
    {
        id: 2,
        name: 'كابتشينو',
        description: 'إسبريسو مع حليب مخفوق ورغوة كريمية',
        price: 1.200,
        category: 'hot',
        badge: 'hot',
        image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400'
    },
    {
        id: 3,
        name: 'لاتيه',
        description: 'إسبريسو مع حليب ساخن ورغوة خفيفة',
        price: 1.100,
        category: 'hot',
        badge: 'hot',
        image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400'
    },
    {
        id: 4,
        name: 'موكا',
        description: 'مزيج الإسبريسو مع الشوكولاتة والحليب',
        price: 1.300,
        category: 'hot',
        badge: 'hot',
        image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400'
    },
    {
        id: 5,
        name: 'فلات وايت',
        description: 'إسبريسو مزدوج مع حليب مخملي',
        price: 1.200,
        category: 'hot',
        badge: '',
        image: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400'
    },
    {
        id: 6,
        name: 'آيس لاتيه',
        description: 'لاتيه منعش مع الثلج',
        price: 1.300,
        category: 'cold',
        badge: 'cold',
        image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400'
    },
    {
        id: 7,
        name: 'كولد برو',
        description: 'قهوة مخمرة على البارد لمدة 12 ساعة',
        price: 1.500,
        category: 'cold',
        badge: 'cold',
        image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400'
    },
    {
        id: 8,
        name: 'آيس أمريكانو',
        description: 'إسبريسو مع ماء بارد وثلج',
        price: 1.000,
        category: 'cold',
        badge: 'cold',
        image: 'https://images.unsplash.com/photo-1499961024560-7d6f2c6c7c0b?w=400'
    },
    {
        id: 9,
        name: 'فرابتشينو كراميل',
        description: 'مشروب بارد كريمي بنكهة الكراميل',
        price: 1.800,
        category: 'cold',
        badge: 'new',
        image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400'
    },
    {
        id: 10,
        name: 'تشيز كيك',
        description: 'كعكة الجبن الكريمية الأصلية',
        price: 2.000,
        category: 'dessert',
        badge: '',
        image: 'https://images.unsplash.com/photo-1508737027454-e6454ef45afd?w=400'
    },
    {
        id: 11,
        name: 'براوني شوكولاتة',
        description: 'براوني غني بالشوكولاتة الداكنة',
        price: 1.500,
        category: 'dessert',
        badge: '',
        image: 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400'
    },
    {
        id: 12,
        name: 'كرواسون',
        description: 'كرواسون فرنسي طازج ومقرمش',
        price: 1.000,
        category: 'dessert',
        badge: '',
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400'
    },
    {
        id: 13,
        name: 'تيراميسو',
        description: 'حلوى إيطالية بنكهة القهوة',
        price: 2.200,
        category: 'dessert',
        badge: 'new',
        image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400'
    },
    {
        id: 14,
        name: 'سبانيش لاتيه',
        description: 'لاتيه مع الحليب المكثف الحلو',
        price: 1.400,
        category: 'special',
        badge: 'new',
        image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400'
    },
    {
        id: 15,
        name: 'V60 إثيوبي',
        description: 'قهوة مختصة محضرة بطريقة V60',
        price: 2.000,
        category: 'special',
        badge: 'new',
        image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400'
    },
    {
        id: 16,
        name: 'كيميكس يمني',
        description: 'بن يمني فاخر بطريقة الكيميكس',
        price: 2.500,
        category: 'special',
        badge: 'new',
        image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400'
    }
];

// Currency
const currency = 'ر.ع';

// ============================================
// CART STATE
// ============================================
let cart = JSON.parse(localStorage.getItem('roasteryCart')) || [];

// ============================================
// DOM ELEMENTS
// ============================================
const header = document.getElementById('header');
const nav = document.getElementById('nav');
const navOverlay = document.getElementById('navOverlay');
const menuToggle = document.getElementById('menuToggle');
const menuGrid = document.getElementById('menuGrid');
const cartOverlay = document.getElementById('cartOverlay');
const cartSidebar = document.getElementById('cartSidebar');
const cartBody = document.getElementById('cartBody');
const cartBadge = document.getElementById('cartBadge');
const cartTotal = document.getElementById('cartTotal');
const preloader = document.getElementById('preloader');
const scrollTopBtn = document.getElementById('scrollTop');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (preloader) preloader.classList.add('hide');
    }, 1500);
    
    renderMenu();
    updateCartUI();
    initFilters();
    initStatsAnimation();
    initSmoothScroll();
    initHeaderScroll();
});

// ============================================
// MENU RENDERING
// ============================================
function renderMenu(filter = 'all') {
    if (!menuGrid) return;
    
    const filteredItems = filter === 'all' 
        ? menuItems 
        : menuItems.filter(item => item.category === filter);
    
    menuGrid.innerHTML = filteredItems.map(item => `
        <div class="menu-card" data-aos="fade-up">
            <div class="menu-card-image">
                <img src="${item.image}" alt="${item.name}" loading="lazy">
                ${item.badge ? `<span class="menu-card-badge ${item.badge}">${getBadgeText(item.badge)}</span>` : ''}
            </div>
            <div class="menu-card-body">
                <span class="menu-card-category">${getCategoryName(item.category)}</span>
                <h3 class="menu-card-title">${item.name}</h3>
                <p class="menu-card-desc">${item.description}</p>
                <div class="menu-card-footer">
                    <span class="menu-card-price">${item.price.toFixed(3)} <small>${currency}</small></span>
                    <button class="add-to-cart-btn" onclick="addToCart(${item.id})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    animateCards();
}

function getBadgeText(badge) {
    const badges = { 'hot': 'ساخن', 'cold': 'بارد', 'new': 'جديد' };
    return badges[badge] || '';
}

function getCategoryName(category) {
    const categories = {
        'hot': 'مشروبات ساخنة',
        'cold': 'مشروبات باردة',
        'dessert': 'حلويات',
        'special': 'مختصة'
    };
    return categories[category] || '';
}

function animateCards() {
    const cards = document.querySelectorAll('.menu-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// ============================================
// FILTER FUNCTIONALITY
// ============================================
function initFilters() {
    const filterBtns = document.querySelectorAll('.menu-filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMenu(btn.dataset.filter);
        });
    });
}

// ============================================
// CART FUNCTIONALITY
// ============================================
function addToCart(id) {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;
    
    const existingItem = cart.find(i => i.id === id);
    
    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ ...item, qty: 1 });
    }
    
    saveCart();
    updateCartUI();
    showToast(`تمت إضافة ${item.name} للسلة`);
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartUI();
}

function updateQty(id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    
    item.qty += change;
    if (item.qty <= 0) {
        removeFromCart(id);
        return;
    }
    
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('roasteryCart', JSON.stringify(cart));
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    if (cartBadge) {
        cartBadge.textContent = totalItems;
        cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    if (cartTotal) {
        cartTotal.textContent = `${totalPrice.toFixed(3)} ${currency}`;
    }
    
    if (cartBody) {
        if (cart.length === 0) {
            cartBody.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-bag"></i>
                    <h4>السلة فارغة</h4>
                    <p>أضف بعض المنتجات للبدء</p>
                </div>
            `;
        } else {
            cartBody.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <h4 class="cart-item-name">${item.name}</h4>
                        <div class="cart-item-qty">
                            <button onclick="updateQty(${item.id}, -1)">-</button>
                            <span>${item.qty}</span>
                            <button onclick="updateQty(${item.id}, 1)">+</button>
                        </div>
                        <span class="cart-item-price">${(item.price * item.qty).toFixed(3)} ${currency}</span>
                    </div>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
        }
    }
}

// ============================================
// CART SIDEBAR TOGGLE
// ============================================
function toggleCart() {
    if (cartSidebar) cartSidebar.classList.toggle('active');
    if (cartOverlay) cartOverlay.classList.toggle('active');
    document.body.style.overflow = cartSidebar?.classList.contains('active') ? 'hidden' : '';
}

// ============================================
// MOBILE NAV TOGGLE
// ============================================
function toggleMenu() {
    if (nav) nav.classList.toggle('active');
    if (navOverlay) navOverlay.classList.toggle('active');
    if (menuToggle) {
        const icon = menuToggle.querySelector('i');
        icon.className = nav?.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
    }
    document.body.style.overflow = nav?.classList.contains('active') ? 'hidden' : '';
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message) {
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================
// SCROLL FUNCTIONS
// ============================================
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initHeaderScroll() {
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (header) {
            header.classList.toggle('scrolled', currentScroll > 100);
        }
        if (scrollTopBtn) {
            scrollTopBtn.classList.toggle('show', currentScroll > 500);
        }
    });
}

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (nav?.classList.contains('active')) toggleMenu();
            }
        });
    });
}

// ============================================
// STATS ANIMATION
// ============================================
function initStatsAnimation() {
    const stats = document.querySelectorAll('.stat-number');
    if (stats.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStat(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    stats.forEach(stat => observer.observe(stat));
}

function animateStat(element) {
    const target = parseInt(element.dataset.target);
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 16);
}

// ============================================
// TOUCH GESTURES
// ============================================
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, { passive: true });

function handleSwipe() {
    const swipeThreshold = 100;
    const diff = touchStartX - touchEndX;
    
    if (diff < -swipeThreshold) {
        if (cartSidebar?.classList.contains('active')) toggleCart();
        if (nav?.classList.contains('active')) toggleMenu();
    }
}
