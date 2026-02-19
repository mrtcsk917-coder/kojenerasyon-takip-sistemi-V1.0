/**
 * KOJENERASYON TAKIP SISTEMI - MAIN
 * Ana uygulama baslatma ve yonlendirme
 */

document.addEventListener('DOMContentLoaded', function() {
    // Uygulamayi baslat
    App.init();
});

const App = {
    init: function() {
        // Tema yönetimini başlat
        if (window.ThemeManager) {
            ThemeManager.init();
        }
        
        // Kimlik dogrulama sistemini baslat
        Auth.setupLoginForm();
        Auth.checkAuth();
        
        // Tarih alanlarını otomatik doldur (başlangıçta)
        setTimeout(() => {
            if (window.CONFIG && CONFIG.autoFillDates) {
                CONFIG.autoFillDates();
            }
        }, 100);
        
        // Navigation event'lerini ayarla
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = item.dataset.page;
                
                // Sayfaya gec
                Utils.showPage(pageId);
                
                // Sayfaya ozel baslatma
                this.initPageModule(pageId);
            });
        });
    },

    initPageModule: function(pageId) {
        // Sayfa değiştiğinde tarih alanlarını güncelle (daha uzun gecikme ile)
        setTimeout(() => {
            if (window.CONFIG && CONFIG.autoFillDates) {
                CONFIG.autoFillDates();
            }
        }, 200); // 200ms gecikme
        
        switch(pageId) {
            case 'dashboard':
                if (window.Dashboard) Dashboard.init();
                break;
            case 'saatlik':
                if (window.Enerji) Enerji.init();
                break;
            case 'gunluk-enerji':
                if (window.Enerji) Enerji.init();
                break;
            case 'vardiya':
                if (window.Vardiya) Vardiya.init();
                break;
            case 'kojen-motor':
                if (window.KojenMotor) KojenMotor.init();
                break;
            case 'kojen-enerji':
                if (window.KojenEnerji) KojenEnerji.init();
                break;
            case 'bakim':
                if (window.BakimTakibi) BakimTakibi.init();
                break;
            case 'ariza':
                if (window.Ariza) Ariza.init();
                if (window.ArizaRaporlama) ArizaRaporlama.init();
                break;
            case 'buhar':
                if (window.BuharVerileri) {
                    BuharVerileri.init();
                }
                break;
            case 'raporlar':
                if (window.Raporlar) Raporlar.init();
                break;
            default:
                console.log('Bilinmeyen sayfa:', pageId);
        }
    },

    setupPageObserver: function() {
        // Sayfalar arasi geciste modulleri otomatik baslat
        const pages = document.querySelectorAll('.page');
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const page = mutation.target;
                    if (page.style.display !== 'none') {
                        const pageId = page.id.replace('-page', '');
                        this.initPageModule(pageId);
                    }
                }
            });
        });

        pages.forEach(page => {
            observer.observe(page, { attributes: true });
        });
    }
};

// App'i global yap
window.App = App;
