/**
 * KOJENERASYON TAKIP SISTEMI - CONFIG
 * Merkezi yapilandirma dosyasi
 */

const CONFIG = {
    // Uygulama ayarlari
    APP_NAME: 'Kojenerasyon Takip Sistemi',
    VERSION: '1.0.0',
    
    // Motor konfigurasyonu
    MOTORS: [
        { id: 'GM1', name: 'JENBACH 1', color: '#2563eb' },
        { id: 'GM2', name: 'JENBACH 2', color: '#10b981' },
        { id: 'GM3', name: 'JENBACH 3', color: '#f59e0b' }
    ],
    
    // Saat dilimleri (6 saatlik periyotlar)
    HOURS: ['00:00', '06:00', '12:00', '18:00'],
    
    // Enerji input alanlari
    ENERGY_FIELDS: ['uretim', 'tuketim', 'devir', 'sicaklik'],
    
    // Varsayilan kullanici (ilk kurulum icin)
    DEFAULT_USERS: [
        { username: 'admin', password: 'admin123', name: 'Yonetici', role: 'admin' },
        { username: 'yönetici', password: 'yonetici123', name: 'Yönetici', role: 'yönetici' },
        { username: 'operator', password: 'op123', name: 'Operator', role: 'operator' },
        { username: 'user', password: 'user123', name: 'Normal Kullanıcı', role: 'user' }
    ],
    
    // Tarih formatı yardımcı fonksiyonu (Türkçe format)
    formatDate: function(date = new Date()) {
        if (typeof date === 'string') date = new Date(date);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    },
    
    // Tarih ve saat formatı (Türkçe format)
    formatDateTime: function(date = new Date()) {
        if (typeof date === 'string') date = new Date(date);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    },
    
    // Tüm tarih input'larını otomatik doldur
    autoFillDates: function() {
        // DOM'un tamamen yüklenmesi için kısa bir gecikme
        setTimeout(() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`; // HTML date input formatı
            
            const dateInputs = [
                'hourly-date',
                'daily-date',
                'vardiya-tarih',
                'ariza-baslangic-tarih',
                'ariza-bitis-tarih',
                'steam-date',
                'kojen-motor-date',
                'kojen-enerji-date',
                'tarih-planli',
                'tarih-devam',
                'tarih-cozuldu'
            ];
            
            let filledCount = 0;
            dateInputs.forEach(inputId => {
                const input = document.getElementById(inputId);
                if (input && input.type === 'date') {
                    input.value = dateString;
                    if (!input.hasAttribute('readonly') && !input.hasAttribute('max')) {
                        input.max = dateString;
                    }
                    filledCount++;
                } else if (input) {
                    // Input var ama date değil - sessizce geç
                }
            });
            // Debug mesajı kaldırıldı
        }, 100); // 100ms gecikme
    },
    
    // LocalStorage anahtarlari
    STORAGE_KEYS: {
        USERS: 'kojen_users',
        CURRENT_USER: 'kojen_current_user',
        REMEMBER_ME: 'kojen_remember',
        SHEETS_URL: 'sheets_url',
        BAKIM_DATA: 'kojen_bakim',
        ARIZA_DATA: 'kojen_ariza',
        MOTOR_STATUS: 'kojen_motor_status',
        MOTOR_TOGGLE_STATUS: 'kojen_motor_toggle_status'
    },
    
    // Demo mod (API baglantisi yoksa)
    DEMO_MODE: false,
    
    // Debug mod (sadece geliştirme için)
    DEBUG_MODE: true,
    
    // Google Sheets Web App URL'leri (API Key gerekmez)
    GOOGLE_SHEETS_WEB_APP_URLS: {
        buhar: 'https://script.google.com/macros/s/AKfycbxi8N33CjAJRWmUfQDS4D9sy-97N0Op6Bz85i9jsIhYruNqfidC7dXoxmYFBNxun_QI/exec',
        saatlik: 'https://script.google.com/macros/s/AKfycbxQt6pson5CdJP83lw7JVkXX3a4v8fb-PfHZcqPDcbkaFe__RSz9pYp0smeneBpsksV/exec'
        // Diğer modüller geçici olarak devre dışı
        // kojen_motor: 'URL',
        // kojen_enerji: 'URL',
        // gunluk_enerji: 'URL',
        // vardiya: 'URL',
        // bakim: 'URL',
        // ariza: 'URL'
    },
    
    // Geriye dönük uyumluluk için eski URL
    GOOGLE_SHEETS_API_URL: 'https://script.google.com/macros/s/AKfycbxm80ryVEsRr0Jrg_PAAJe-8e7eS9EYIbdlbpSYTUHSXceLVVkMRNL9Zy430IZ_APVZ/exec'
};

// Config'i global olarak erisilebilir yap
window.CONFIG = CONFIG;
