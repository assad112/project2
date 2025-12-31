#!/usr/bin/env python3
"""
سيرفر المطعم المحسّن - يدعم عدد كبير من المستخدمين المتزامنين
مع Thread Pool و Connection Pooling و Rate Limiting
"""

import json
import os
import sys
import subprocess
import threading
import time
import hashlib
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from socketserver import ThreadingMixIn
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
import gzip

DATA_FILE = 'restaurant_data.json'
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))

# ==========================================
# إعدادات الأداء المحسّنة
# ==========================================
MAX_WORKERS = 100  # عدد العمال المتزامنين (مضاعف)
CACHE_TTL = 30  # ثواني للكاش (زيادة للاستقرار)
RATE_LIMIT_REQUESTS = 200  # عدد الطلبات المسموحة (مضاعف)
RATE_LIMIT_WINDOW = 60  # نافذة الوقت بالثواني
MAX_BODY_SIZE = 2 * 1024 * 1024  # 2MB حد أقصى للبيانات
CONNECTION_TIMEOUT = 30  # مهلة الاتصال بالثواني
KEEP_ALIVE = True  # الحفاظ على الاتصال مفتوح
GZIP_MIN_SIZE = 1024  # الحد الأدنى للضغط (1KB)

# ==========================================
# نظام التخزين المؤقت المحسّن
# ==========================================
class CacheManager:
    def __init__(self, ttl=CACHE_TTL, max_size=1000):
        self.cache = {}
        self.ttl = ttl
        self.max_size = max_size
        self.lock = threading.RLock()  # RLock للسماح بإعادة الدخول
        self.hits = 0
        self.misses = 0
        self.last_cleanup = time.time()
        self.cleanup_interval = 60  # تنظيف كل دقيقة
    
    def get(self, key):
        with self.lock:
            self._auto_cleanup()
            if key in self.cache:
                data, timestamp, access_count = self.cache[key]
                if time.time() - timestamp < self.ttl:
                    self.cache[key] = (data, timestamp, access_count + 1)
                    self.hits += 1
                    return data
                del self.cache[key]
            self.misses += 1
        return None
    
    def set(self, key, value, custom_ttl=None):
        with self.lock:
            # إذا امتلأ الكاش، نحذف الأقل استخداماً
            if len(self.cache) >= self.max_size:
                self._evict_lru()
            self.cache[key] = (value, time.time(), 1)
    
    def invalidate(self, pattern=None):
        with self.lock:
            if pattern:
                keys_to_delete = [k for k in self.cache if pattern in k]
                for k in keys_to_delete:
                    del self.cache[k]
            else:
                self.cache.clear()
    
    def _evict_lru(self):
        """حذف العناصر الأقل استخداماً"""
        if not self.cache:
            return
        # ترتيب حسب عدد الوصول وحذف الأقل
        sorted_keys = sorted(self.cache.keys(), key=lambda k: self.cache[k][2])
        keys_to_remove = sorted_keys[:len(sorted_keys) // 4]  # حذف 25%
        for k in keys_to_remove:
            del self.cache[k]
    
    def _auto_cleanup(self):
        """تنظيف تلقائي للعناصر المنتهية"""
        now = time.time()
        if now - self.last_cleanup < self.cleanup_interval:
            return
        self.last_cleanup = now
        expired_keys = [k for k, (_, ts, _) in self.cache.items() if now - ts >= self.ttl]
        for k in expired_keys:
            del self.cache[k]
    
    def get_stats(self):
        """إحصائيات الكاش"""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        return {
            'size': len(self.cache),
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': f'{hit_rate:.1f}%'
        }

cache = CacheManager()

# ==========================================
# نظام Rate Limiting
# ==========================================
class RateLimiter:
    def __init__(self, max_requests=RATE_LIMIT_REQUESTS, window=RATE_LIMIT_WINDOW):
        self.requests = {}
        self.max_requests = max_requests
        self.window = window
        self.lock = threading.Lock()
    
    def is_allowed(self, ip):
        with self.lock:
            now = time.time()
            
            # تنظيف الطلبات القديمة
            if ip in self.requests:
                self.requests[ip] = [t for t in self.requests[ip] if now - t < self.window]
            else:
                self.requests[ip] = []
            
            # التحقق من الحد
            if len(self.requests[ip]) >= self.max_requests:
                return False
            
            self.requests[ip].append(now)
            return True
    
    def get_remaining(self, ip):
        with self.lock:
            if ip not in self.requests:
                return self.max_requests
            now = time.time()
            valid_requests = [t for t in self.requests[ip] if now - t < self.window]
            return max(0, self.max_requests - len(valid_requests))

rate_limiter = RateLimiter()

# ==========================================
# إدارة البيانات مع Thread Safety
# ==========================================
data_lock = threading.Lock()

def load_data():
    cached = cache.get('data')
    if cached:
        return cached
    
    with data_lock:
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    cache.set('data', data)
                    return data
            except (json.JSONDecodeError, IOError) as e:
                print(f'⚠️ خطأ في قراءة البيانات: {e}')
        
        default_data = {
            'orders': [],
            'tables': [{'id': i, 'status': 'available', 'currentOrder': None} for i in range(1, 11)]
        }
        cache.set('data', default_data)
        return default_data

def save_data(data):
    with data_lock:
        try:
            # كتابة آمنة - ملف مؤقت أولاً
            temp_file = DATA_FILE + '.tmp'
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            os.replace(temp_file, DATA_FILE)
            cache.set('data', data)
            cache.invalidate('orders')
            cache.invalidate('tables')
        except IOError as e:
            print(f'⚠️ خطأ في حفظ البيانات: {e}')
            raise

# متغير لتتبع حالة النشر
deploy_status = {'running': False, 'output': '', 'success': None}
deploy_lock = threading.Lock()

def run_deploy(site_id=None, template_id=None):
    """تنفيذ أمر النشر في الخلفية مع دعم القوالب"""
    global deploy_status
    with deploy_lock:
        deploy_status = {'running': True, 'output': 'جاري النشر...', 'success': None}
    
    try:
        # تحديد مجلد النشر حسب القالب
        public_dir = PROJECT_DIR
        if template_id and template_id != 'current':
            template_path = os.path.join(PROJECT_DIR, 'templates', template_id)
            if os.path.exists(template_path):
                public_dir = template_path
        
        # إنشاء firebase.json مؤقت للنشر إذا كان قالب مختار
        temp_firebase_json = None
        temp_firebaserc = None
        if template_id and template_id != 'current' and public_dir != PROJECT_DIR:
            temp_firebase_json = os.path.join(public_dir, 'firebase.json')
            temp_firebaserc = os.path.join(public_dir, '.firebaserc')
            
            # إنشاء firebase.json مع target صحيح
            target_name = site_id if site_id else 'default-site'
            firebase_config = {
                "hosting": {
                    "target": target_name,
                    "public": ".",
                    "ignore": ["firebase.json", ".firebaserc", "**/.*", "**/node_modules/**"],
                    "rewrites": [{"source": "**", "destination": "/index.html"}]
                }
            }
            with open(temp_firebase_json, 'w', encoding='utf-8') as f:
                json.dump(firebase_config, f, ensure_ascii=False, indent=2)
            
            # إنشاء .firebaserc لربط الهدف بالموقع
            firebaserc_config = {
                "projects": {
                    "default": "restaurant-system-demo"
                },
                "targets": {
                    "restaurant-system-demo": {
                        "hosting": {
                            target_name: [site_id if site_id else "restaurant-system-demo"]
                        }
                    }
                }
            }
            with open(temp_firebaserc, 'w', encoding='utf-8') as f:
                json.dump(firebaserc_config, f, ensure_ascii=False, indent=2)
            
            # نسخ ملفات JS الضرورية للقالب
            js_src = os.path.join(PROJECT_DIR, 'js')
            js_dest = os.path.join(public_dir, 'js')
            css_src = os.path.join(PROJECT_DIR, 'css')
            css_dest = os.path.join(public_dir, 'css')
            
            import shutil
            if os.path.exists(js_src) and not os.path.exists(js_dest):
                shutil.copytree(js_src, js_dest)
            if os.path.exists(css_src) and not os.path.exists(css_dest):
                shutil.copytree(css_src, css_dest)
            
            # نسخ ملفات HTML الأساسية
            essential_files = ['login-restaurant.html', 'admin.html', 'cashier.html', 
                              'waiter.html', 'menu.html', 'store.html', 'store-admin.html',
                              'inventory.html', 'profile.html']
            for ef in essential_files:
                src_file = os.path.join(PROJECT_DIR, ef)
                dest_file = os.path.join(public_dir, ef)
                if os.path.exists(src_file) and not os.path.exists(dest_file):
                    shutil.copy2(src_file, dest_file)
        
        # بناء أمر النشر
        if site_id:
            # نشر إلى موقع محدد
            cmd = f'firebase deploy --only hosting:{site_id} --project restaurant-system-demo'
        else:
            cmd = 'firebase deploy --only hosting --project restaurant-system-demo'
        
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=public_dir,
            capture_output=True,
            text=True,
            timeout=180
        )
        
        output = result.stdout + result.stderr
        success = result.returncode == 0
        
        # تنظيف الملفات المؤقتة
        if temp_firebase_json and os.path.exists(temp_firebase_json):
            os.remove(temp_firebase_json)
        if temp_firebaserc and os.path.exists(temp_firebaserc):
            os.remove(temp_firebaserc)
        
        with deploy_lock:
            deploy_status = {
                'running': False,
                'output': output,
                'success': success,
                'siteId': site_id,
                'templateId': template_id
            }
        
    except subprocess.TimeoutExpired:
        with deploy_lock:
            deploy_status = {
                'running': False,
                'output': 'انتهت مهلة النشر (أكثر من 3 دقائق)',
                'success': False
            }
    except Exception as e:
        with deploy_lock:
            deploy_status = {
                'running': False,
                'output': f'خطأ: {str(e)}',
                'success': False
            }


