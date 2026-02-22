/**
 * ENERJİ VERİLERİ MODÜLÜ
 * Saatlik ve günlük enerji verisi yönetimi
 */

/**
 * Türkiye saatine göre YYYY-MM-DD formatında tarih döndürür
 */
function getLocalDateYYYYMMDD() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Enerji modülü
 */
const Enerji = {
    // Mevcut seçili veriler
    currentData: {
        date: null,
        shift: null,
        hours: [],
        records: {}
    },
    
    // Vardiya saat tanımları
    SHIFT_HOURS: {
        gece: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00'],
        gunduz: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
        aksam: ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']
    },
    
    // Vardiya başlıkları
    SHIFT_TITLES: {
        gece: 'Gece Vardiyası',
        gunduz: 'Gündüz Vardiyası',
        aksam: 'Akşam Vardiyası'
    },
    
    // Vardiya zaman aralıkları
    SHIFT_TIMES: {
        gece: '00:00 - 08:00',
        gunduz: '08:00 - 16:00',
        aksam: '16:00 - 24:00'
    },
    
    /**
     * Sistemi başlat
     */
    init: function() {
        console.log('🔌 Enerji modülü başlatılıyor...');
        this.setupEventListeners();
        this.setDefaultValues();
        
        // DailyRecords modülünü geciktirerek başlat (aynı sayfada olduğu için)
        setTimeout(() => {
            if (window.DailyRecords) {
                DailyRecords.init();
                console.log('📋 DailyRecords modülü başlatıldı');
            } else {
                console.warn('⚠️ DailyRecords modülü bulunamadı');
            }
        }, 100);
    },
    
    /**
     * Varsayılan değerleri ayarla
     */
    setDefaultValues: function() {
        // Bugünün tarihini Türkiye saatine göre ayarla
        const todayStr = getLocalDateYYYYMMDD(); // UTC sorunu olmasın diye
        
        // Saatlik form için tarih
        const hourlyDateInput = document.getElementById('hourly-date');
        if (hourlyDateInput) {
            hourlyDateInput.value = todayStr;
        }
        
        // Günlük enerji formu için tarih
        const dailyDateInput = document.getElementById('daily-date');
        if (dailyDateInput) {
            dailyDateInput.value = todayStr;
        }
        
        // Varsayılan vardiya ayarla
        const today = new Date(); // today değişkenini tanımla
        const currentHour = today.getHours();
        let defaultShift = 'gece';
        
        if (currentHour >= 8 && currentHour < 16) {
            defaultShift = 'gunduz';
        } else if (currentHour >= 16 && currentHour < 24) {
            defaultShift = 'aksam';
        }
        
        const shiftSelect = document.getElementById('hourly-shift');
        if (shiftSelect) {
            shiftSelect.value = defaultShift;
        }
    },
    
    /**
     * Event listener'ları ayarla
     */
    setupEventListeners: function() {
        // Vardiya yükleme butonu
        document.getElementById('load-shift-btn')?.addEventListener('click', () => {
            this.loadShiftData();
        });
        
        // Tümünü kaydet butonu
        document.getElementById('save-all-btn')?.addEventListener('click', () => {
            this.saveAllRecords();
        });
        
        // Temizle butonu
        document.getElementById('clear-btn')?.addEventListener('click', () => {
            this.clearCurrentShift();
        });
        
        // Hızlı kaydet butonu
        document.getElementById('quick-save-btn')?.addEventListener('click', () => {
            this.saveQuickEntry();
        });
        
        // Günlük enerji formu - Kaydet butonu
        document.getElementById('save-daily-btn')?.addEventListener('click', () => {
            this.saveDailyEnergy();
        });
        
        // Günlük enerji - Tarih değişince kayıtlı veriyi yükle
        document.getElementById('daily-date')?.addEventListener('input', (e) => {
            console.log('Tarih değişti:', e.target.value);
            this.loadDailyEnergyByDate();
        });
        
        // Günlük enerji formu - Temizle butonu
        document.getElementById('reset-daily-form')?.addEventListener('click', () => {
            this.resetDailyEnergyForm();
        });
        
        // Sayfa değişiklikleri main.js tarafından yönetiliyor
        // this.setupPageObserver(); // Gereksiz çağrı kaldırıldı
    },
    
    /**
     * Seçilen vardiyayı yükle
     */
    loadShiftData: function() {
        const date = document.getElementById('hourly-date').value;
        const shift = document.getElementById('hourly-shift').value;
        
        if (!date || !shift) {
            Utils.showToast('Lütfen tarih ve vardiya seçin', 'error');
            return;
        }
        
        // Mevcut verileri güncelle
        this.currentData = {
            date: date,
            shift: shift,
            hours: this.SHIFT_HOURS[shift],
            records: {}
        };
        
        // Tabloyu güncelle
        this.updateTable();
        
        // Başlıkları güncelle
        this.updateHeaders();
        
        // Kayıtları yükle (localStorage veya API'den)
        this.loadSavedRecords();
        
        // Toplamları hesapla
        this.calculateTotals();
        
        // Hızlı giriş dropdown'unu güncelle
        this.updateQuickEntryDropdown();
        
        // Tümünü kaydet butonunu göster
        document.getElementById('save-all-btn').style.display = 'inline-flex';
        
        Utils.showToast(`${this.SHIFT_TITLES[shift]} verileri yüklendi`, 'success');
    },
    
    /**
     * Tabloyu güncelle
     */
    updateTable: function() {
        const tbody = document.getElementById('hourly-table-body');
        
        if (!this.currentData.hours || this.currentData.hours.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="4">
                        <div class="empty-state">
                            <span class="empty-icon">⚠️</span>
                            <p>Bu vardiya için saat verisi bulunamadı</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        let tableHTML = '';
        
        this.currentData.hours.forEach(hour => {
            const record = this.currentData.records[hour] || {};
            
            tableHTML += `
                <tr data-hour="${hour}" data-date="${this.currentData.date}" 
                    data-shift="${this.currentData.shift}">
                    <td>
                        <strong>${hour}</strong>
                    </td>
                    <td>
                        <input type="number" class="aktif-input" 
                               value="${record.aktif || ''}" 
                               data-field="aktif"
                               data-hour="${hour}"
                               min="0" step="0.001" 
                               placeholder="0.000"
                               onchange="Enerji.onInputChange(event)">
                    </td>
                    <td>
                        <input type="number" class="reaktif-input" 
                               value="${record.reaktif || ''}" 
                               data-field="reaktif"
                               data-hour="${hour}"
                               min="0" step="0.001" 
                               placeholder="0.000"
                               onchange="Enerji.onInputChange(event)">
                    </td>
                    <td>
                        <span class="status-badge ${this.getStatusClass(record)}" 
                              id="status-${hour.replace(':', '')}">
                            ${this.getStatusText(record)}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button type="button" class="btn-small btn-save" 
                                    onclick="Enerji.saveSingleRecord('${hour}')">
                                💾
                            </button>
                            <button type="button" class="btn-small btn-delete" 
                                    onclick="Enerji.deleteRecord('${hour}')">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = tableHTML;
    },
    
    /**
     * Türkçe tarih formatı (güvenli versiyon)
     */
    formatTurkishDate: function(dateString) {
        if (!dateString) return '';
        
        // Güvenli Date objesi oluştur (UTC sorunu olmasın diye)
        let date;
        if (dateString.includes('-')) {
            const [y, m, d] = dateString.split('-');
            date = new Date(y, m-1, d); // Local timezone
        } else {
            date = new Date(dateString);
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}.${month}.${year}`;
    },
    
    /**
     * Başlıkları güncelle
     */
    updateHeaders: function() {
        // Tarihi Türkçe formatına çevir
        const formattedDate = this.formatTurkishDate(this.currentData.date);
        
        document.getElementById('shift-title').textContent = 
            `${this.SHIFT_TITLES[this.currentData.shift]} - ${formattedDate}`;
        
        document.getElementById('shift-time').textContent = 
            this.SHIFT_TIMES[this.currentData.shift];
    },
    
    /**
     * Kayıtlı verileri yükle
     */
    loadSavedRecords: function() {
        // ✅ Önce Google Sheets'ten verileri çek
        this.loadGoogleSheetsRecords();
        
        // Sonra LocalStorage'dan yükle
        const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
        const savedData = Utils.loadFromStorage(storageKey, {});
        
        this.currentData.records = savedData;
        
        // Kayıt sayısını güncelle
        const savedCount = Object.keys(savedData).length;
        const totalCount = this.currentData.hours.length;
        document.getElementById('record-count').textContent = 
            `${savedCount}/${totalCount} kayıt`;
        
        // Input değerlerini güncelle
        this.currentData.hours.forEach(hour => {
            const record = savedData[hour];
            if (record) {
                const aktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aktif"]`);
                const reaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="reaktif"]`);
                
                if (aktifInput) aktifInput.value = record.aktif || '';
                if (reaktifInput) reaktifInput.value = record.reaktif || '';
                
                // Durumu güncelle
                this.updateStatus(hour, record);
            }
        });
    },
    
    /**
     * Google Sheets kayıtlarını yükle
     */
    loadGoogleSheetsRecords: async function() {
        try {
            const url = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.saatlik;
            if (!url || url === 'BURAYA_YENI_URL_GELECEK') {
                console.log('❌ Saatlik enerji URL\'si yapılandırılmamış');
                return;
            }
            
            // Tarih ve vardiya filtresi ile verileri çek
            const formData = new FormData();
            formData.append('action', 'get');
            formData.append('module', 'saatlik');
            formData.append('date', this.currentData.date);
            formData.append('shift', this.currentData.shift);
            
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.data) {
                    this.processGoogleSheetsRecords(result.data);
                } else {
                    console.log('❌ Google Sheets verisi alınamadı:', result.error);
                    Utils.showToast('Google Sheets verileri alınamadı: ' + result.error, 'error');
                }
            } else {
                console.log('❌ Google Sheets API hatası:', response.status);
                Utils.showToast('Google Sheets API hatası: ' + response.status, 'error');
            }
        } catch (error) {
            console.log('💥 Google Sheets genel hata:', error);
            Utils.showToast('Google Sheets bağlantı hatası: ' + error.message, 'error');
        }
    },
    
    /**
     * Google Sheets kayıtlarını işle
     */
    processGoogleSheetsRecords: function(records) {
        const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
        let savedData = Utils.loadFromStorage(storageKey, {});
        
        records.forEach(record => {
            // Tarih ve vardiya eşleşmesi kontrolü
            if (record.Tarih === this.currentData.date && record.Vardiya === this.currentData.shift) {
                // ✅ Saat formatını düzelt - Excel tarih formatından HH:mm formatına çevir
                let hour = record.Saat;
                
                if (hour && hour.includes('T')) {
                    // Excel tarih formatı: 1899-12-30T06:03:04.000Z
                    try {
                        const date = new Date(hour);
                        hour = date.toTimeString().slice(0, 5); // "06:03"
                    } catch (error) {
                        hour = '00:00'; // Varsayılan değer
                    }
                }
                
                // Google Sheets verisini frontend formatına çevir
                const frontendRecord = {
                    id: record.ID,
                    aktif: parseFloat(record['Aktif Enerji (MWh)']) || 0,
                    reaktif: parseFloat(record['Reaktif Enerji (kVArh)']) || 0,
                    aydemAktif: parseFloat(record['Aydem Aktif']) || 0,
                    aydemReaktif: parseFloat(record['Aydem Reaktif']) || 0,
                    // ✅ Önce frontend timestamp, yoksa update zamanı, o da yoksa şimdi
                    timestamp: record.timestamp || record.updatedAt || new Date().toISOString(),
                    updatedAt: record['Güncelleme Zamanı'],
                    editedBy: record['Güncelleyen'],
                    originalTimestamp: record['Orijinal Kayıt Zamanı'],
                    originalOperator: record['Orijinal Operator'],
                    changes: record['Değiştirilen Değerler'],
                    operator: record.Operator
                };
                
                // LocalStorage'a kaydet
                savedData[hour] = frontendRecord;
                this.currentData.records[hour] = frontendRecord;
                
                // ✅ Input değerlerini güncelle
                const aktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aktif"]`);
                const reaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="reaktif"]`);
                
                if (aktifInput) aktifInput.value = frontendRecord.aktif || '';
                if (reaktifInput) reaktifInput.value = frontendRecord.reaktif || '';
                
                // Durumu güncelle
                this.updateStatus(hour, frontendRecord);
            }
        });
        
        // LocalStorage'a kaydet
        Utils.saveToStorage(storageKey, savedData);
        
        // Kayıt sayısını güncelle
        const savedCount = Object.keys(this.currentData.records).length;
        const totalCount = this.currentData.hours.length;
        document.getElementById('record-count').textContent = 
            `${savedCount}/${totalCount} kayıt`;
        
        // Toplamları güncelle
        this.calculateTotals();
        
        Utils.showToast(`Google Sheets'ten ${records.length} kayıt yüklendi`, 'success');
    },
    
    /**
     * Tek kayıt kaydet - GÜNCELLENMİŞ VERSİYON
     */
    saveSingleRecord: async function (hour) {
        try {
            const aktifInput = document.querySelector(
                `[data-hour="${hour}"][data-field="aktif"]` 
            );
            const reaktifInput = document.querySelector(
                `[data-hour="${hour}"][data-field="reaktif"]` 
            );

            const aktif = parseFloat(aktifInput?.value) || 0;
            const reaktif = parseFloat(reaktifInput?.value) || 0;

            if (aktif <= 0 && reaktif <= 0) {
                return { skipped: true };
            }

            // 🔐 TEK KAYNAK: LocalStorage
            const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
            const savedData = Utils.loadFromStorage(storageKey, {});
            const existingRecord = savedData[hour];

            let record;
            let action;

            // 🔁 UPDATE
            if (existingRecord && existingRecord.timestamp) {
                const hasChanges =
                    existingRecord.aktif !== aktif ||
                    existingRecord.reaktif !== reaktif;

                if (!hasChanges) {
                    return { skipped: true };
                }

                record = {
                    ...existingRecord,
                    aktif,
                    reaktif,
                    updatedAt: new Date().toISOString(),
                    editedBy: Auth.getCurrentUser()?.username || 'unknown'
                };

                action = 'update';
            }
            // ➕ YENİ KAYIT
            else {
                record = {
                    id: Date.now().toString(),
                    aktif,
                    reaktif,
                    timestamp: new Date().toISOString(),
                    date: this.currentData.date,
                    shift: this.currentData.shift,
                    hour,
                    operator: Auth.getCurrentUser()?.username || 'unknown'
                };

                action = 'save';
            }

            // 💾 LocalStorage
            savedData[hour] = record;
            Utils.saveToStorage(storageKey, savedData);

            // 🧠 Frontend state
            this.currentData.records[hour] = record;

            // 📤 API - await ile bekle (sıralı gönderim için)
            const apiResult = await this.sendToAPI(record, action);

            // 🟢 UI
            const statusEl = document.getElementById(`status-${hour.replace(':', '')}`);
            if (statusEl) {
                statusEl.className = 'status-badge status-saved';
                statusEl.textContent = 'Kaydedildi';
            }

            Utils.showToast(`${hour} saat verisi kaydedildi`, 'success');

            return { success: true, action, apiResult };

        } catch (err) {
            console.error('saveSingleRecord error:', err);
            Utils.showToast(`${hour} kaydı sırasında hata oluştu`, 'error');
            return { error: true };
        }
    },

    /**
     * Tüm kayıtları kaydet - SIRALI GÖNDERİM
     */
    saveAllRecords: async function() {
        const results = [];
        const unsavedHours = [];
        
        // ✅ for...of kullan - continue destekler
        for (const hour of this.currentData.hours) {
            const aktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aktif"]`);
            const reaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="reaktif"]`);
            
            if (!aktifInput || !reaktifInput) {
                console.warn(`⚠️ Input bulunamadı: ${hour}`);
                continue;
            }
            
            const aktif = parseFloat(aktifInput.value) || 0;
            const reaktif = parseFloat(reaktifInput.value) || 0;
            
            // Değer yoksa atla
            if (aktif === 0 && reaktif === 0) {
                continue;
            }
            
            unsavedHours.push(hour);
            
            // ✅ TEK KAYNAK: saveSingleRecord kullan (await ile)
            const result = await this.saveSingleRecord(hour);
            results.push({ hour, ...result });
            
            // ✅ API lock çakışmasını önlemek için ekstra 300ms bekle
            if (result.success) {
                console.log(`⏳ ${hour} tamamlandı, sonrakine geçiliyor...`);
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        // Toplamları güncelle
        this.calculateTotals();
        
        // Sonuçları raporla
        const savedCount = results.filter(r => r.success).length;
        const skippedCount = results.filter(r => r.skipped).length;
        const errorCount = results.filter(r => r.error).length;
        
        console.log('📊 saveAllRecords özeti:', {
            toplam: results.length,
            kaydedilen: savedCount,
            atlanan: skippedCount,
            hatali: errorCount
        });
        
        if (unsavedHours.length === 0) {
            Utils.showToast('Kaydedilecek yeni veri bulunamadı', 'info');
        } else {
            Utils.showToast(`${savedCount} kayıt kaydedildi, ${skippedCount} atlandı`, 'success');
        }
    },
        
    /**
     * Hızlı giriş kaydet
     */
    saveQuickEntry: function() {
        const hour = document.getElementById('quick-hour').value;
        const aktif = parseFloat(document.getElementById('quick-aktif').value) || 0;
        const reaktif = parseFloat(document.getElementById('quick-reaktif').value) || 0;
        
        if (!hour) {
            Utils.showToast('Lütfen saat seçin', 'error');
            return;
        }
        
        if (aktif === 0 && reaktif === 0) {
            Utils.showToast('Lütfen en az bir değer girin', 'warning');
            return;
        }
        
        // Input değerlerini güncelle
        const aktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aktif"]`);
        const reaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="reaktif"]`);
        
        if (aktifInput) aktifInput.value = aktif;
        if (reaktifInput) reaktifInput.value = reaktif;
        
        // Kaydet
        this.saveSingleRecord(hour);
        
        // Hızlı giriş formunu temizle
        document.getElementById('quick-hour').value = '';
        document.getElementById('quick-aktif').value = '';
        document.getElementById('quick-reaktif').value = '';
    },
        
    /**
     * Kayıt sil
     */
    deleteRecord: function(hour) {
        if (!confirm(`${hour} saatine ait veriyi silmek istediğinize emin misiniz?`)) {
            return;
        }
        
        const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
        let savedData = Utils.loadFromStorage(storageKey, {});
        
        delete savedData[hour];
        Utils.saveToStorage(storageKey, savedData);
        
        // Mevcut verilerden sil
        delete this.currentData.records[hour];
        
        // Input'ları temizle
        const aktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aktif"]`);
        const reaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="reaktif"]`);
        
        if (aktifInput) aktifInput.value = '';
        if (reaktifInput) reaktifInput.value = '';
        
        // Durumu güncelle
        this.updateStatus(hour, {});
        
        // Toplamları güncelle
        this.calculateTotals();
        
        Utils.showToast(`${hour} saat verisi silindi`, 'success');
    },
        
    /**
     * Input değişikliğini işle
     */
    onInputChange: function(event) {
        const input = event.target;
        const hour = input.dataset.hour;
        
        // Durumu "kaydedilmedi" olarak güncelle
        const statusEl = document.getElementById(`status-${hour.replace(':', '')}`);
        if (statusEl) {
            statusEl.className = 'status-badge status-unsaved';
            statusEl.textContent = 'Kaydedilmedi';
        }
    },
    
    /**
     * Durum class'ını belirle
     */
    getStatusClass: function(record) {
        if (!record || (!record.aktif && !record.reaktif)) {
            return 'status-empty';
        } else if (record.timestamp) {
            return 'status-saved';
        } else {
            return 'status-unsaved';
        }
    },
    
    /**
     * Durum text'ini belirle
     */
    getStatusText: function(record) {
        if (!record || (!record.aktif && !record.reaktif)) {
            return 'Boş';
        } else if (record.timestamp) {
            const time = new Date(record.timestamp).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            return `${time}'de kaydedildi`;
        } else {
            return 'Kaydedilmedi';
        }
    },
    
    /**
     * Durumu güncelle
     */
    updateStatus: function(hour, record) {
        const statusEl = document.getElementById(`status-${hour.replace(':', '')}`);
        if (statusEl) {
            statusEl.className = `status-badge ${this.getStatusClass(record)}`;
            statusEl.textContent = this.getStatusText(record);
        }
        
        // Kayıt sayısını güncelle
        const savedCount = Object.keys(this.currentData.records).length;
        const totalCount = this.currentData.hours.length;
        document.getElementById('record-count').textContent = 
            `${savedCount}/${totalCount} kayıt`;
    },
    
    /**
     * Toplamları hesapla
     */
    calculateTotals: function() {
        let shiftAktifTotal = 0;
        let shiftReaktifTotal = 0;
        
        Object.values(this.currentData.records).forEach(record => {
            shiftAktifTotal += record.aktif || 0;
            shiftReaktifTotal += record.reaktif || 0;
        });
        
        // Vardiya toplamlarını göster
        document.getElementById('shift-aktif-total').textContent = 
            `${shiftAktifTotal.toFixed(3)} MWh`;
        document.getElementById('shift-reaktif-total').textContent = 
            `${shiftReaktifTotal.toFixed(3)} kVArh`;
        
        // Günlük toplamı hesapla (tüm vardiyalar)
        this.calculateDailyTotal();
    },
    
    /**
     * Günlük toplamı hesapla
     */
    calculateDailyTotal: function() {
        const date = this.currentData.date;
        let dailyAktifTotal = 0;
        
        // Tüm vardiyaları kontrol et
        Object.keys(this.SHIFT_HOURS).forEach(shift => {
            const storageKey = `hourly_${date}_${shift}`;
            const shiftData = Utils.loadFromStorage(storageKey, {});
            
            Object.values(shiftData).forEach(record => {
                dailyAktifTotal += record.aktif || 0;
            });
        });
        
        document.getElementById('daily-aktif-total').textContent = 
            `${dailyAktifTotal.toFixed(3)} MWh`;
    },
    
    /**
     * Hızlı giriş dropdown'unu güncelle
     */
    updateQuickEntryDropdown: function() {
        const dropdown = document.getElementById('quick-hour');
        dropdown.innerHTML = '<option value="">Saat seçin</option>';
        
        this.currentData.hours.forEach(hour => {
            const record = this.currentData.records[hour];
            const isSaved = record && (record.aktif > 0 || record.reaktif > 0);
            
            dropdown.innerHTML += `
                <option value="${hour}" ${isSaved ? 'disabled' : ''}>
                    ${hour} ${isSaved ? '(Kayıtlı)' : ''}
                </option>
            `;
        });
    },
    
    /**
     * Mevcut vardiyayı temizle
     */
    clearCurrentShift: function() {
        if (!confirm('Bu vardiyadaki tüm verileri temizlemek istediğinize emin misiniz?')) {
            return;
        }
        
        this.currentData.records = {};
        this.updateTable();
        this.calculateTotals();
        
        Utils.showToast('Vardiya verileri temizlendi', 'success');
    },
    
    /**
     * API'ye veri gönder - Promise döndürür
     */
    sendToAPI: function(record, action = 'save') {
        const url = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.saatlik;
        
        if (!url || url === 'BURAYA_YENI_URL_GELECEK') {
            console.log('❌ Saatlik enerji URL\'si yapılandırılmamış');
            return Promise.resolve({ skipped: true, reason: 'no_url' });
        }
        
        console.log('📤 API\'ye gönderiliyor:', {
            action: action,
            id: record.id,
            hour: record.hour,
            aktif: record.aktif,
            reaktif: record.reaktif,
            url: url
        });
        
        const formData = new FormData();
        formData.append('action', action);
        formData.append('module', 'saatlik');
        formData.append('timestamp', new Date().toISOString());
        
        // Verileri ekle
        Object.keys(record).forEach(key => {
            formData.append(key, record[key]);
        });
        
        // ✅ Promise döndür - böylece await edebiliriz
        return fetch(url, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const actionText = action === 'update' ? 'güncellendi' : 'kaydedildi';
                console.log(`✅ Saatlik enerji verisi API'ye ${actionText}:`, data);
                Utils.showToast(`Veri Google Sheets'e ${actionText}`, 'success');
                return { success: true, data };
            } else {
                console.error('❌ API hatası:', data.error);
                Utils.showToast('Google Sheets hatası: ' + data.error, 'error');
                return { error: true, message: data.error };
            }
        })
        .catch(error => {
            console.error('💥 API gönderim hatası:', error);
            Utils.showToast('İnternet bağlantısı hatası: ' + error.message, 'error');
            return { error: true, message: error.message };
        });
    },
    
