/**
 * نظام إدارة المطعم - الصفحة الرئيسية
 */

document.addEventListener('DOMContentLoaded', function() {
    generateQRCode();
});

// توليد QR Code للوصول السريع
function generateQRCode() {
    const qrContainer = document.getElementById('qr-code');
    if (!qrContainer) return;
    
    // الحصول على الرابط الحالي
    const currentUrl = window.location.href.replace('index.html', 'menu.html');
    
    // إنشاء QR Code
    if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(document.createElement('canvas'), currentUrl, {
            width: 150,
            margin: 2,
            color: {
                dark: '#2c3e50',
                light: '#ffffff'
            }
        }, function(error, canvas) {
            if (error) {
                console.error(error);
                qrContainer.innerHTML = '<p style="color: var(--light-text);">تعذر إنشاء QR Code</p>';
                return;
            }
            qrContainer.appendChild(canvas);
        });
    }
}