def list_hosting_sites(project_id=None):
    """إرجاع قائمة مواقع Firebase Hosting عبر firebase-tools.

    ملاحظة: في حال عدم وجود مشروع نشط في Firebase CLI، مرّر project_id.
    """
    cache_key = f"hosting_sites:{project_id or 'default'}"
    # كاش بسيط لتقليل استدعاء CLI
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # محاولة JSON أولاً
    if project_id:
        cmd_candidates = [
            f'firebase hosting:sites:list --project {project_id} --json',
            f'firebase hosting:sites:list --project {project_id}'
        ]
    else:
        cmd_candidates = [
            'firebase hosting:sites:list --json',
            'firebase hosting:sites:list'
        ]

    last_error = None
    for cmd in cmd_candidates:
        try:
            result = subprocess.run(
                cmd,
                shell=True,
                cwd=PROJECT_DIR,
                capture_output=True,
                text=True,
                timeout=30
            )

            stdout = (result.stdout or '').strip()
            stderr = (result.stderr or '').strip()
            combined = (stdout + '\n' + stderr).strip()

            if result.returncode != 0:
                last_error = combined or f'فشل تنفيذ الأمر: {cmd}'
                continue

            sites = []

            if '--json' in cmd:
                try:
                    payload = json.loads(stdout)
                    # بنية firebase-tools قد تختلف؛ نحاول استخراج IDs بشكل مرن
                    candidates = []
                    if isinstance(payload, dict):
                        for key in ['result', 'results', 'data']:
                            if key in payload:
                                candidates = payload.get(key)
                                break
                        if not candidates and 'hosting' in payload:
                            candidates = payload.get('hosting')
                    if isinstance(candidates, dict) and 'sites' in candidates:
                        candidates = candidates.get('sites')
                    if isinstance(candidates, list):
                        for item in candidates:
                            if isinstance(item, str):
                                sites.append(item)
                            elif isinstance(item, dict):
                                for k in ['site', 'siteId', 'name', 'id']:
                                    if k in item and isinstance(item[k], str):
                                        sites.append(item[k])
                                        break
                except Exception:
                    # fallback parse النص
                    pass

            if not sites:
                # Parse النص: التقط كلمات شبيهة بمعرفات المواقع (a-z0-9-)
                import re
                # تجنب التقاط روابط web.app أو firebaseapp.com
                for line in combined.splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    # قد يظهر جدول؛ نأخذ أول عمود إذا كان مناسباً
                    first = re.split(r'\s+', line)[0]
                    if re.fullmatch(r'[a-z0-9-]{3,}', first) and not first.endswith('web'):
                        sites.append(first)

            # تنظيف duplicates
            cleaned = []
            seen = set()
            for s in sites:
                s = (s or '').strip()
                if not s or s in seen:
                    continue
                seen.add(s)
                cleaned.append(s)

            cache.set(cache_key, cleaned)
            return cleaned

        except Exception as e:
            last_error = str(e)
            continue

    # فشل كل المحاولات
    cache.set(cache_key, [])
    raise RuntimeError(last_error or 'تعذر جلب مواقع الاستضافة')

