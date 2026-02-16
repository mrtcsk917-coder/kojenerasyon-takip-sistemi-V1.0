/**
 * KOJENERASYON TAKIP SISTEMI - BUHAR VERILERI
 * Buhar verisi kaydetme ve yönetim modülü
 */

const BuharVerileri = {
    // Mevcut veriler
    steamData: [],
    
    /**
     * Modülü başlat
     */
    init: function() {
        this.bindEvents();
        this.loadSteamData();
        this.setDefaultDateTime();
        this.updateDateTime();
        
        // Her saniye tarihi güncelle
        setInterval(() => this.updateDateTime(), 1000);
    },
    
    /**
     * Event listener'ları bağla
     */
    bindEvents: function() {
        // Form submit
        document.getElementById('steam-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSteamData();
        });
        
        // Form temizle
        document.getElementById('reset-steam-form').addEventListener('click', () => {
            this.resetForm();
        });
        
        // Ana kaydet butonu
        document.getElementById('save-steam-btn').addEventListener('click', () => {
            document.getElementById('steam-form').dispatchEvent(new Event('submit'));
        });
        
        // Temizle butonu
        document.getElementById('clear-steam-btn').addEventListener('click', () => {
            this.clearAllData();
        });
        
        // Excel'e aktar
        document.getElementById('export-steam-btn').addEventListener('click', () => {
            this.exportToExcel();
        });
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
        
        document.getElementById('steam-date').value = date;
        document.getElementById('steam-time').value = time;
    },
    
    /**
     * Anlık tarih ve saati güncelle
     */
    updateDateTime: function() {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        const dateTimeString = now.toLocaleDateString('tr-TR', options);
        
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
                date: formData.get('steam-date'),
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
        } else {
            form.classList.remove('loading');
            buttons.forEach(btn => btn.disabled = false);
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
            this.updateRecordCount();
            
        } catch (error) {
            console.error('Buhar verileri yüklenirken hata:', error);
            this.steamData = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.STEAM_DATA, []);
            this.renderSteamTable();
            this.updateRecordCount();
        }
    },
    
    /**
     * Buhar verilerini tabloya render et
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
        
        tableBody.innerHTML = this.steamData.map((record, index) => `
            <tr class="steam-row ${index % 2 === 0 ? 'even-row' : 'odd-row'}">
                <td>${this.formatDate(record.date)}</td>
                <td>${record.time}</td>
                <td>${record.steamProduction ? record.steamProduction.toFixed(1) : '--'}</td>
                <td>${record.notes ? `<span title="${record.notes}">${record.notes.substring(0, 30)}${record.notes.length > 30 ? '...' : ''}</span>` : '-'}</td>
                <td>${record.recordedBy || '-'}</td>
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
     * Tarih formatla
     */
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR');
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
                'Kayıt Zamanı': new Date(record.timestamp).toLocaleString('tr-TR')
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