/**
     * Seçili tarihteki kayıtlı veriyi forma yükle
     */
    loadDailyEnergyByDate: function() {
        const dateInput = document.getElementById('daily-date');
        if (!dateInput || !dateInput.value) {
            console.log('❌ Tarih input bulunamadı veya boş');
            return;
        }
        
        const date = dateInput.value;
        console.log('📅 Seçilen tarih:', date);
        
        // LocalStorage devre dışı, Google Sheets'ten veri çek
        console.warn('LocalStorage devre dışı, Google Sheets kontrolü backend\'te');
        
        // Google Sheets'ten tarihe göre veri çek
        if (window.DailyEnergyAPI) {
            DailyEnergyAPI.getDailyEnergy(date)
                .then(record => {
                    if (record && record.success) {
                        console.log('✅ Google Sheets\'ten kayıt bulundu!');
                        console.log('   Yağ Seviyesi:', record.yagSeviyesi);
                        console.log('   Kuplaj:', record.kuplaj);
                        console.log('   GM-1:', record.gm1);
                        
                        // Input değerlerini güncelle
                        const yagInput = document.getElementById('yag-seviyesi');
                        const kuplajInput = document.getElementById('kuplaj');
                        const gm1Input = document.getElementById('gm-1');
                        const gm2Input = document.getElementById('gm-2');
                        const gm3Input = document.getElementById('gm-3');
                        const icIhtiyacInput = document.getElementById('ic-ihtiyac');
                        const redresor1Input = document.getElementById('redresor-1');
                        const redresor2Input = document.getElementById('redresor-2');
                        const kojenIcInput = document.getElementById('kojen-ic-ihtiyac');
                        const servisTrafoInput = document.getElementById('servis-trafosi');
                        
                        if (yagInput) yagInput.value = record.yagSeviyesi || '';
                        if (kuplajInput) kuplajInput.value = record.kuplaj || '';
                        if (gm1Input) gm1Input.value = record.gm1 || '';
                        if (gm2Input) gm2Input.value = record.gm2 || '';
                        if (gm3Input) gm3Input.value = record.gm3 || '';
                        if (icIhtiyacInput) icIhtiyacInput.value = record.icIhtiyac || '';
                        if (redresor1Input) redresor1Input.value = record.redresor1 || '';
                        if (redresor2Input) redresor2Input.value = record.redresor2 || '';
                        if (kojenIcInput) kojenIcInput.value = record.kojenIcIhtiyac || '';
                        if (servisTrafoInput) servisTrafoInput.value = record.servisTrafo || '';
                        
                        Utils.showToast('Kayıt Google Sheets\'ten yüklendi', 'success');
                    } else {
                        console.warn('⚠️ Google Sheets\'te kayıt bulunamadı');
                        Utils.showToast('Bu tarihte kayıt bulunamadı', 'warning');
                    }
                })
                .catch(error => {
                    console.error('❌ Google Sheets hatası:', error);
                    Utils.showToast('Kayıt yüklenemedi: ' + error.message, 'error');
                });
        } else {
            console.warn('⚠️ DailyEnergyAPI modülü bulunamadı');
            Utils.showToast('API modülü bulunamadı', 'error');
        }
    },

    /**
     * Günlük enerji verilerini kaydet
     */
    saveDailyEnergy: function() {
        const saveBtn = document.getElementById('save-daily-btn');
        if (saveBtn.disabled) return;
        
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>⏳</span><span>Kaydediliyor...</span>';
        
        const date = document.getElementById('daily-date').value;
        
        if (!date) {
            Utils.showToast('Lütfen tarih seçin', 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<span>💾</span><span>Kaydet</span>';
            return;
        }
        
        // Tarih kontrolü sadece Google Sheets tarafında yapılacak
        // LocalStorage kontrolü kaldırıldı
        
        const formData = {
            action: 'upsert', // Backend'e hangi işlem yapılacağını bildir
            date: date,
            yagSeviyesi: document.getElementById('yag-seviyesi').value || 0,
            kuplaj: document.getElementById('kuplaj').value || 0,
            gm1: document.getElementById('gm-1').value || 0,
            gm2: document.getElementById('gm-2').value || 0,
            gm3: document.getElementById('gm-3').value || 0,
            icIhtiyac: document.getElementById('ic-ihtiyac').value || 0,
            redresor1: document.getElementById('redresor-1').value || 0,
            redresor2: document.getElementById('redresor-2').value || 0,
            kojenIcIhtiyac: document.getElementById('kojen-ic-ihtiyac').value || 0,
            servisTrafo: document.getElementById('servis-trafosi').value || 0,
            timestamp: new Date().toISOString(), // TEK timestamp
            kaydeden: Utils.getCurrentUser() || 'Bilinmeyen'
        };
        
        // LocalStorage kaydetme kaldırıldı - sadece Google Sheets kullanılacak
        // Utils.saveToStorage(storageKey, formData);
        
        // Google Sheets tarafında kontrol edilip güncellenecek veya yeni kayıt yapılacak
        this.sendDailyEnergyToAPI(formData)
            .then((response) => {
                // Google Apps Script'ten gelen mesajı kullan
                const message = response?.message || 'Günlük enerji verileri başarıyla kaydedildi';
                Utils.showToast(message, 'success');
            })
            .catch(() => {
                Utils.showToast('İşlem başarısız', 'error');
            })
            .finally(() => {
                setTimeout(() => {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<span>💾</span><span>Kaydet</span>';
                }, 2000);
            });
        
        // Formu temizleme - kullanıcı tekrar kaydetmek isteyebilir
        // setTimeout(() => this.resetDailyEnergyForm(), 1500);
    },

    /**
     * Günlük enerji formunu temizle
     */
    resetDailyEnergyForm: function() {
        const form = document.getElementById('daily-energy-form');
        if (form) {
            form.reset();
            // Tarih alanını bugüne Türkiye saatine göre ayarla
            const today = getLocalDateYYYYMMDD();
            document.getElementById('daily-date').value = today;
        }
    },
    
    /**
     * Günlük enerji verilerini Google Sheets API'e gönder
     */
    sendDailyEnergyToAPI: function(data) {
        // DailyEnergyAPI modülünü kullan
        if (window.DailyEnergyAPI) {
            return DailyEnergyAPI.saveDailyEnergy(data)
                .then(result => {
                    Utils.showToast('Veri Google Sheets\'e kaydedildi', 'success');
                    return result;
                })
                .catch(error => {
                    console.error('❌ Google Sheets hatası:', error);
                    Utils.showToast('Google Sheets hatası: ' + error.message, 'error');
                    return { error: true, message: error.message };
                });
        }
        
        // Fallback - eski metod
        console.log('⚠️ DailyEnergyAPI modülü bulunamadı, veri sadece local\'e kaydedildi');
        return Promise.resolve({ skipped: true, reason: 'no_api_module' });
    }
};

// Global erişim
window.Enerji = Enerji;