class RestaurantHandler(BaseHTTPRequestHandler):
    # تعطيل السجلات لتحسين الأداء
    def log_message(self, format, *args):
        pass  # يمكن تفعيلها للتصحيح
    
    def get_client_ip(self):
        # الحصول على IP العميل (يدعم proxy)
        forwarded = self.headers.get('X-Forwarded-For')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return self.client_address[0]
    
    def check_rate_limit(self):
        ip = self.get_client_ip()
        if not rate_limiter.is_allowed(ip):
            self.send_error_json(429, 'تم تجاوز حد الطلبات المسموحة')
            return False
        return True
    
    def send_error_json(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}, ensure_ascii=False).encode('utf-8'))
    
    def do_GET(self):
        if not self.check_rate_limit():
            return
        
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/orders':
            cached = cache.get('orders')
            if cached:
                self.send_json(cached)
            else:
                orders = load_data()['orders']
                cache.set('orders', orders)
                self.send_json(orders)
        elif parsed.path == '/api/tables':
            cached = cache.get('tables')
            if cached:
                self.send_json(cached)
            else:
                tables = load_data()['tables']
                cache.set('tables', tables)
                self.send_json(tables)
        elif parsed.path == '/api/data':
            self.send_json(load_data())
        elif parsed.path == '/api/deploy/status':
            with deploy_lock:
                self.send_json(deploy_status)
        elif parsed.path == '/api/hosting/sites':
            try:
                qs = parse_qs(parsed.query)
                project_id = (qs.get('project') or [None])[0]
                sites = list_hosting_sites(project_id=project_id)
                self.send_json({'success': True, 'sites': sites})
            except Exception as e:
                self.send_json({'success': False, 'error': str(e), 'sites': []})
        elif parsed.path == '/api/health':
            # نقطة فحص الصحة المحسّنة
            health_data = {
                'status': 'healthy',
                'timestamp': time.time(),
                'uptime': time.time() - server_start_time if 'server_start_time' in globals() else 0,
                'rate_limit_remaining': rate_limiter.get_remaining(self.get_client_ip()),
                'cache_stats': cache.get_stats(),
                'connections': {
                    'max_workers': MAX_WORKERS,
                    'rate_limit': f'{RATE_LIMIT_REQUESTS}/{RATE_LIMIT_WINDOW}s'
                }
            }
            self.send_json(health_data)
        elif parsed.path == '/api/stats':
            # إحصائيات النظام
            self.send_json({
                'cache': cache.get_stats(),
                'settings': {
                    'max_workers': MAX_WORKERS,
                    'cache_ttl': CACHE_TTL,
                    'rate_limit': RATE_LIMIT_REQUESTS,
                    'max_body_size': MAX_BODY_SIZE
                }
            })
        elif parsed.path == '/api/templates':
            # جلب قائمة القوالب المتاحة مع الأقسام
            try:
                templates_dir = os.path.join(PROJECT_DIR, 'templates')
                templates_file = os.path.join(templates_dir, 'templates.json')
                categories_file = os.path.join(templates_dir, 'categories.json')

                # 1) تحميل القوالب/الأقسام من الملف القديم إن وجد (توافق خلفي)
                templates_data = {}
                if os.path.exists(templates_file):
                    with open(templates_file, 'r', encoding='utf-8') as f:
                        templates_data = json.load(f) or {}

                templates_list = list(templates_data.get('templates', []) or [])

                # 2) تحميل الأقسام من ملف مستقل إن وجد (الأولوية له)
                categories_list = list(templates_data.get('categories', []) or [])
                if os.path.exists(categories_file):
                    try:
                        with open(categories_file, 'r', encoding='utf-8') as f:
                            loaded_categories = json.load(f)
                        if isinstance(loaded_categories, list):
                            categories_list = loaded_categories
                    except Exception:
                        # لو فشلنا في قراءة categories.json نُبقي على القديم
                        pass

                # 3) دمج/إضافة القوالب من ملفات template.json داخل كل قالب
                discovered = {}
                if os.path.isdir(templates_dir):
                    for entry in os.listdir(templates_dir):
                        entry_path = os.path.join(templates_dir, entry)
                        if not os.path.isdir(entry_path):
                            continue
                        template_json = os.path.join(entry_path, 'template.json')
                        if not os.path.exists(template_json):
                            continue
                        try:
                            with open(template_json, 'r', encoding='utf-8') as f:
                                tpl = json.load(f)
                            if isinstance(tpl, dict) and tpl.get('id'):
                                discovered[str(tpl['id'])] = tpl
                        except Exception:
                            continue

                # override existing templates by id, and append new ones
                merged = []
                seen_ids = set()
                for tpl in templates_list:
                    tpl_id = None
                    if isinstance(tpl, dict):
                        tpl_id = tpl.get('id')
                    if tpl_id and str(tpl_id) in discovered:
                        merged.append(discovered[str(tpl_id)])
                        seen_ids.add(str(tpl_id))
                    else:
                        merged.append(tpl)
                        if tpl_id:
                            seen_ids.add(str(tpl_id))

                for tpl_id, tpl in discovered.items():
                    if tpl_id not in seen_ids:
                        merged.append(tpl)
                        seen_ids.add(tpl_id)

                self.send_json({
                    'success': True,
                    'templates': merged,
                    'categories': categories_list
                })
            except Exception as e:
                self.send_json({'success': False, 'error': str(e), 'templates': [], 'categories': []})
        else:
            # خدمة الملفات الثابتة
            self.serve_static_file()
    
    def serve_static_file(self):
        """خدمة الملفات الثابتة مع كاش"""
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == '/':
            # الصفحة الافتراضية عند تشغيل السيرفر
            # المطلوب: فتح صفحة السوبر أدمن أولاً بدل صفحة القالب/الواجهة العامة
            preferred = '/super-admin.html'
            preferred_path = os.path.join(PROJECT_DIR, preferred.lstrip('/'))
            path = preferred if os.path.exists(preferred_path) else '/index.html'
        
        file_path = os.path.join(PROJECT_DIR, path.lstrip('/'))
        
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            self.send_error(404)
            return
        
        # تحديد نوع الملف
        content_type = self.guess_content_type(file_path)
        
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Access-Control-Allow-Origin', '*')
            
            # Cache headers للملفات الثابتة
            if any(file_path.endswith(ext) for ext in ['.css', '.js', '.png', '.jpg', '.ico']):
                self.send_header('Cache-Control', 'public, max-age=3600')
            else:
                self.send_header('Cache-Control', 'no-cache')
            
            # ضغط الملفات النصية
            if content_type.startswith('text/') or content_type == 'application/javascript':
                accept_encoding = self.headers.get('Accept-Encoding', '')
                if 'gzip' in accept_encoding:
                    content = gzip.compress(content)
                    self.send_header('Content-Encoding', 'gzip')
            
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        except IOError:
            self.send_error(500)
    
    def guess_content_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        types = {
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.ico': 'image/x-icon',
            '.svg': 'image/svg+xml',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
        }
        return types.get(ext, 'application/octet-stream')
    
    def do_POST(self):
        if not self.check_rate_limit():
            return
        
        parsed = urlparse(self.path)
        
        # التحقق من حجم البيانات
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > MAX_BODY_SIZE:
            self.send_error_json(413, 'حجم البيانات كبير جداً')
            return
        
        try:
            post_data = self.rfile.read(content_length)
            body = json.loads(post_data.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            self.send_error_json(400, 'بيانات غير صالحة')
            return
        
        data = load_data()
        
        if parsed.path == '/api/orders':
            # إضافة طلب جديد
            order = body
            order['id'] = int(order.get('id', 0)) or int(__import__('time').time() * 1000)
            data['orders'].insert(0, order)
            
            # تحديث الطاولة
            table_id = order.get('tableId')
            for table in data['tables']:
                if table['id'] == table_id:
                    table['status'] = 'pending'
                    table['currentOrder'] = order['id']
                    break
            
            save_data(data)
            self.send_json({'success': True, 'order': order})
        
        elif parsed.path == '/api/orders/update':
            # تحديث حالة الطلب
            order_id = body.get('id')
            new_status = body.get('status')
            
            for order in data['orders']:
                if order['id'] == order_id:
                    order['status'] = new_status
                    
                    # تحديث الطاولة
                    for table in data['tables']:
                        if table['id'] == order['tableId']:
                            if new_status == 'completed':
                                table['status'] = 'available'
                                table['currentOrder'] = None
                            elif new_status == 'preparing':
                                table['status'] = 'occupied'
                            break
                    break
            
            save_data(data)
            self.send_json({'success': True})
        
        elif parsed.path == '/api/tables/update':
            # تحديث الطاولة
            table_id = body.get('id')
            updates = body.get('updates', {})
            
            for table in data['tables']:
                if table['id'] == table_id:
                    table.update(updates)
                    break
            
            save_data(data)
            self.send_json({'success': True})
        
        elif parsed.path == '/api/tables/count':
            # تغيير عدد الطاولات
            count = body.get('count', 10)
            current = data['tables']
            new_tables = []
            for i in range(1, count + 1):
                existing = next((t for t in current if t['id'] == i), None)
                if existing:
                    new_tables.append(existing)
                else:
                    new_tables.append({'id': i, 'status': 'available', 'currentOrder': None})
            data['tables'] = new_tables
            save_data(data)
            self.send_json({'success': True})
        
        elif parsed.path == '/api/orders/delete':
            order_id = body.get('id')
            data['orders'] = [o for o in data['orders'] if o['id'] != order_id]
            save_data(data)
            self.send_json({'success': True})
        
        elif parsed.path == '/api/deploy':
            # بدء النشر مع دعم القوالب
            site_id = body.get('siteId')
            template_id = body.get('templateId', 'current')
            
            with deploy_lock:
                if deploy_status['running']:
                    self.send_json({'success': False, 'error': 'النشر قيد التنفيذ حالياً'})
                    return
            
            # تشغيل النشر في خيط منفصل
            thread = threading.Thread(target=run_deploy, args=(site_id, template_id), daemon=True)
            thread.start()
            self.send_json({'success': True, 'message': 'بدأ النشر', 'siteId': site_id, 'templateId': template_id})
        
        else:
            self.send_error(404)
    
    def send_json(self, obj, compress=False):
        content = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # ضغط الاستجابات الكبيرة
        accept_encoding = self.headers.get('Accept-Encoding', '')
        if compress and 'gzip' in accept_encoding and len(content) > 1024:
            content = gzip.compress(content)
            self.send_header('Content-Encoding', 'gzip')
        
        self.send_header('Content-Length', len(content))
        self.end_headers()
        self.wfile.write(content)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Max-Age', '86400')  # 24 ساعة
        self.end_headers()


# ==========================================
# سيرفر مع دعم Threading
# ==========================================
class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """سيرفر متعدد الخيوط لدعم الطلبات المتزامنة"""
    daemon_threads = True
    request_queue_size = 100
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)


