/**
 * Tema Yönetimi Modülü
 * Koyu/Açık tema değiştirme özelliği
 */

const ThemeManager = {
    /**
     * Modülü başlat
     */
    init: function() {
        // DOM hazır olduğunda başlat
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.loadTheme();
            });
        } else {
            this.setupEventListeners();
            this.loadTheme();
        }
    },

    /**
     * Event listener'ları ayarla
     */
    setupEventListeners: function() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    },

    /**
     * Tema değiştir
     */
    toggleTheme: function() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        html.setAttribute('data-theme', newTheme);
        
        // localStorage'a güvenli şekilde kaydet
        try {
            localStorage.setItem('theme', newTheme);
        } catch (e) {
            console.warn('localStorage erişim hatası:', e);
        }
        
        // İkon değiştir
        const themeIcon = document.querySelector('.theme-toggle-icon');
        if (themeIcon) {
            themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        }
        
        // Toast bildirim
        if (window.Utils) {
            Utils.showToast(
                newTheme === 'dark' ? 'Koyu tema aktif' : 'Açık tema aktif',
                'success'
            );
        }
    },

    /**
     * Kaydedilen temayı yükle
     */
    loadTheme: function() {
        let savedTheme = 'light';
        
        // localStorage'dan güvenli şekilde oku
        try {
            savedTheme = localStorage.getItem('theme') || 'light';
        } catch (e) {
            console.warn('localStorage okuma hatası:', e);
            savedTheme = 'light';
        }
        
        // Opera için küçük bir gecikme ile uygula
        setTimeout(() => {
            const html = document.documentElement;
            html.setAttribute('data-theme', savedTheme);
            
            // İkon ayarla
            const themeIcon = document.querySelector('.theme-toggle-icon');
            if (themeIcon) {
                themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
            }
        }, 50);
    },

    /**
     * Sistem temasını al
     */
    getSystemTheme: function() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },

    /**
     * Sistem temasını uygula
     */
    applySystemTheme: function() {
        const systemTheme = this.getSystemTheme();
        const html = document.documentElement;
        
        html.setAttribute('data-theme', systemTheme);
        
        // İkon ayarla
        const themeIcon = document.querySelector('.theme-toggle-icon');
        if (themeIcon) {
            themeIcon.textContent = systemTheme === 'dark' ? '☀️' : '🌙';
        }
    }
};

// Tema modülünü global olarak erişilebilir yap
window.ThemeManager = ThemeManager;
