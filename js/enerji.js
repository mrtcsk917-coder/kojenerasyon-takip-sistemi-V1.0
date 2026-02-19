/**
 * ENERJİ VERİLERİ MODÜLÜ
 * Saatlik ve günlük enerji verisi yönetimi
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
        this.setupEventListeners();
        this.setDefaultValues();
    },
    
    /**
     * Varsayılan değerleri ayarla
     */
    setDefaultValues: function() {
        // Bugünün tarihini HTML date input formatında ayarla
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;
        document.getElementById('hourly-date').value = todayString;
        
        // Mevcut saate göre vardiyayı otomatik seç
        this.setCurrentShift();
    },
    
    /**
     * Mevcut saate göre vardiyayı ayarla
     */
    setCurrentShift: function() {
        const now = new Date();
        const hour = now.getHours();
        
        let shift = 'gece';
        if (hour >= 8 && hour < 16) {
            shift = 'gunduz';
        } else if (hour >= 16) {
            shift = 'aksam';
        }
        
        document.getElementById('hourly-shift').value = shift;
    },
    
    /**
     * Event listener'ları ayarla
     */
    setupEventListeners: function() {
        // Vardiya yükleme butonu
        document.getElementById('load-shift-btn').addEventListener('click', () => {
            this.loadShiftData();
        });
        
        // Tümünü kaydet butonu
        document.getElementById('save-all-btn').addEventListener('click', () => {
            this.saveAllRecords();
        });
        
        // Temizle butonu
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearCurrentShift();
        });
        
        // Hızlı kaydet butonu
        document.getElementById('quick-save-btn').addEventListener('click', () => {
            this.saveQuickEntry();
        });
        
        // Sayfa değişikliklerini izle
        this.setupPageObserver();
    },
    
    /**
     * Sayfa değişikliklerini izle
     */
    setupPageObserver: function() {
        // Bu fonksiyon main.js tarafından yönetiliyor
        // Çakışmayı önlemek için burası boş bırakıldı
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
     * Türkçe tarih formatı
     */
    formatTurkishDate: function(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
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
                const aydemAktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aydemAktif"]`);
                const aydemReaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aydemReaktif"]`);
                
                if (aktifInput) aktifInput.value = record.aktif || '';
                if (reaktifInput) reaktifInput.value = record.reaktif || '';
                if (aydemAktifInput) aydemAktifInput.value = record.aydemAktif || '';
                if (aydemReaktifInput) aydemReaktifInput.value = record.aydemReaktif || '';
                
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
                }
            }
        } catch (error) {
            console.log('Google Sheets kayıtları yüklenemedi:', error);
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
                const hour = record.Saat;
                
                // Google Sheets verisini frontend formatına çevir
                const frontendRecord = {
                    id: record.ID,
                    aktif: parseFloat(record['Aktif Enerji (MWh)']) || 0,
                    reaktif: parseFloat(record['Reaktif Enerji (kVArh)']) || 0,
                    aydemAktif: parseFloat(record['Aydem Aktif']) || 0,
                    aydemReaktif: parseFloat(record['Aydem Reaktif']) || 0,
                    timestamp: record['Kayıt Zamanı'],
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
                
                // Input değerlerini güncelle
                const aktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aktif"]`);
                const reaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="reaktif"]`);
                const aydemAktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aydemAktif"]`);
                const aydemReaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aydemReaktif"]`);
                
                if (aktifInput) aktifInput.value = frontendRecord.aktif || '';
                if (reaktifInput) reaktifInput.value = frontendRecord.reaktif || '';
                if (aydemAktifInput) aydemAktifInput.value = frontendRecord.aydemAktif || '';
                if (aydemReaktifInput) aydemReaktifInput.value = frontendRecord.aydemReaktif || '';
                
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
     * Tek kayıt kaydet
     */
    saveSingleRecord: function(hour) {
        const aktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aktif"]`);
        const reaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="reaktif"]`);
        const aydemAktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aydemAktif"]`);
        const aydemReaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aydemReaktif"]`);
        
        const aktif = parseFloat(aktifInput.value) || 0;
        const reaktif = parseFloat(reaktifInput.value) || 0;
        const aydemAktif = parseFloat(aydemAktifInput.value) || 0;
        const aydemReaktif = parseFloat(aydemReaktifInput.value) || 0;
        
        if (aktif === 0 && reaktif === 0 && aydemAktif === 0 && aydemReaktif === 0) {
            Utils.showToast('Lütfen en az bir değer girin', 'warning');
            return;
        }
        
        // Önceden kayıt var mı kontrol et
        const existingRecord = this.currentData.records[hour];
        if (existingRecord && existingRecord.timestamp) {
            // ✅ Update öncesi ID kontrolü - eski kayıtlar için uyumluluk
            if (!existingRecord.id) {
                existingRecord.id = Date.now().toString();
                // LocalStorage'a ID'yi güncelle
                const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
                let savedData = Utils.loadFromStorage(storageKey, {});
                savedData[hour] = existingRecord;
                Utils.saveToStorage(storageKey, savedData);
            }
            
            // Düzeltme modu sor
            const confirmMessage = `${hour} için zaten kayıt mevcut:\n` +
                `Aktif: ${existingRecord.aktif || 0}, Reaktif: ${existingRecord.reaktif || 0}\n` +
                `Aydem Aktif: ${existingRecord.aydemAktif || 0}, Aydem Reaktif: ${existingRecord.aydemReaktif || 0}\n` +
                `Kaydeden: ${existingRecord.operator}\n` +
                `Kayıt zamanı: ${new Date(existingRecord.timestamp).toLocaleString('tr-TR')}\n\n` +
                `Bu kaydı güncellemek istiyor musunuz?`;
            
            if (!confirm(confirmMessage)) {
                Utils.showToast('Kayıt güncelleme iptal edildi', 'info');
                return;
            }
            
            // Düzeltme modu - logla
            const changes = [];
            if (existingRecord.aktif !== aktif) {
                changes.push(`Aktif: ${existingRecord.aktif || 0} → ${aktif}`);
            }
            if (existingRecord.reaktif !== reaktif) {
                changes.push(`Reaktif: ${existingRecord.reaktif || 0} → ${reaktif}`);
            }
            if (existingRecord.aydemAktif !== aydemAktif) {
                changes.push(`Aydem Aktif: ${existingRecord.aydemAktif || 0} → ${aydemAktif}`);
            }
            if (existingRecord.aydemReaktif !== aydemReaktif) {
                changes.push(`Aydem Reaktif: ${existingRecord.aydemReaktif || 0} → ${aydemReaktif}`);
            }
            
            const updatedRecord = {
                ...existingRecord,
                aktif: aktif,
                reaktif: reaktif,
                aydemAktif: aydemAktif,
                aydemReaktif: aydemReaktif,
                updatedAt: new Date().toISOString(),
                editedBy: Auth.getCurrentUser()?.username || 'unknown',
                originalTimestamp: existingRecord.timestamp,
                originalOperator: existingRecord.operator,
                changes: changes.join(', ') // Değişiklikleri kaydet
            };
            
            // LocalStorage'a güncelle
            const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
            let savedData = Utils.loadFromStorage(storageKey, {});
            savedData[hour] = updatedRecord;
            Utils.saveToStorage(storageKey, savedData);
            
            // Mevcut verileri güncelle
            this.currentData.records[hour] = updatedRecord;
            
            // Durumu güncelle
            this.updateStatus(hour, updatedRecord);
            
            // Toplamları güncelle
            this.calculateTotals();
            
            Utils.showToast(`${hour} saat verisi güncellendi`, 'success');
            
            // API'ye gönder
            this.sendToAPI(updatedRecord, 'update');
            return;
        }
        
        // Yeni kayıt
        const record = {
            id: Date.now().toString(), // ✅ ID EKLENDİ
            aktif: aktif,
            reaktif: reaktif,
            aydemAktif: aydemAktif,
            aydemReaktif: aydemReaktif,
            timestamp: new Date().toISOString(),
            date: this.currentData.date,
            shift: this.currentData.shift,
            hour: hour,
            operator: Auth.getCurrentUser()?.username || 'unknown',
            isNewRecord: true
        };
        
        // LocalStorage'a kaydet
        const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
        let savedData = Utils.loadFromStorage(storageKey, {});
        savedData[hour] = record;
        Utils.saveToStorage(storageKey, savedData);
        
        // Mevcut verileri güncelle
        this.currentData.records[hour] = record;
        
        // Durumu güncelle
        this.updateStatus(hour, record);
        
        // Toplamları güncelle
        this.calculateTotals();
        
        Utils.showToast(`${hour} saat verisi kaydedildi`, 'success');
        
        // API'ye gönder
        this.sendToAPI(record, 'save');
    },
    
    /**
     * Tüm kayıtları kaydet
     */
    saveAllRecords: function() {
        const unsavedHours = [];
        const savedRecords = [];
        
        this.currentData.hours.forEach(hour => {
            const aktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aktif"]`);
            const reaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="reaktif"]`);
            const aydemAktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aydemAktif"]`);
            const aydemReaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aydemReaktif"]`);
            
            const aktif = parseFloat(aktifInput.value) || 0;
            const reaktif = parseFloat(reaktifInput.value) || 0;
            const aydemAktif = parseFloat(aydemAktifInput.value) || 0;
            const aydemReaktif = parseFloat(aydemReaktifInput.value) || 0;
            
            if (aktif > 0 || reaktif > 0 || aydemAktif > 0 || aydemReaktif > 0) {
                unsavedHours.push(hour);
                
                // ✅ Direkt kayıt mantığı - saveSingleRecord'ı çağırma
                const existingRecord = this.currentData.records[hour];
                
                if (existingRecord && existingRecord.timestamp) {
                    // ✅ Değişiklik kontrolü yap
                    const hasChanges = (
                        existingRecord.aktif !== aktif ||
                        existingRecord.reaktif !== reaktif ||
                        existingRecord.aydemAktif !== aydemAktif ||
                        existingRecord.aydemReaktif !== aydemReaktif
                    );
                    
                    if (!hasChanges) {
                        // Değişiklik yoksa atla
                        return;
                    }
                    
                    // Update öncesi ID kontrolü
                    if (!existingRecord.id) {
                        existingRecord.id = Date.now().toString();
                    }
                    
                    // Update kaydı oluştur
                    const updatedRecord = {
                        ...existingRecord,
                        aktif: aktif,
                        reaktif: reaktif,
                        aydemAktif: aydemAktif,
                        aydemReaktif: aydemReaktif,
                        updatedAt: new Date().toISOString(),
                        editedBy: Auth.getCurrentUser()?.username || 'unknown',
                        originalTimestamp: existingRecord.timestamp,
                        originalOperator: existingRecord.operator
                    };
                    
                    // LocalStorage'a güncelle
                    const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
                    let savedData = Utils.loadFromStorage(storageKey, {});
                    savedData[hour] = updatedRecord;
                    Utils.saveToStorage(storageKey, savedData);
                    
                    // Mevcut verileri güncelle
                    this.currentData.records[hour] = updatedRecord;
                    savedRecords.push({ record: updatedRecord, action: 'update' });
                    
                } else {
                    // Yeni kayıt
                    const record = {
                        id: Date.now().toString(),
                        aktif: aktif,
                        reaktif: reaktif,
                        aydemAktif: aydemAktif,
                        aydemReaktif: aydemReaktif,
                        timestamp: new Date().toISOString(),
                        date: this.currentData.date,
                        shift: this.currentData.shift,
                        hour: hour,
                        operator: Auth.getCurrentUser()?.username || 'unknown',
                        isNewRecord: true
                    };
                    
                    // LocalStorage'a kaydet
                    const storageKey = `hourly_${this.currentData.date}_${this.currentData.shift}`;
                    let savedData = Utils.loadFromStorage(storageKey, {});
                    savedData[hour] = record;
                    Utils.saveToStorage(storageKey, savedData);
                    
                    // Mevcut verileri güncelle
                    this.currentData.records[hour] = record;
                    savedRecords.push({ record: record, action: 'save' });
                }
                
                // Durumu güncelle
                this.updateStatus(hour, this.currentData.records[hour]);
            }
        });
        
        // Toplamları güncelle
        this.calculateTotals();
        
        // API'ye toplu gönder
        savedRecords.forEach(({ record, action }) => {
            this.sendToAPI(record, action);
        });
        
        if (unsavedHours.length === 0) {
            Utils.showToast('Kaydedilecek yeni veri bulunamadı', 'info');
        } else {
            Utils.showToast(`${unsavedHours.length} kayıt başarıyla kaydedildi`, 'success');
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
        const aydemAktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aydemAktif"]`);
        const aydemReaktifInput = document.querySelector(`[data-hour="${hour}"][data-field="aydemReaktif"]`);
        
        if (aktifInput) aktifInput.value = '';
        if (reaktifInput) reaktifInput.value = '';
        if (aydemAktifInput) aydemAktifInput.value = '';
        if (aydemReaktifInput) aydemReaktifInput.value = '';
        
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
     * API'ye veri gönder
     */
    sendToAPI: function(record, action = 'save') {
        const url = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.saatlik;
        
        if (!url || url === 'BURAYA_YENI_URL_GELECEK') {
            console.log('Saatlik enerji URL\'si yapılandırılmamış');
            return;
        }
        
        const formData = new FormData();
        formData.append('action', action);
        formData.append('module', 'saatlik');
        formData.append('timestamp', new Date().toISOString());
        
        // Verileri ekle
        Object.keys(record).forEach(key => {
            formData.append(key, record[key]);
        });
        
        fetch(url, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const actionText = action === 'update' ? 'güncellendi' : 'kaydedildi';
                console.log(`Saatlik enerji verisi API'ye ${actionText}:`, data);
                Utils.showToast(`Veri Google Sheets'e ${actionText}`, 'success');
            } else {
                console.error('API hatası:', data.error);
                Utils.showToast('Google Sheets hatası: ' + data.error, 'error');
            }
        })
        .catch(error => {
            console.error('API gönderim hatası:', error);
            Utils.showToast('İnternet bağlantısı hatası', 'error');
        });
    }
};

// Global erişim
window.Enerji = Enerji;
