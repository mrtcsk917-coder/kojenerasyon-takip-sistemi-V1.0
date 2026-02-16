/**
 * KOJENERASYON TAKIP SISTEMI - BUHAR VERILERI
 * Buhar verisi kaydetme ve yönetim modülü
 */

const BuharVerileri = {
    // Mevcut veriler
    steamData: [],
    
    /**
     * Sayfayı başlat
     */
    init: function() {
        this.bindEvents();
        this.setDefaultDateTime();
        
        // startDateTimeUpdate çağrısını kontrol et
        if (typeof this.startDateTimeUpdate === 'function') {
            this.startDateTimeUpdate();
        }
        
        // Önce localStorage'dan hızlıca yükle
        this.loadFromStorage();
        
        // Sonra Google Sheets'ten çek ve localStorage'ı güncelle
        this.loadFromGoogleSheets();
    },
    
    /**
     * Event listener'ları bağla
     */
    bindEvents: function() {
        // Sadece form submit event'i
        document.getElementById('steam-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSteamData();
        });
        
        // Form temizle butonu
        document.getElementById('reset-steam-form').addEventListener('click', () => {
            this.resetForm();
        });
    },
    
    /**
     * Tarih/saat güncellemeyi başlat
     */
    startDateTimeUpdate: function() {
        this.dateTimeInterval = setInterval(() => {
            this.updateDateTime();
        }, 1000); // Her saniye güncelle
    },
    
    /**
     * Tarih/saat güncellemeyi durdur
     */
    stopDateTimeUpdate: function() {
        if (this.dateTimeInterval) {
            clearInterval(this.dateTimeInterval);
            this.dateTimeInterval = null;
        }
    },
    
    /**
     * Varsayılan tarih ve saati ayarla
     */
    setDefaultDateTime: function() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;
        
        // Saati daha güvenli bir şekilde al
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const time = `${hours}:${minutes}`;
        
        // Tarih ve saat input'larını doldur
        const dateInput = document.getElementById('steam-date');
        const timeInput = document.getElementById('steam-time');
        
        if (dateInput) {
            dateInput.value = date;
        }
        
        if (timeInput) {
            timeInput.value = time;
        }
    },
    
    /**
     * Anlık tarih ve saati güncelle
     */
    updateDateTime: function() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const dateTimeString = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        
        // Buhar sayfası
        const dateTimeElement = document.getElementById('current-datetime');
        if (dateTimeElement) {
            dateTimeElement.textContent = dateTimeString;
        }
        
        // Kojen Motor sayfası
        const kojenMotorElement = document.getElementById('kojen-motor-datetime');
        if (kojenMotorElement) {
            kojenMotorElement.textContent = dateTimeString;
        }
        
        // Kojen Enerji sayfası
        const kojenEnerjiElement = document.getElementById('kojen-enerji-datetime');
        if (kojenEnerjiElement) {
            kojenEnerjiElement.textContent = dateTimeString;
        }
    },
    
    /**
     * Buhar verisi kaydet
     */
    async saveSteamData() {
        try {
            const formData = new FormData(document.getElementById('steam-form'));
            
            const currentUser = Utils.getCurrentUser();
            
            // Saat boşsa şu anki saati kullan
            let timeValue = formData.get('steam-time');
            if (!timeValue || timeValue.trim() === '') {
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                timeValue = `${hours}:${minutes}`;
            }
            
            const steamRecord = {
                id: Date.now().toString(),
                date: CONFIG.formatDate(new Date(formData.get('steam-date'))), // Tarihi formatla
                time: timeValue,
                amount: parseFloat(formData.get('steam-amount')) || 0, // ton olarak kaydet
                notes: formData.get('steam-notes') || '',
                timestamp: CONFIG.formatDateTime(new Date()),
                recordedBy: currentUser?.username || currentUser?.name || 'Bilinmeyen Kullanıcı'
            };
            
            // Validasyon
            if (!this.validateSteamData(steamRecord)) {
                return;
            }
            
            // Loading state
            this.setLoadingState(true);
            
            // LocalStorage'a kaydet (yedek için)
            const steamData = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.STEAM_DATA, []);
            steamData.push(steamRecord);
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.STEAM_DATA, steamData);
            
            // Google Sheets'e kaydet
            if (!CONFIG.DEMO_MODE) {
                const sheetsResult = await GoogleSheetsAPI.saveData('buhar', steamRecord);
                if (sheetsResult.success) {
                    Utils.showToast('✅ Buhar verisi başarıyla kaydedildi!', 'success');
                    // Sadece tabloyu güncelle, Google Sheets'ten çekme
                    this.loadSteamData();
                } else {
                    Utils.showToast('⚠️ LocalStorage\'a kaydedildi, Google Sheets hatası: ' + sheetsResult.error, 'warning');
                }
            } else {
                Utils.showToast('✅ Buhar verisi demo modunda kaydedildi!', 'success');
            }
            
            // Formu temizle
            this.resetForm();
            
        } catch (error) {
            console.error('Kayıt hatası:', error);
            Utils.showToast('❌ Kayıt sırasında hata oluştu: ' + error.message, 'error');
        } finally {
            this.setLoadingState(false);
        }
    },
    
    /**
     * Loading state ayarla
     */
    setLoadingState: function(loading) {
        const form = document.getElementById('steam-form');
        const buttons = form.querySelectorAll('button');
        
        if (loading) {
            form.classList.add('loading');
            buttons.forEach(btn => btn.disabled = true);
            Utils.showLoading();
        } else {
            form.classList.remove('loading');
            buttons.forEach(btn => btn.disabled = false);
            Utils.hideLoading();
        }
    },
    
    /**
     * Buhar verisi validasyonu
     */
    validateSteamData: function(data) {
        if (!data.date || !data.time) {
            Utils.showToast('Tarih ve saat alanları zorunludur!', 'error');
            return false;
        }
        
        if (isNaN(data.amount) || data.amount < 0) {
            Utils.showToast('Buhar miktarı geçerli bir sayı olmalıdır!', 'error');
            return false;
        }
        
        return true;
    },
    
    /**
     * Buhar verilerini yükle
     */
    async loadSteamData() {
        try {
            // LocalStorage'dan verileri yükle
            this.steamData = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.STEAM_DATA, []);
            
            // Tarihe göre tersten sırala (en yeni üstte)
            this.steamData.sort((a, b) => {
                const dateA = new Date(a.date + ' ' + a.time);
                const dateB = new Date(b.date + ' ' + b.time);
                return dateB - dateA;
            });
            
            this.renderSteamTable();
            
        } catch (error) {
            console.error('Veri yükleme hatası:', error);
            Utils.showToast('Veri yükleme hatası: ' + error.message, 'error');
        }
    },
    
    /**
     * Tabloyu oluştur ve verileri göster
     */
    renderSteamTable: function() {
        const tableBody = document.getElementById('steam-table-body');
        const noDataMessage = document.getElementById('no-steam-data');
        
        if (!tableBody) return;
        
        if (this.steamData.length === 0) {
            tableBody.innerHTML = '';
            if (noDataMessage) {
                noDataMessage.style.display = 'block';
            }
            return;
        }
        
        if (noDataMessage) {
            noDataMessage.style.display = 'none';
        }
        
        tableBody.innerHTML = this.steamData.map(record => `
            <tr>
                <td>${this.formatDate(record.date)}</td>
                <td>${record.time}</td>
                <td>${record.amount ? record.amount.toFixed(1) : '0'}</td>
                <td>${record.notes || '-'}</td>
                <td>${record.recordedBy}</td>
                <td class="action-buttons">
                    <button class="btn-small btn-edit" onclick="BuharVerileri.editRecord('${record.id}')" title="Düzenle">
                        ✏️
                    </button>
                    <button class="btn-small btn-delete" onclick="BuharVerileri.deleteRecord('${record.id}')" title="Sil">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');
    },
    
    /**
     * Tarih formatla (Türkçe format)
     */
    formatDate: function(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    },
    
    /**
     * Tarih ve saat formatla (Türkçe format)
     */
    formatDateTime: function(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    },
    
    /**
     * Kayıt sayısını güncelle
     */
    updateRecordCount: function() {
        const countElement = document.getElementById('steam-count');
        if (countElement) {
            countElement.textContent = this.steamData.length;
        }
    },
    
    /**
     * Formu temizle
     */
    resetForm: function() {
        document.getElementById('steam-form').reset();
        this.setDefaultDateTime();
    },
    
    /**
     * Tüm verileri temizle
     */
    clearAllData: function() {
        if (confirm('Tüm buhar verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
            this.steamData = [];
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.STEAM_DATA, []);
            this.renderSteamTable();
            this.updateRecordCount();
            Utils.showToast('Tüm veriler temizlendi', 'info');
        }
    },
    
    /**
     * Kayıt düzenle
     */
    editRecord: function(recordId) {
        const record = this.steamData.find(r => r.id === recordId);
        if (!record) {
            Utils.showToast('Kayıt bulunamadı!', 'error');
            return;
        }
        
        // Formu doldur
        document.getElementById('steam-date').value = record.date;
        document.getElementById('steam-time').value = record.time;
        document.getElementById('steam-amount').value = record.amount;
        document.getElementById('steam-notes').value = record.notes;
        
        // Eski kaydı sil
        this.deleteRecord(recordId, false);
        
        // Forma odaklan
        document.getElementById('steam-amount').focus();
        
        Utils.showToast('Kayıt düzenleme modu. Değişiklikleri yapın ve kaydedin.', 'info');
    },
    
    /**
     * Kayıt sil
     */
    deleteRecord: function(recordId, showConfirm = true) {
        if (showConfirm && !confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
            return;
        }
        
        const index = this.steamData.findIndex(r => r.id === recordId);
        if (index !== -1) {
            this.steamData.splice(index, 1);
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.STEAM_DATA, this.steamData);
            this.renderSteamTable();
            this.updateRecordCount();
            
            if (showConfirm) {
                Utils.showToast('Kayıt silindi', 'success');
            }
        }
    },
    
    /**
     * Excel'e aktar
     */
    exportToExcel: function() {
        try {
            if (this.steamData.length === 0) {
                Utils.showToast('Aktarılacak veri bulunmuyor!', 'error');
                return;
            }
            
            // Excel verisi hazırla
            const excelData = this.steamData.map(record => ({
                'Tarih': record.date,
                'Saat': record.time,
                'Buhar Miktarı (ton)': record.amount,
                'Notlar': record.notes,
                'Kaydeden': record.recordedBy,
                'Kayıt Zamanı': this.formatDateTime(record.timestamp)
            }));
            
            // Excel dosyası oluştur
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Buhar Verileri');
            
            // Dosya adı
            const fileName = `Buhar_Verileri_${CONFIG.formatDate()}.xlsx`;
            
            // İndir
            XLSX.writeFile(wb, fileName);
            
            Utils.showToast('Excel dosyası başarıyla indirildi!', 'success');
            
        } catch (error) {
            console.error('Excel aktarım hatası:', error);
            Utils.showToast('Excel aktarımı başarısız: ' + error.message, 'error');
        }
    },
    
    /**
     * Google Sheets'ten veri çek
     */
    loadFromGoogleSheets: async function() {
        try {
            this.setLoadingState(true);
            
            const result = await GoogleSheetsAPI.getData('buhar', { type: 'recent', limit: 100 });
            
            if (result.success && result.data) {
                // Google Sheets verilerini frontend formatına çevir
                const googleSheetsData = result.data.map(record => ({
                    id: record.ID || record.id,
                    date: record.Tarih || record.date,
                    time: record.Saat || record.time,
                    amount: parseFloat(record['Buhar Miktarı (ton)'] || record.amount || 0),
                    notes: record.Notlar || record.notes || '',
                    recordedBy: record.Kaydeden || record.recordedBy || 'admin',
                    timestamp: record['Kayıt Zamanı'] || record.timestamp
                }));
                
                // Mevcut localStorage verileri ile Google Sheets verilerini birleştir
                const localStorageData = this.steamData || [];
                
                // Google Sheets verilerini localStorage'a ekle (yeni kayıtlar)
                const mergedData = [...localStorageData];
                googleSheetsData.forEach(googleRecord => {
                    const existingIndex = mergedData.findIndex(localRecord => 
                        localRecord.date === googleRecord.date && localRecord.time === googleRecord.time
                    );
                    
                    if (existingIndex === -1) {
                        mergedData.push(googleRecord);
                    } else {
                        // Mevcut kaydı güncelle
                        mergedData[existingIndex] = googleRecord;
                    }
                });
                
                // Tarihe göre sırala
                mergedData.sort((a, b) => {
                    const dateA = new Date(a.date + ' ' + a.time);
                    const dateB = new Date(b.date + ' ' + b.time);
                    return dateB - dateA;
                });
                
                // Verileri güncelle
                this.steamData = mergedData;
                Utils.saveToStorage(CONFIG.STORAGE_KEYS.STEAM_DATA, this.steamData);
                this.renderSteamTable();
                this.updateRecordCount();
                
                Utils.showToast('Veriler Google Sheets\'ten senkronize edildi', 'success');
            } else {
                Utils.showToast('Google Sheets\'ten veri yüklenemedi', 'error');
            }
        } catch (error) {
            console.error('Google Sheets yükleme hatası:', error);
            Utils.showToast('Google Sheets\'ten veri yüklenemedi: ' + error.message, 'error');
        } finally {
            this.setLoadingState(false);
        }
    },
    
    /**
     * İstatistikleri getir
     */
    getStatistics: function() {
        if (this.steamData.length === 0) {
            return {
                totalRecords: 0,
                totalAmount: 0
            };
        }
        
        const totalRecords = this.steamData.length;
        const totalAmount = this.steamData.reduce((sum, r) => sum + r.amount, 0);
        
        return {
            totalRecords,
            totalAmount: totalAmount.toFixed(1)
        };
    }
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', function() {
    // Sadece buhar sayfasındaysa başlat
    if (document.getElementById('buhar-page')) {
        BuharVerileri.init();
    }
});

// Global erişim
window.BuharVerileri = BuharVerileri;
