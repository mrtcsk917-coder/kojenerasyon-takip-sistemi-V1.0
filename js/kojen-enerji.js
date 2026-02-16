/**
 * Kojen Enerji Verileri Modülü
 */
const KojenEnerji = {
    
    /**
     * Modülü başlat
     */
    init: function() {
        this.generateTable();
        this.setupEventListeners();
        this.setupScrollSync();
    },

    /**
     * Tabloyu oluştur
     */
    generateTable: function() {
        const tableBody = document.getElementById('kojen-enerji-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        // 24 saatlik veri satırları oluştur
        for (let hour = 0; hour < 24; hour++) {
            const row = document.createElement('div');
            row.className = 'kojen-enerji-table-row';
            
            // Saat sütunu
            const hourCell = document.createElement('div');
            hourCell.className = 'kojen-enerji-table-cell hour-cell';
            hourCell.textContent = `${hour.toString().padStart(2, '0')}:00`;
            row.appendChild(hourCell);

            // 11 parametre input'u
            const parameters = [
                { id: 'aydem-voltaji', type: 'voltage', placeholder: '0.0', step: '0.1', max: 500 },
                { id: 'aktif-guc', type: 'power', placeholder: '0.0', step: '0.1', max: 10000 },
                { id: 'reaktif-guc', type: 'power', placeholder: '0.0', step: '0.1', max: 10000 },
                { id: 'cosfi', type: 'cosphi', placeholder: '0.00', step: '0.01', min: '0', max: '1' },
                { id: 'ort-akim', type: 'current', placeholder: '0.0', step: '0.1', max: 1000 },
                { id: 'ort-gerilim', type: 'voltage', placeholder: '0.0', step: '0.1', max: 500 },
                { id: 'notr-akim', type: 'current', placeholder: '0.0', step: '0.1', max: 100 },
                { id: 'tahrik-gerilim', type: 'voltage', placeholder: '0.0', step: '0.1', max: 500 },
                { id: 'toplam-aktif-enerji', type: 'energy', placeholder: '0.0', step: '0.1', max: 100000 },
                { id: 'calisma-saati', type: 'hours', placeholder: '0.0', step: '0.1', max: '1' },
                { id: 'kalkis-sayisi', type: 'count', placeholder: '0', step: '1', min: '0', max: '100' }
            ];

            parameters.forEach(param => {
                const cell = document.createElement('div');
                cell.className = 'kojen-enerji-table-cell';
                
                const input = document.createElement('input');
                input.type = 'number';
                input.className = `kojen-enerji-input ${param.type}`;
                input.id = `kojen-enerji-${hour}-${param.id}`;
                input.placeholder = param.placeholder;
                input.step = param.step;
                input.min = param.min || '0';
                input.max = param.max;
                
                // Input event listener'ları
                input.addEventListener('input', (e) => {
                    this.validateInput(e.target, param);
                    this.saveToLocalStorage();
                });

                input.addEventListener('focus', (e) => {
                    e.target.select();
                });

                cell.appendChild(input);
                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        }

        // LocalStorage'dan verileri yükle
        this.loadFromLocalStorage();
    },

    /**
     * Event listener'ları ayarla
     */
    setupEventListeners: function() {
        // Kaydet butonu
        const saveBtn = document.getElementById('save-kojen-enerji-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveData();
            });
        }

        // Temizle butonu
        const clearBtn = document.getElementById('clear-kojen-enerji-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Tüm enerji verilerini temizlemek istediğinize emin misiniz?')) {
                    this.clearAllData();
                }
            });
        }

        // Klavye kısayolları
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveData();
            }
        });

        // Sayfa değişiminde verileri kaydet
        window.addEventListener('beforeunload', () => {
            this.saveToLocalStorage();
        });
    },

    /**
     * Scroll senkronizasyonu ayarla
     */
    setupScrollSync: function() {
        const tableBody = document.querySelector('.kojen-enerji-table-body');
        const tableHeader = document.querySelector('.kojen-enerji-table-header');

        if (tableBody && tableHeader) {
            tableBody.addEventListener('scroll', () => {
                tableHeader.scrollLeft = tableBody.scrollLeft;
            });
        }
    },

    /**
     * Input validasyonu
     */
    validateInput: function(input, param) {
        const value = parseFloat(input.value);
        
        // Sınırları kontrol et
        if (isNaN(value) || value < 0) {
            input.value = '';
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 2000);
            return false;
        }

        // Cos φ özel kontrolü (0-1 arası)
        if (param.id === 'cosfi' && value > 1) {
            input.value = '1.00';
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 2000);
            return false;
        }

        // Çalışma saati özel kontrolü (max 1 saat)
        if (param.id === 'calisma-saati' && value > 1) {
            input.value = '1.0';
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 2000);
            return false;
        }

        // Genel maksimum değer kontrolü
        if (value > parseFloat(param.max)) {
            input.value = param.max;
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 2000);
            return false;
        }

        input.classList.remove('error');
        return true;
    },

    /**
     * Verileri LocalStorage'a kaydet
     */
    saveToLocalStorage: function() {
        const data = this.getAllData();
        const today = CONFIG.formatDate();
        
        const storageKey = `kojen_enerji_${today}`;
        Utils.saveToStorage(storageKey, data);
    },

    /**
     * LocalStorage'dan verileri yükle
     */
    loadFromLocalStorage: function() {
        const today = CONFIG.formatDate();
        const storageKey = `kojen_enerji_${today}`;
        
        const data = Utils.loadFromStorage(storageKey, {});
        
        // Verileri input'lara doldur
        Object.keys(data).forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input && data[inputId]) {
                input.value = data[inputId];
            }
        });
    },

    /**
     * Tüm verileri al
     */
    getAllData: function() {
        const data = {};
        const inputs = document.querySelectorAll('.kojen-enerji-input');
        
        inputs.forEach(input => {
            if (input.value) {
                data[input.id] = input.value;
            }
        });

        return data;
    },

    /**
     * Verileri kaydet
     */
    saveData: async function() {
        const saveBtn = document.getElementById('save-kojen-enerji-btn');
        const data = this.getAllData();

        // Loading state
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '💾 Kaydediliyor...';
        }

        // Validasyon
        if (Object.keys(data).length === 0) {
            Utils.showToast('Lütfen en az bir veri girin', 'warning');
            this.resetSaveButton(saveBtn);
            return;
        }

        // Tarih bilgisi ekle
        const today = CONFIG.formatDate();
        const saveData = {
            id: Date.now().toString(),
            tarih: document.getElementById('kojen-enerji-date')?.value || today,
            kayitZamani: CONFIG.formatDateTime(),
            veriler: data
        };

        // LocalStorage'a kaydet
        const storageKey = `kojen_enerji_${today}`;
        Utils.saveToStorage(storageKey, saveData);

        // API'a gönder
        await this.sendToAPI(saveData);

        // Başarılı mesajı
        setTimeout(() => {
            Utils.showToast('Kojen enerji verileri başarıyla kaydedildi', 'success');
            this.resetSaveButton(saveBtn);
            
            // Başarılı animasyonu
            document.querySelectorAll('.kojen-enerji-input').forEach(input => {
                if (input.value) {
                    input.classList.add('kojen-enerji-success');
                    setTimeout(() => input.classList.remove('kojen-enerji-success'), 2000);
                }
            });
        }, 1000);
    },

    /**
     * API'a veri gönder
     */
    sendToAPI: async function(data) {
        try {
            // Google Sheets API entegrasyonu
            if (!CONFIG.DEMO_MODE && window.GoogleSheetsAPI) {
                const result = await GoogleSheetsAPI.saveData('kojen_enerji', data);
                
                if (result.success) {
                    console.log('Kojen enerji verileri Google Sheets\'e kaydedildi:', result);
                } else {
                    console.error('Google Sheets kayıt hatası:', result.error);
                    Utils.showToast('⚠️ LocalStorage\'a kaydedildi, Google Sheets hatası: ' + result.error, 'warning');
                }
            } else {
                console.log('Demo mod - API çağrısı atlandı');
            }
        } catch (error) {
            console.error('API gönderme hatası:', error);
            Utils.showToast('❌ API hatası: ' + error.message, 'error');
        }
    },

    /**
     * Kaydet butonunu sıfırla
     */
    resetSaveButton: function(btn) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '💾 Kaydet';
        }
    },

    /**
     * Tüm verileri temizle
     */
    clearAllData: function() {
        const inputs = document.querySelectorAll('.kojen-enerji-input');
        
        inputs.forEach(input => {
            input.value = '';
            input.classList.remove('error', 'kojen-enerji-success');
        });

        // LocalStorage'ı temizle
        const today = CONFIG.formatDate();
        const storageKey = `kojen_enerji_${today}`;
        Utils.saveToStorage(storageKey, {});

        Utils.showToast('Tüm enerji verileri temizlendi', 'success');
    },

    /**
     * Verileri dışa aktar
     */
    exportData: function() {
        const data = this.getAllData();
        const today = CONFIG.formatDate();
        
        // CSV formatında dışa aktar
        let csv = 'Saat,L1-L2 AYDEM VOLTAJI,(P) AKTİF GÜÇ,(Q) REAKTİF GÜÇ,Cos φ,ORT.AKIM,ORT.GERİLİM,NÖTR AKIMI (LN),TAHRİK GERİLİMİ (UE),TOPLAM AKTİF ENERJİ,ÇALIŞMA SAATİ,KALKIŞ SAYISI\n';
        
        for (let hour = 0; hour < 24; hour++) {
            const hourStr = `${hour.toString().padStart(2, '0')}:00`;
            const row = [hourStr];
            
            const parameters = [
                'aydem-voltaji', 'aktif-guc', 'reaktif-guc', 'cosfi',
                'ort-akim', 'ort-gerilim', 'notr-akim', 'tahrik-gerilim',
                'toplam-aktif-enerji', 'calisma-saati', 'kalkis-sayisi'
            ];

            parameters.forEach(param => {
                const inputId = `kojen-enerji-${hour}-${param}`;
                row.push(data[inputId] || '');
            });

            csv += row.join(',') + '\n';
        }

        // Dosya olarak indir
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `kojen_enerji_${today}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Utils.showToast('Enerji verileri CSV olarak indirildi', 'success');
    },

    /**
     * Verileri içe aktar
     */
    importData: function(file) {
        // CSV dosyasından veri içe aktarma
        // Bu fonksiyon ileride geliştirilebilir
        console.log('İçe aktarma fonksiyonu:', file);
    },

    /**
     * İstatistikleri hesapla
     */
    calculateStatistics: function() {
        const data = this.getAllData();
        const stats = {
            totalAktifGuc: 0,
            totalReaktifGuc: 0,
            avgCosfi: 0,
            totalEnerji: 0,
            totalCalismaSaati: 0,
            totalKalkisSayisi: 0
        };

        let aktifGucCount = 0;
        let cosfiCount = 0;

        Object.keys(data).forEach(inputId => {
            const value = parseFloat(data[inputId]);
            if (isNaN(value)) return;

            if (inputId.includes('aktif-guc')) {
                stats.totalAktifGuc += value;
                aktifGucCount++;
            } else if (inputId.includes('reaktif-guc')) {
                stats.totalReaktifGuc += value;
            } else if (inputId.includes('cosfi')) {
                stats.avgCosfi += value;
                cosfiCount++;
            } else if (inputId.includes('toplam-aktif-enerji')) {
                stats.totalEnerji += value;
            } else if (inputId.includes('calisma-saati')) {
                stats.totalCalismaSaati += value;
            } else if (inputId.includes('kalkis-sayisi')) {
                stats.totalKalkisSayisi += value;
            }
        });

        // Ortalamaları hesapla
        if (aktifGucCount > 0) stats.totalAktifGuc = stats.totalAktifGuc / aktifGucCount;
        if (cosfiCount > 0) stats.avgCosfi = stats.avgCosfi / cosfiCount;

        return stats;
    }
};

// KojenEnerji'yi global olarak erişilebilir yap
window.KojenEnerji = KojenEnerji;