if __name__ == '__main__':
    # ضمان أن المخرجات تدعم العربية على Windows (تجنب UnicodeEncodeError)
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

    port = 3000
    server_start_time = time.time()  # تتبع وقت البدء
    server = ThreadedHTTPServer(('0.0.0.0', port), RestaurantHandler)

    banner = f'''
╔════════════════════════════════════════════════════════════════╗
║     🍽️  سيرفر المطعم المحسّن v2.0 - أداء فائق               ║
╠════════════════════════════════════════════════════════════════╣
║  🌐 الرابط: http://0.0.0.0:{port}                              ║
║  📱 للهاتف: http://192.168.1.112:{port}                        ║
║  ⚡ الخيوط المتزامنة: {MAX_WORKERS}                                 ║
║  🛡️  Rate Limit: {RATE_LIMIT_REQUESTS} طلب/{RATE_LIMIT_WINDOW} ثانية                       ║
║  📦 الكاش: {CACHE_TTL} ثواني (LRU مع إحصائيات)                    ║
║  🔧 API: /api/health | /api/stats                             ║
╚════════════════════════════════════════════════════════════════╝
    '''

    try:
        print(banner)
    except UnicodeEncodeError:
        # fallback بسيط بدون رموز/عربي
        print(f"Server started on http://0.0.0.0:{port} (UTF-8 output not supported in this console)")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n👋 تم إيقاف السيرفر')
        print(f'📊 إحصائيات الكاش النهائية: {cache.get_stats()}')
        server.shutdown()
