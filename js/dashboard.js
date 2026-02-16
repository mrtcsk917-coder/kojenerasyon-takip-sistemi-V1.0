/**
 * Dashboard modülü
 */
const Dashboard = {
    
    /**
     * Modülü başlat
     */
    init: function() {
        this.updateDate();
        this.loadStats();
        this.setupEventListeners();
        this.initGoogleSheets();
    },

    /**
     * Tarih güncelle
     */
    updateDate: function() {
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            dateEl.textContent = now.toLocaleDateString('tr-TR', options);
        }
    },

    /**
     * İstatistikleri yükle
     */
    loadStats: function() {
        this.loadPendingMaintenance();
        this.loadActiveFaults();
        this.loadSystemStatus();
    },

    /**
     * Motor kartlarındaki günlük üretilen güç değerlerini topla
     */
    calculateTotalDailyPower: function() {
        const motors = ['gm1', 'gm2', 'gm3'];
        let totalDailyPower = 0;

        motors.forEach(motorId => {
            const powerEl = document.getElementById(`${motorId}-daily-power`);
            if (powerEl) {
                const powerText = powerEl.textContent;
                const powerValue = parseFloat(powerText.replace(/[^\d.]/g, ''));
                if (!isNaN(powerValue)) {
                    totalDailyPower += powerValue;
                }
            }
        });

        return totalDailyPower;
    },

    /**
     * Günlük enerji tüketimini hesapla ve göster
     */
    loadDailyEnergy: function() {
        const el = document.getElementById('daily-energy');
        if (!el) return;

        const totalDailyPower = this.calculateTotalDailyPower();

        // Demo veri - API'den çekilecek (yoksa motor kartlarından gelen verileri kullan)
        if (totalDailyPower === 0) {
            const demoEnergy = 84.75; // 28450 + 27200 + 29100 = 84750 kWh = 84.75 MWh
            el.textContent = `${demoEnergy} MWh`;
        } else {
            el.textContent = `${(totalDailyPower / 1000).toFixed(2)} MWh`;
        }
    },

    /**
     * Sistem durumunu hesapla
     */
    loadSystemStatus: function() {
        const el = document.getElementById('system-status');
        if (!el) return;

        // Tek bir storage key kullan
        const statusData = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.MOTOR_STATUS, {});
        
        let activeCount = 0;
        let totalCount = 0;
        
        ['gm1', 'gm2', 'gm3'].forEach(motorId => {
            totalCount++;
            const data = statusData[motorId] || { active: true };
            if (data.active) {
                activeCount++;
            }
        });

        // Durum metnini belirle
        let statusText = '';
        if (activeCount === totalCount) {
            statusText = 'Tümü Aktif';
            el.style.color = '#10b981';
        } else if (activeCount === 0) {
            statusText = 'Tümü Pasif';
            el.style.color = '#ef4444';
        } else {
            statusText = `${activeCount}/${totalCount} Aktif`;
            el.style.color = '#f59e0b';
        }
        
        el.textContent = statusText;
    },

    /**
     * Bekleyen bakım sayısı
     */
    loadPendingMaintenance: function() {
        const el = document.getElementById('pending-maintenance');
        if (!el) return;

        // LocalStorage'dan bakım verilerini çek
        const bakimData = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.BAKIM_DATA, []);
        const pending = bakimData.filter(b => b.durum === 'planlandi' || b.durum === 'devam').length;
        
        el.textContent = pending > 0 ? `${pending} adet` : 'Yok';
    },

    /**
     * Aktif arıza sayısı
     */
    loadActiveFaults: function() {
        const el = document.getElementById('active-faults');
        if (!el) return;

        // LocalStorage'dan arıza verilerini çek
        const arizaData = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.ARIZA_DATA, []);
        const active = arizaData.filter(a => a.durum === 'aktif').length;
        
        el.textContent = active > 0 ? `${active} adet` : 'Yok';
    },

    /**
     * Verileri localStorage'dan yenile
     */
    refreshFromAPI: function() {
        Utils.showToast('LocalStorage verileri kullanılıyor', 'info');
        
        // LocalStorage'dan verileri yükle
        this.loadStats();
        
        Utils.showToast('Veriler güncellendi', 'success');
    },

    /**
     * Event listener'ları ayarla
     */
    setupEventListeners: function() {
        // Buhar ile ilgili listener'lar kaldırıldı
    },
    
    /**
     * Google Sheets'i başlat
     */
    initGoogleSheets: function() {
        // Google Sheets API zaten merkezi konfigürasyonu kullanıyor
        
        // Otomatik senkronizasyon
        this.setupAutoSync();
    },

    /**
     * Otomatik senkronizasyon ayarla
     */
    setupAutoSync: function() {
        // Her 5 dakikada bir senkronize et
        setInterval(() => {
            this.autoSyncToGoogleSheets();
        }, 5 * 60 * 1000);
    },

    /**
     * Otomatik senkronizasyon (localStorage modu)
     */
    autoSyncToGoogleSheets: async function() {
        try {
            // LocalStorage modu - senkronizasyon gerekmez
            console.log('LocalStorage modu - senkronizasyon devre dışı');
            
        } catch (error) {
            console.error('Senkronizasyon hatası:', error);
        }
    }
};

// Dashboard'u global olarak erişilebilir yap
window.Dashboard = Dashboard;
