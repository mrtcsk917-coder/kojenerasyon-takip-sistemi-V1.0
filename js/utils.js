/**
 * KOJENERASYON TAKIP SISTEMI - UTILS
 * Yardimci fonksiyonlar
 */

const Utils = {
    // Toast Queue Sistemi
    toastQueue: [],
    isToastShowing: false,

    /**
     * Toast Queue - Sıralı toast gösterimi
     */
    processToastQueue: function() {
        if (this.toastQueue.length === 0 || this.isToastShowing) {
            return;
        }
        
        this.isToastShowing = true;
        const { message, type, duration } = this.toastQueue.shift();
        
        const toast = document.getElementById('toast');
        if (!toast) {
            this.isToastShowing = false;
            this.processToastQueue();
            return;
        }
        
        console.log('=== TOAST QUEUE BAŞLATILIYOR ===');
        console.log('Mesaj:', message);
        console.log('Tip:', type);
        
        // Toast'u göster
        toast.classList.remove('hidden');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        
        console.log('Toast gösterildi:', toast.className);
        
        // Süre sonra gizle ve bir sonrakini göster
        setTimeout(() => {
            toast.classList.add('hidden');
            console.log('Toast gizlendi');
            this.isToastShowing = false;
            
            // 500ms sonra bir sonrakini göster
            setTimeout(() => this.processToastQueue(), 500);
        }, duration);
    },

    /**
     * Tarihi formatla (DD/MM/YYYY - Türkçe format)
     */
    formatDate: function(date) {
        if (!date) date = new Date();
        if (typeof date === 'string') date = new Date(date);
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    },

    /**
     * Tarihi input formatina cevir (YYYY-MM-DD)
     */
    formatDateInput: function(date) {
        if (!date) date = new Date();
        if (typeof date === 'string') date = new Date(date);
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${year}-${month}-${day}`;
    },

    /**
     * Saat formatla (HH:00)
     */
    formatTime: function(date) {
        if (!date) date = new Date();
        const hours = String(date.getHours()).padStart(2, '0');
        return `${hours}:00`;
    },

    /**
     * Simdiki tarihi al (YYYY-MM-DD HH:00)
     */
    getCurrentDateTime: function() {
        const now = new Date();
        const date = this.formatDateInput(now);
        const time = this.formatTime(now);
        return `${date} ${time}`;
    },
    
    /**
     * Mevcut kullaniciyi al
     */
    getCurrentUser: function() {
        return this.loadFromStorage(CONFIG.STORAGE_KEYS.CURRENT_USER);
    },

    /**
     * Tarih adini al (Ay YYYY)
     */
    getMonthName: function(date) {
        if (!date) date = new Date();
        const months = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
                       'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    },

    /**
     * Loading göstergesi göster
     */
    showLoading: function() {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = '⏳ Yükleniyor...';
            toast.className = 'toast info';
            toast.classList.remove('hidden');
        }
    },

    /**
     * Loading göstergesini gizle
     */
    hideLoading: function() {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.classList.add('hidden');
        }
    },

    /**
     * Loading göstergesi göster (Toast için)
     */
    showToast: function(message, type = 'success', duration = 3000) {
        // Toast'u queue'ya ekle
        this.toastQueue.push({ message, type, duration });
        console.log('Toast queue\'ya eklendi:', { message, type, duration });
        console.log('Queue uzunluğu:', this.toastQueue.length);
        
        // Queue'yu işle
        this.processToastQueue();
    },

    /**
     * LocalStorage'a kaydet
     */
    saveToStorage: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage kaydetme hatasi:', e);
            return false;
        }
    },

    /**
     * LocalStorage'dan oku
     */
    loadFromStorage: function(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Storage okuma hatasi:', e);
            return defaultValue;
        }
    },

    /**
     * Benzersiz ID olustur
     */
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Form verilerini topla
     */
    getFormData: function(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        
        const formData = new FormData(form);
        const data = {};
        
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        return data;
    },

    /**
     * Formu temizle
     */
    clearForm: function(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        form.reset();
    },

    /**
     * Input degerini ayarla
     */
    setInputValue: function(id, value) {
        const input = document.getElementById(id);
        if (input) input.value = value;
    },

    /**
     * Input degerini al
     */
    getInputValue: function(id) {
        const input = document.getElementById(id);
        return input ? input.value : '';
    },

    /**
     * HTML element goster/gizle
     */
    toggleElement: function(id, show) {
        const el = document.getElementById(id);
        if (el) {
            if (show) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    },

    /**
     * Sayfa goster
     */
    showPage: function(pageId) {
        // Tum sayfalari gizle
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Nav item'lari guncelle
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageId) {
                item.classList.add('active');
            }
        });
        
        // Hedef sayfayi goster
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }
    },

    /**
     * Array'i tarihe gore sirala (yeni -> eski)
     */
    sortByDate: function(array, dateField = 'tarih') {
        return array.sort((a, b) => {
            const dateA = new Date(a[dateField]);
            const dateB = new Date(b[dateField]);
            return dateB - dateA;
        });
    },

    /**
     * Sayiyi formatla
     */
    formatNumber: function(num, decimals = 2) {
        if (num === null || num === undefined) return '-';
        return Number(num).toFixed(decimals);
    },

    /**
     * Metni kisalt
     */
    truncateText: function(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    /**
     * Durum rengi dondur
     */
    getStatusColor: function(status) {
        const colors = {
            'aktif': '#ef4444',
            'cozuldu': '#10b981',
            'devam': '#f59e0b',
            'tamamlandi': '#10b981',
            'planlandi': '#3b82f6'
        };
        return colors[status] || '#64748b';
    },

    /**
     * Durum metni dondur
     */
    getStatusText: function(status) {
        return texts[status] || status;
    }
};

// Utils'i global olarak erisilebilir yap
window.Utils = Utils;
