/**
 * Vardiya Takibi Modülü
 */
const Vardiya = {
    
    /**
     * Modülü başlat
     */
    init: function() {
        this.setupEventListeners();
        this.setAutoDate();
        this.setAutoVardiyaTipi();
        this.loadOperatorsToDropdowns();
        this.loadVardiyalar();
        this.updateCurrentVardiya();
    },

    /**
     * Otomatik tarih ayarla
     */
    setAutoDate: function() {
        const tarihInput = document.getElementById('vardiya-tarih');
        if (tarihInput) {
            // Bugünün tarihini YYYY-MM-DD formatında ayarla
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            
            console.log('📅 Otomatik tarih ayarlanıyor:', formattedDate); // Debug
            tarihInput.value = formattedDate;
            
            // Auto-fill değerini de güncelle
            const autoDateEl = document.getElementById('auto-date');
            if (autoDateEl) {
                const autoInput = autoDateEl.querySelector('.auto-filled-input');
                if (autoInput) {
                    autoInput.value = formattedDate;
                    console.log('📅 Auto-fill input güncellendi:', autoInput.value); // Debug
                }
            }
        }
    },

    /**
     * Otomatik vardiya tipi ayarla
     */
    setAutoVardiyaTipi: function() {
        const vardiyaTipiSelect = document.getElementById('vardiya-tipi');
        console.log('🔍 Vardiya tipi select elementi:', vardiyaTipiSelect);
        
        if (vardiyaTipiSelect) {
            const hour = new Date().getHours();
            console.log('🕐 Mevcut saat:', hour);
            
            let selectedVardiya = '';
            
            // Vardiya saat dilimleri:
            // 00:00-08:00 = gece
            // 08:00-16:00 = gunduz  
            // 16:00-24:00 = aksam
            
            if (hour >= 0 && hour < 8) {
                selectedVardiya = 'gece';
            } else if (hour >= 8 && hour < 16) {
                selectedVardiya = 'gunduz';
            } else {
                selectedVardiya = 'aksam';
            }
            
            console.log('✅ Seçilen vardiya:', selectedVardiya);
            vardiyaTipiSelect.value = selectedVardiya;
            console.log('📝 Set edilen değer:', vardiyaTipiSelect.value);
            
            // Vardiya değişim event'ini tetikle (yardımcı personel bölümü için)
            vardiyaTipiSelect.dispatchEvent(new Event('change'));
        }
    },

    /**
     * Dropdown'lara operatörleri yükle
     */
    loadOperatorsToDropdowns: function() {
        const operators = Auth.getOperators();
        
        // Vardiya personeli dropdown
        const vardiyaSelect = document.getElementById('vardiya-personeli');
        if (vardiyaSelect) {
            vardiyaSelect.innerHTML = '<option value="">Personel seçiniz...</option>';
            operators.forEach(operator => {
                const option = document.createElement('option');
                option.value = operator.name;
                option.textContent = operator.name;
                vardiyaSelect.appendChild(option);
            });
        }
        
        // Yardımcı personel dropdown
        const yardimciSelect = document.getElementById('yardimci-personel');
        if (yardimciSelect) {
            yardimciSelect.innerHTML = '<option value="">Yardımcı personel seçiniz...</option>';
            operators.forEach(operator => {
                const option = document.createElement('option');
                option.value = operator.name;
                option.textContent = operator.name;
                yardimciSelect.appendChild(option);
            });
        }
    },

    /**
     * Event listener'ları ayarla
     */
    setupEventListeners: function() {
        // Vardiya formu
        const form = document.getElementById('vardiya-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveVardiya();
            });
        }

        // Tarih değiştir butonu
        const changeDateBtn = document.getElementById('change-date-btn');
        if (changeDateBtn) {
            changeDateBtn.addEventListener('click', () => {
                this.toggleDateInput();
            });
        }

        // Form temizleme butonu
        const resetBtn = document.getElementById('reset-form-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Formu temizlemek istediğinize emin misiniz?')) {
                    this.resetForm();
                }
            });
        }

        // Vardiya tipi değişimi
        const vardiyaTipi = document.getElementById('vardiya-tipi');
        if (vardiyaTipi) {
            vardiyaTipi.addEventListener('change', () => {
                this.updateShiftInfo();
                this.toggleYardimciSection();
            });
        }

        // Yardımcı vardiya seçimi
        const yardimciRadios = document.querySelectorAll('input[name="yardimci"]');
        yardimciRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.toggleYardimciPersonelGroup();
            });
        });

        // Karakter sayacı
        const notlarTextarea = document.getElementById('vardiya-notlar');
        if (notlarTextarea) {
            notlarTextarea.addEventListener('input', () => {
                this.updateCharCount();
            });
        }

        // Şablon ekle butonu
        const addTemplateBtn = document.getElementById('add-template-btn');
        if (addTemplateBtn) {
            addTemplateBtn.addEventListener('click', () => {
                this.addTemplateNote();
            });
        }
    },

    /**
     * Otomatik doldurma ayarları
     */
    setupAutoFill: function() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;
        
        const dateInput = document.getElementById('vardiya-tarih');
        if (dateInput) {
            dateInput.value = todayString;
            dateInput.max = todayString;
        }

        // Mevcut vardiya belirle
        const hour = new Date().getHours();
        let vardiyaTipi = '';
        
        if (hour >= 0 && hour < 8) {
            vardiyaTipi = 'gece';
        } else if (hour >= 8 && hour < 16) {
            vardiyaTipi = 'gunduz';
        } else {
            vardiyaTipi = 'aksam';
        }

        const vardiyaSelect = document.getElementById('vardiya-tipi');
        if (vardiyaSelect) {
            vardiyaSelect.value = vardiyaTipi;
            this.updateShiftInfo();
            this.toggleYardimciSection();
        }
    },

    /**
     * Vardiya bilgisini güncelle
     */
    updateShiftInfo: function() {
        const vardiyaTipi = document.getElementById('vardiya-tipi').value;
        const shiftHoursEl = document.getElementById('shift-hours');
        
        const shiftTimes = {
            'gece': '00:00 - 08:00',
            'gunduz': '08:00 - 16:00',
            'aksam': '16:00 - 24:00'
        };

        if (shiftHoursEl) {
            shiftHoursEl.textContent = shiftTimes[vardiyaTipi] || '';
        }
    },

    /**
     * Yardımcı vardiya bölümünü göster/gizle
     */
    toggleYardimciSection: function() {
        const vardiyaTipi = document.getElementById('vardiya-tipi').value;
        const yardimciSection = document.getElementById('yardimci-section');
        
        if (yardimciSection) {
            if (vardiyaTipi === 'gunduz') {
                yardimciSection.style.display = 'block';
            } else {
                yardimciSection.style.display = 'none';
                // Gündüz değilse yardımcı seçimini sıfırla
                const yardimciYok = document.getElementById('yardimci-yok');
                if (yardimciYok) {
                    yardimciYok.checked = true;
                }
                this.toggleYardimciPersonelGroup();
            }
        }
    },

    /**
     * Yardımcı personel input grubunu göster/gizle
     */
    toggleYardimciPersonelGroup: function() {
        const yardimciVar = document.getElementById('yardimci-var');
        const yardimciPersonelGroup = document.getElementById('yardimci-personel-group');
        
        if (yardimciPersonelGroup) {
            if (yardimciVar && yardimciVar.checked) {
                yardimciPersonelGroup.style.display = 'block';
            } else {
                yardimciPersonelGroup.style.display = 'none';
            }
        }
    },

    /**
     * Tarih input'unu göster/gizle
     */
    toggleDateInput: function() {
        const dateInput = document.getElementById('vardiya-tarih');
        const changeBtn = document.getElementById('change-date-btn');
        
        if (dateInput && changeBtn) {
            if (dateInput.readOnly) {
                dateInput.readOnly = false;
                dateInput.style.background = 'var(--input-bg)';
                changeBtn.textContent = '🔒 Kilitle';
            } else {
                dateInput.readOnly = true;
                dateInput.style.background = 'var(--bg-tertiary)';
                changeBtn.textContent = '✏️ Değiştir';
            }
        }
    },

    /**
     * Karakter sayacını güncelle
     */
    updateCharCount: function() {
        const textarea = document.getElementById('vardiya-notlar');
        const counter = document.getElementById('char-counter');
        
        if (textarea && counter) {
            const count = textarea.value.length;
            counter.textContent = count;
            
            if (count > 500) {
                counter.style.color = 'var(--danger-color)';
            } else if (count > 400) {
                counter.style.color = 'var(--warning-color)';
            } else {
                counter.style.color = 'inherit';
            }
        }
    },

    /**
     * Şablon not ekle
     */
    addTemplateNote: function() {
        const templates = [
            'Vardiya normal şekilde tamamlandı.',
            'Küçük arızalar yaşandı ancak çözüldü.',
            'Bakım çalışmaları yapıldı.',
            'Ekipman kontrolü yapıldı.'
        ];

        const template = templates[Math.floor(Math.random() * templates.length)];
        const textarea = document.getElementById('vardiya-notlar');
        
        if (textarea) {
            const currentText = textarea.value;
            const newText = currentText ? `${currentText}\n\n${template}` : template;
            textarea.value = newText;
            this.updateCharCount();
        }
    },

    /**
     * Formu sıfırla
     */
    resetForm: function() {
        const form = document.getElementById('vardiya-form');
        if (form) {
            form.reset();
            this.setupAutoFill();
            this.updateCharCount();
        }
    },

    /**
     * Vardiya kaydet
     */
    saveVardiya: async function() {
        // ✅ Tarih ve vardiya tipi kontrolü
        const tarihInput = document.getElementById('vardiya-tarih');
        const vardiyaTarih = tarihInput.value.trim();
        const vardiyaTipi = document.getElementById('vardiya-tipi').value.trim();
        const saveBtn = document.getElementById('save-vardiya-btn');
        
        console.log('📅 Form değerleri:', { 
            tarihInput: vardiyaTarih, 
            vardiyaTipi: vardiyaTipi,
            tarihElement: tarihInput.value,
            tarihReadOnly: tarihInput.readOnly
        }); // Debug
        
        // Kullanıcının girdiği tarihi kullan (değiştirse bile)
        const finalTarih = tarihInput.value.trim();
        
        // Tarihi ISO formatına çevir (API için)
        const tarihForAPI = this.convertToISOFormat(finalTarih);
        
        if (!finalTarih) {
            Utils.showToast('Lütfen tarih seçin', 'error');
            return;
        }
        
        if (!vardiyaTipi) {
            Utils.showToast('Lütfen vardiya tipi seçin', 'error');
            return;
        }
        
        console.log('📅 Kullanılacak tarih:', { gosterim: finalTarih, api: tarihForAPI }); // Debug
        
        // Butonu devre dışı bırak
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.querySelector('.btn-text').textContent = 'Kaydediliyor...';
        }
        
        // Aynı tarih ve vardiya tipinde kayıt var mı kontrol et
        const storageKey = `vardiya-${finalTarih}-${vardiyaTipi}`;
        const existingRecord = Utils.loadFromStorage(storageKey);
        if (existingRecord) {
            Utils.showToast(`Bu tarihte (${finalTarih}) ${vardiyaTipi} vardiya kaydı zaten var!`, 'warning');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.querySelector('.btn-text').textContent = 'Vardiyayı Kaydet';
            }
            return;
        }
        
        const formData = {
            id: Date.now().toString(),
            tarih: tarihForAPI,
            vardiya_tipi: document.getElementById('vardiya-tipi').value,
            vardiya_personeli: document.getElementById('vardiya-personeli').value,
            yardimci_personel: document.getElementById('yardimci-personel').value,
            isler: this.getSelectedIsler(),
            notlar: document.getElementById('vardiya-notlar').value,
            kayitZamani: CONFIG.formatDateTime(),
        };
        
        // ✅ Önce Google Sheets'te duplicate kontrolü yap
        console.log('🔍 Google Sheets kontrolü:', { tarih: tarihForAPI, vardiyaTipi: vardiyaTipi }); // Debug
        try {
            const googleSheetsCheck = await this.checkGoogleSheetsDuplicate(tarihForAPI, vardiyaTipi);
            console.log('📊 Google Sheets kontrol sonucu:', googleSheetsCheck); // Debug
            if (googleSheetsCheck.exists) {
                Utils.showToast(`Google Sheets'te bu tarihte (${finalTarih}) ${googleSheetsCheck.vardiyaTipi} kaydı zaten var!`, 'warning');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.querySelector('.btn-text').textContent = 'Vardiyayı Kaydet';
                }
                return;
            }
        } catch (error) {
            console.log('⚠️ Google Sheets kontrolü yapılamadı, işlem iptal ediliyor');
            Utils.showToast('Google Sheets bağlantısı hatası! Kayıt yapılamadı.', 'error');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.querySelector('.btn-text').textContent = 'Vardiyayı Kaydet';
            }
            return;
        }

        // ✅ Ana kayıt: Google Sheets'e gönder
        try {
            const result = await this.sendToGoogleSheets(formData);
            if (result.success) {
                Utils.showToast('Vardiya verileri Google Sheets\'e eklendi', 'success');
                
                // ✅ Yedekleme: LocalStorage'a kaydet
                this.backupToLocalStorage(formData, storageKey);
                
            } else {
                Utils.showToast('Google Sheets\'e eklenemedi: ' + result.error, 'error');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.querySelector('.btn-text').textContent = 'Vardiyayı Kaydet';
                }
                return;
            }
        } catch (error) {
            Utils.showToast('Google Sheets hatası: ' + error.message, 'error');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.querySelector('.btn-text').textContent = 'Vardiyayı Kaydet';
            }
            return;
        }

        // ✅ Başarılı mesajı
        Utils.showToast('Vardiya başarıyla kaydedildi', 'success');

        // Formu temizle
        document.getElementById('vardiya-form').reset();

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.querySelector('.btn-text').textContent = 'Vardiyayı Kaydet';
        }
    },

    /**
     * Google Sheets'e veri gönder
     */
    sendToGoogleSheets: function(record) {
        const url = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.vardiya;
        
        if (!url || url === 'BURAYA_VARDIYA_URL_GELECEK') {
            console.log('❌ Vardiya URL\'si yapılandırılmamış');
            return Promise.resolve({ success: false, error: 'URL yapılandırılmamış' });
        }
        
        const formData = new FormData();
        formData.append('action', 'save');
        formData.append('module', 'vardiya');
        formData.append('timestamp', new Date().toISOString());
        
        // Orijinal kayıt bilgileri ekle
        const recordWithOriginal = {
            ...record,
            originalTimestamp: new Date().toISOString(),
            originalPersonel: record.vardiya_personeli,
            changes: ''
        };
        
        // Verileri ekle
        Object.keys(recordWithOriginal).forEach(key => {
            formData.append(key, recordWithOriginal[key]);
        });
        
        console.log('📤 Vardiya API\'ye gönderiliyor:', recordWithOriginal);
        
        return fetch(url, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('✅ Vardiya API yanıtı:', data);
            return data;
        })
        .catch(error => {
            console.error('❌ Vardiya API hatası:', error);
            return { success: false, error: error.toString() };
        });
    },

    /**
     * Tarihi ISO formatına çevir (YYYY-MM-DD)
     */
    convertToISOFormat: function(tarihStr) {
        if (!tarihStr) return '';
        
        // Türkçe formatları destekle: DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
        const formats = [
            /^(\d{2})\.(\d{2})\.(\d{4})$/,  // DD.MM.YYYY
            /^(\d{2})\/(\d{2})\/(\d{4})$/,  // DD/MM/YYYY
            /^(\d{2})-(\d{2})-(\d{4})$/,  // DD-MM-YYYY
            /^(\d{4})-(\d{2})-(\d{2})$/   // YYYY-MM-DD (zaten doğru)
        ];
        
        for (let format of formats) {
            const match = tarihStr.match(format);
            if (match) {
                if (format === formats[3]) {
                    // Zaten YYYY-MM-DD formatı (dördüncü format)
                    return tarihStr;
                } else {
                    // DD.MM.YYYY veya DD/MM/YYYY formatı → YYYY-MM-DD
                    const year = match[3];
                    const month = match[2];
                    const day = match[1];
                    return `${year}-${month}-${day}`;
                }
            }
        }
        
        return tarihStr; // Hata olursa orijinali geri döndür
    },

    /**
     * LocalStorage'a yedekle
     */
    backupToLocalStorage: function(formData, storageKey) {
        try {
            // Ana vardiya listesine ekle
            const vardiyaData = Utils.loadFromStorage('vardiya_data', []);
            vardiyaData.push(formData);
            Utils.saveToStorage('vardiya_data', vardiyaData);
            
            // Tarih bazlı yedekle (duplicate kontrol için)
            Utils.saveToStorage(storageKey, formData);
            
            console.log('✅ Vardiya LocalStorage\'a yedeklendi:', formData.tarih, formData.vardiya_tipi);
            
        } catch (error) {
            console.error('❌ LocalStorage yedekleme hatası:', error);
        }
    },

    /**
     * Google Sheets'te duplicate kontrolü yap
     */
    checkGoogleSheetsDuplicate: async function(tarih, vardiyaTipi) {
        console.log('🔍 Google Sheets API çağrısı:', { tarih, vardiyaTipi }); // Debug
        const url = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.vardiya;
        
        if (!url || url === 'BURAYA_VARDIYA_URL_GELECEK') {
            console.log('❌ Vardiya URL yok'); // Debug
            return { exists: false };
        }
        
        try {
            const formData = new FormData();
            formData.append('action', 'get');
            formData.append('module', 'vardiya');
            formData.append('timestamp', new Date().toISOString());
            
            // Filtreleri ekle
            const filters = {
                tarih: tarih,
                vardiya_tipi: vardiyaTipi
            };
            console.log('📤 Gönderilen filtreler:', filters); // Debug
            formData.append('filters', JSON.stringify(filters));
            
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            console.log('📥 Google Sheets API yanıtı:', result); // Debug
            
            if (result.success && result.data && result.data.length > 0) {
                // Kayıt var
                const existingRecord = result.data[0];
                console.log('✅ Mevcut kayıt bulundu:', existingRecord); // Debug
                return {
                    exists: true,
                    vardiyaTipi: existingRecord['Vardiya Tipi'],
                    record: existingRecord
                };
            }
            
            console.log('❌ Kayıt bulunamadı'); // Debug
            return { exists: false };
            
        } catch (error) {
            console.error('❌ Google Sheets kontrol hatası:', error);
            return { exists: false };
        }
    },

    /**
     * Seçili işleri al
     */
    getSelectedIsler: function() {
        const isler = [];
        const checkboxes = document.querySelectorAll('.isler-checklist input[type="checkbox"]:checked');
        
        checkboxes.forEach(checkbox => {
            // Sadece text içeriğini al, object değil
            const isText = checkbox.nextElementSibling.textContent.trim();
            isler.push(isText);
        });

        // Array'i string'e çevir (virgülle ayrılmış)
        return isler.join(', ');
    },

    /**
     * Vardiyaları yükle
     */
    loadVardiyalar: function() {
        // Bu fonksiyon ileride vardiya listesi gösterimi için kullanılacak
        // Şimdilik boş bırakıldı
    },

    /**
     * Mevcut vardiya bilgisini güncelle
     */
    updateCurrentVardiya: function() {
        const statusEl = document.getElementById('current-vardiya-status');
        const shiftNameEl = document.getElementById('current-shift-name');
        
        if (statusEl && shiftNameEl) {
            const hour = new Date().getHours();
            let shiftName = '';
            
            if (hour >= 0 && hour < 8) {
                shiftName = 'Gece Vardiyası';
            } else if (hour >= 8 && hour < 16) {
                shiftName = 'Gündüz Vardiyası';
            } else {
                shiftName = 'Akşam Vardiyası';
            }

            shiftNameEl.textContent = shiftName;
        }
    }
};

// Vardiya'yı global olarak erişilebilir yap
window.Vardiya = Vardiya;
