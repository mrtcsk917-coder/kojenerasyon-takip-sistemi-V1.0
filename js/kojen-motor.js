/**
 * Kojen Motor Verileri Modülü
 */
const KojenMotor = {
    
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
        const tableBody = document.getElementById('kojen-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        // 24 saatlik veri satırları oluştur
        for (let hour = 0; hour < 24; hour++) {
            const row = document.createElement('div');
            row.className = 'kojen-table-row';
            
            // Saat sütunu
            const hourCell = document.createElement('div');
            hourCell.className = 'kojen-table-cell hour-cell';
            hourCell.textContent = `${hour.toString().padStart(2, '0')}:00`;
            row.appendChild(hourCell);

            // 15 parametre input'u
            const parameters = [
                'jen-yatak-de', 'jen-yatak-nde', 'sogutma-sicaklik', 'sogutma-basinc',
                'yag-sicaklik', 'yag-basinc', 'sarj-sicaklik', 'sarj-basinc',
                'gaz-regulator', 'makine-sicaklik', 'karter-basinc', 'on-kamara-basinc',
                'sargi-1', 'sargi-2', 'sargi-3'
            ];

            parameters.forEach(param => {
                const cell = document.createElement('div');
                cell.className = 'kojen-table-cell';
                
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'kojen-input';
                input.id = `kojen-${hour}-${param}`;
                input.placeholder = '0.0';
                input.step = '0.1';
                input.min = '0';
                
                // Input event listener'ları
                input.addEventListener('input', (e) => {
                    this.validateInput(e.target);
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
        const saveBtn = document.getElementById('save-kojen-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveData();
            });
        }

        // Temizle butonu
        const clearBtn = document.getElementById('clear-kojen-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Tüm verileri temizlemek istediğinize emin misiniz?')) {
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
        const tableBody = document.querySelector('.kojen-table-body');
        const tableHeader = document.querySelector('.kojen-table-header');

        if (tableBody && tableHeader) {
            tableBody.addEventListener('scroll', () => {
                tableHeader.scrollLeft = tableBody.scrollLeft;
            });
        }
    },

    /**
     * Input validasyonu
     */
    validateInput: function(input) {
        const value = parseFloat(input.value);
        
        // Sınırları kontrol et
        if (isNaN(value) || value < 0) {
            input.value = '';
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 2000);
            return false;
        }

        // Maksimum değerler (parametreye göre)
        const maxValues = {
            'yag-basinc': 10,
            'sarj-basinc': 10,
            'karter-basinc': 10,
            'on-kamara-basinc': 10,
            'sogutma-basinc': 10,
            'gaz-regulator': 2,
            'default': 200
        };

        const param = input.id.split('-').slice(2).join('-');
        const maxValue = maxValues[param] || maxValues.default;

        if (value > maxValue) {
            input.value = maxValue;
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
        
        const storageKey = `kojen_motor_${today}`;
        Utils.saveToStorage(storageKey, data);
    },

    /**
     * LocalStorage'dan verileri yükle
     */
    loadFromLocalStorage: function() {
        const today = CONFIG.formatDate();
        const storageKey = `kojen_motor_${today}`;
        
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
        const inputs = document.querySelectorAll('.kojen-input');
        
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
        const saveBtn = document.getElementById('save-kojen-btn');
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
            tarih: document.getElementById('kojen-motor-date')?.value || today,
            kayitZamani: CONFIG.formatDateTime(),
            veriler: data
        };

        // LocalStorage'a kaydet
        const storageKey = `kojen_motor_${today}`;
        Utils.saveToStorage(storageKey, saveData);

        // API'a gönder
        await this.sendToAPI(saveData);

        // Başarılı mesajı
        setTimeout(() => {
            Utils.showToast('Kojen motor verileri başarıyla kaydedildi', 'success');
            this.resetSaveButton(saveBtn);
            
            // Başarılı animasyonu
            document.querySelectorAll('.kojen-input').forEach(input => {
                if (input.value) {
                    input.classList.add('kojen-success');
                    setTimeout(() => input.classList.remove('kojen-success'), 2000);
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
                const result = await GoogleSheetsAPI.saveData('kojen_motor', data);
                
                if (result.success) {
                    console.log('Kojen motor verileri Google Sheets\'e kaydedildi:', result);
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
        const inputs = document.querySelectorAll('.kojen-input');
        
        inputs.forEach(input => {
            input.value = '';
            input.classList.remove('error', 'kojen-success');
        });

        // LocalStorage'ı temizle
        const today = CONFIG.formatDate();
        const storageKey = `kojen_motor_${today}`;
        Utils.saveToStorage(storageKey, {});

        Utils.showToast('Tüm veriler temizlendi', 'success');
    },

    /**
     * Verileri dışa aktar
     */
    exportData: function() {
        const data = this.getAllData();
        const today = CONFIG.formatDate();
        
        // CSV formatında dışa aktar
        let csv = 'Saat,JEN.YATAK(DE),JEN.YATAK(NDE),SOĞUTMA.SICAKLIK,SOĞUTMA.BASINCI,YAĞ.SICAKLIK,YAĞ.BASINCI,ŞARJ.SICAKLIK,ŞARJ.BASINCI,GAZ.REGÜLATÖR,MAKİNE.SICAKLIK,KARTER.BASINCI,ÖN.KAMARA.BASINCI,SARGI.1,SARGI.2,SARGI.3\n';
        
        for (let hour = 0; hour < 24; hour++) {
            const hourStr = `${hour.toString().padStart(2, '0')}:00`;
            const row = [hourStr];
            
            const parameters = [
                'jen-yatak-de', 'jen-yatak-nde', 'sogutma-sicaklik', 'sogutma-basinc',
                'yag-sicaklik', 'yag-basinc', 'sarj-sicaklik', 'sarj-basinc',
                'gaz-regulator', 'makine-sicaklik', 'karter-basinc', 'on-kamara-basinc',
                'sargi-1', 'sargi-2', 'sargi-3'
            ];

            parameters.forEach(param => {
                const inputId = `kojen-${hour}-${param}`;
                row.push(data[inputId] || '');
            });

            csv += row.join(',') + '\n';
        }

        // Dosya olarak indir
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `kojen_motor_${today}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Utils.showToast('Veriler CSV olarak indirildi', 'success');
    },

    /**
     * Verileri içe aktar
     */
    importData: function(file) {
        // CSV dosyasından veri içe aktarma
        // Bu fonksiyon ileride geliştirilebilir
        console.log('İçe aktarma fonksiyonu:', file);
    }
};

// KojenMotor'u global olarak erişilebilir yap
window.KojenMotor = KojenMotor;
