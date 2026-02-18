/**
 * KOJENERASYON TAKIP SISTEMI - BUHAR VERILERI
 * Buhar verisi kaydetme ve yönetim modülü
 */

const BuharVerileri = {
    // Veri depoları
    googleSheetsData: [],
    isSaving: false,  // ← YENİ: çift kayıt engelleme
    
    /**
     * Debug log (sadece DEBUG_MODE'da çalışır)
     */
    debugLog: function(message, data = null) {
        if (CONFIG.DEBUG_MODE) {
            console.log('🔍 [BUHAR DEBUG]', message, data || '');
        }
    },
    
    /**
     * Sayfayı başlat
     */
    init: function() {
        this.bindEvents();
        this.setDefaultDateTime();
        this.loadGoogleSheetsData();
    },
    
    /**
     * Event listener'ları bağla
     */
    bindEvents: function() {
        this.debugLog('Event listener\'lar bağlanıyor...');
        
        // Form element kontrolü
        const form = document.getElementById('steam-form');
        const submitBtn = document.getElementById('steam-form-submit');
        const resetBtn = document.getElementById('reset-steam-form');
        
        this.debugLog('Form elementleri:', {
            form: !!form,
            submitBtn: !!submitBtn,
            resetBtn: !!resetBtn
        });
        
        if (!form) {
            this.debugLog('❌ steam-form bulunamadı!');
            return;
        }
        
        // Sadece form submit event'i
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.debugLog('Form submit eventi tetiklendi');
            this.saveSteamData();
        });
        
        // Form temizle butonu
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.debugLog('Form temizleme butonu tıklandı');
                this.resetForm();
            });
        }
        
        // Google Sheets yenile butonu
        const refreshBtn = document.getElementById('refresh-google-sheets-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.debugLog('Google Sheets yenileme butonu tıklandı');
                this.loadGoogleSheetsData();
            });
        }
        
        this.debugLog('✅ Event listener\'lar başarıyla bağlandı');
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
     * Tablo için tarih formatı (güvenli)
     */
    formatTableDate: function(dateValue) {
        return this.processDateTime(dateValue, null, { outputFormat: 'DD/MM/YYYY' });
    },

    /**
     * Tablo için saat formatı (güvenli - 1899 sorununu düzelt)
     */
    formatTableTime: function(timeValue) {
        if (!timeValue) return '-';
        
        // 1899 sorununu düzelt
        if (timeValue.includes('1899')) {
            return '-';
        }
        
        if (timeValue.includes('T')) return '-';
        return timeValue;
    },

    /**
     * Kayıt zamanı formatı (Google Sheets'den gelen sortDate)
     */
    formatRecordTime: function(sortDate, dateValue, timeValue) {
        // Öncelikle Google Sheets'den gelen sortDate'ı kullan
        if (sortDate && sortDate.includes('T')) {
            const date = new Date(sortDate);
            const formattedDate = CONFIG.formatDate(date);
            const formattedTime = date.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            return `${formattedDate} ${formattedTime}`;
        }
        
        // 1899 sorununu düzelt - timeValue 1899 içeriyorsa sortDate'dan saat al
        if (timeValue && timeValue.includes('1899')) {
            if (sortDate && sortDate.includes('T')) {
                const date = new Date(sortDate);
                const formattedDate = CONFIG.formatDate(date);
                const formattedTime = date.toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                return `${formattedDate} ${formattedTime}`;
            }
        }
        
        // sortDate yoksa merkezi fonksiyonu kullan
        return this.processDateTime(dateValue, timeValue, { 
            outputFormat: 'display', 
            includeTime: true 
        });
    },

    /**
     * Sıralama anahtarı oluştur (format bağımsız - güvenli)
     */
    createSortKey: function(dateStr, timeStr) {
        return this.processDateTime(dateStr, timeStr, { outputFormat: 'sortKey' });
    },

    /**
     * Tarihi normalize et (güvenli parsing - locale bağımsız - UTC sorunu yok)
     */
    normalizeDate: function(dateValue) {
        return this.processDateTime(dateValue, null, { outputFormat: 'YYYY-MM-DD' });
    },

    /**
     * TEK MERKEZİ Tarih-Saat İşleme Fonksiyonu
     */
    processDateTime: function(dateStr, timeStr, options = {}) {
        const {
            outputFormat = 'YYYY-MM-DD', // YYYY-MM-DD, DD/MM/YYYY, sortKey, display
            includeTime = false,
            fallbackTime = '00:00'
        } = options;
        
        if (!dateStr) return outputFormat === 'sortKey' ? '0000-00-00 00:00' : '-';
        
        // Tarih formatını normalize et
        let year, month, day;
        
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            [year, month, day] = dateStr.split('-');
        } else {
            const cleanDate = dateStr.replace(/[.]/g, '/');
            const parts = cleanDate.split('/');
            if (parts.length === 3) {
                [day, month, year] = parts;
            } else {
                return outputFormat === 'sortKey' ? '9999-99-99 99:99' : '-';
            }
        }
        
        year = parseInt(year, 10) || 0;
        month = parseInt(month, 10) || 0;
        day = parseInt(day, 10) || 0;
        
        // Saat işleme
        let cleanTime = timeStr || fallbackTime;
        if (cleanTime.includes('1899')) {
            cleanTime = cleanTime.split('T')[1]?.substring(0, 5) || fallbackTime;
        }
        if (cleanTime.includes('T')) {
            cleanTime = cleanTime.split('T')[1]?.substring(0, 5) || fallbackTime;
        }
        
        // Çıktı formatı
        switch (outputFormat) {
            case 'YYYY-MM-DD':
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            case 'DD/MM/YYYY':
                return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
            case 'sortKey':
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${cleanTime}`;
            case 'time':
                return cleanTime;
            case 'display':
                const formattedDate = CONFIG.formatDate(new Date(year, month - 1, day));
                return includeTime ? `${formattedDate} ${cleanTime}` : formattedDate;
            default:
                return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    },

    /**
     * Buhar verisi kaydet
     */
    async saveSteamData() {
        // Eğer zaten kaydediyorsa, yeni kaydı engelle
        if (this.isSaving) {
            this.debugLog('Zaten kaydediliyor, bekleyin...');
            Utils.showToast('Kaydediliyor, lütfen bekleyin...', 'warning');
            return;
        }
        
        try {
            // ✅ Tek kilit: hem UI hem logic
            this.setLoadingState(true);
            const formData = new FormData(document.getElementById('steam-form'));
            
            this.debugLog('Form verileri:', Object.fromEntries(formData.entries()));
            
            // Saat boşsa şu anki saati kullan
            let timeValue = formData.get('steam-time');
            if (!timeValue || timeValue.trim() === '') {
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                timeValue = `${hours}:${minutes}`;
                this.debugLog('Saat boş, şu anki saat kullanılıyor:', timeValue);
            }
            
            const steamRecord = {
                id: Date.now().toString(),
                date: CONFIG.formatDate(new Date(formData.get('steam-date'))), // Tarihi formatla
                time: timeValue,
                amount: parseFloat(formData.get('steam-amount')) || 0, // ton olarak kaydet
                notes: formData.get('steam-notes') || '',
                recordedBy: (Auth?.getCurrentUser()?.username || Auth?.getCurrentUser()?.name) || 'Bilinmeyen Kullanıcı'
            };
            
            // Debug için kullanıcı bilgisini logla
            const currentUser = Auth?.getCurrentUser();
            this.debugLog('Mevcut kullanıcı:', currentUser);
            this.debugLog('Kaydedilecek kullanıcı adı:', steamRecord.recordedBy);
            
            this.debugLog('Oluşturulan kayıt:', steamRecord);
            
            // Validasyon
            if (!this.validateSteamData(steamRecord)) {
                this.debugLog('❌ Validasyon hatası');
                // ✅ Tek kilit aç
                this.setLoadingState(false);
                return;
            }
            
            this.debugLog('✅ Validasyon başarılı, Google Sheets\'e gönderiliyor...');
            
            // Google Sheets'e kaydet
            if (!CONFIG.DEMO_MODE) {
                const sheetsResult = await GoogleSheetsAPI.saveData('buhar', steamRecord);
                this.debugLog('Google Sheets sonucu:', sheetsResult);
                
                if (sheetsResult.success) {
                    Utils.showToast('✅ Buhar verisi başarıyla kaydedildi!', 'success');
                    // Verileri yeniden yükle (frontend filtresi ile kontrol)
                    this.loadGoogleSheetsData();
                } else {
                    this.debugLog('❌ Google Sheets hatası:', sheetsResult.error);
                    Utils.showToast('⚠️ Google Sheets hatası: ' + sheetsResult.error, 'warning');
                }
            } else {
                this.debugLog('🧪 Demo mod aktif, kayıt yapılıyor...');
                Utils.showToast('✅ Buhar verisi demo modunda kaydedildi!', 'success');
                // Demo modunda da verileri yeniden yükle
                this.loadGoogleSheetsData();
            }
            
            // Formu temizle
            this.resetForm();
            
        } catch (error) {
            this.debugLog('❌ Kayıt hatası:', error);
            this.debugLog('Hata detayı:', error.message);
            this.debugLog('Hata stack:', error.stack);
            Utils.showToast('❌ Kayıt sırasında hata oluştu: ' + error.message, 'error');
        } finally {
            // ✅ Tek kilit aç
            this.setLoadingState(false);
        }
    },
    
    /**
     * Loading state ayarla (tek kilit - UI + logic senkron)
     */
    setLoadingState: function(loading) {
        const form = document.getElementById('steam-form');
        const buttons = form.querySelectorAll('button');
        
        // ✅ Tek kilit: hem UI hem logic
        this.isSaving = loading;
        
        if (loading) {
            form.classList.add('loading');
            buttons.forEach(btn => btn.disabled = true);
            // ✅ Utils.showToast kullan (queue bozulmaz)
            Utils.showToast('⏳ Yükleniyor...', 'info', 0); // 0 = auto hide yok
        } else {
            form.classList.remove('loading');
            buttons.forEach(btn => btn.disabled = false);
            // ✅ Loading toast'ını temizle (manuel olarak)
            const toast = document.getElementById('toast');
            if (toast && toast.textContent.includes('⏳ Yükleniyor...')) {
                toast.classList.add('hidden');
                // Queue'yu temizle ve devam et
                Utils.isToastShowing = false;
                Utils.processToastQueue();
            }
        }
    },
    
    /**
     * Buhar verisi validasyonu
     */
    validateSteamData: function(data) {
        this.debugLog('Validasyon kontrolü başlıyor:', data);
        
        if (!data.date || !data.time) {
            this.debugLog('❌ Tarih veya saat eksik:', { date: data.date, time: data.time });
            Utils.showToast('Tarih ve saat alanları zorunludur!', 'error');
            return false;
        }
        
        if (isNaN(data.amount) || data.amount < 0) {
            this.debugLog('❌ Buhar miktarı geçersiz:', { amount: data.amount, isNaN: isNaN(data.amount) });
            Utils.showToast('Buhar miktarı geçerli bir sayı olmalıdır!', 'error');
            return false;
        }
        
        this.debugLog('✅ Validasyon başarılı');
        return true;
    },

    /**
     * Google Sheets verilerini göster
     */
    renderGoogleSheetsTable: function() {
        const tableBody = document.getElementById('google-sheets-table-body');
        const noDataMessage = document.getElementById('no-google-sheets-data');
        const countElement = document.getElementById('google-sheets-count');
        
        this.debugLog('Tablo render başladı...');
        this.debugLog('Google Sheets veri sayısı:', this.googleSheetsData.length);
        this.debugLog('Veriler:', this.googleSheetsData);
        
        if (!tableBody) {
            this.debugLog('google-sheets-table-body bulunamadı!');
            return;
        }
        
        if (this.googleSheetsData.length === 0) {
            this.debugLog('Gösterilecek veri yok');
            tableBody.innerHTML = '';
            if (noDataMessage) {
                noDataMessage.style.display = 'block';
            }
            if (countElement) {
                countElement.textContent = '0';
            }
            return;
        }
        
        this.debugLog('Veriler render ediliyor...');
        
        if (noDataMessage) {
            noDataMessage.style.display = 'none';
        }
        
        if (countElement) {
            countElement.textContent = this.googleSheetsData.length;
        }
        
        tableBody.innerHTML = this.googleSheetsData.map(record => {
            const formattedDate = this.formatTableDate(record.date);
            const formattedTime = this.formatRecordTime(record.sortDate, record.date, record.time);
            
            this.debugLog('Kayıt render ediliyor:', {
                original: record,
                formattedDate: formattedDate,
                formattedTime: formattedTime
            });
            
            const html = `
            <tr>
                <td>${formattedDate}</td>
                <td>${formattedTime}</td>
                <td>${record.amount ? record.amount.toFixed(1) : '0'}</td>
                <td>${record.notes || '-'}</td>
                <td>${record.recordedBy}</td>
            </tr>
        `;
            
            this.debugLog('HTML:', html);
            return html;
        }).join('');
        
        this.debugLog('Final HTML length:', tableBody.innerHTML.length);
        this.debugLog('Final HTML preview:', tableBody.innerHTML.substring(0, 200));
        
        this.debugLog('Tablo render tamamlandı!');
    },

    /**
     * Google Sheets verilerini yükle (sadece API çağrısı)
     */
    loadGoogleSheetsData: async function() {
        try {
            this.setLoadingState(true);
            this.debugLog('Google Sheets veri çekme başladı...');
            
            // ✅ Tüm kayıtları çek (UTC sorunu olmasın)
            const result = await GoogleSheetsAPI.getData('buhar', { type: 'all' });
            
            this.debugLog('Google Sheets sonucu:', result);
            
            if (result.success && result.data) {
                // Verileri işle ve göster
                this.processGoogleSheetsData(result.data);
            } else {
                this.debugLog('Google Sheets verileri alınamadı:', result.error);
                Utils.showToast('❌ Google Sheets verileri alınamadı: ' + result.error, 'error');
            }
            
        } catch (error) {
            this.debugLog('Google Sheets yükleme hatası:', error);
            Utils.showToast('❌ Google Sheets yükleme hatası: ' + error.message, 'error');
        } finally {
            this.setLoadingState(false);
        }
    },

    /**
     * Google Sheets verilerini işle (mapping + temizleme)
     */
    processGoogleSheetsData: function(rawData) {
        this.debugLog('Google Sheets verileri geldi:', rawData.length, 'kayıt');
        this.debugLog('İlk 3 kayıt:', rawData.slice(0, 3));
        
        // Mapping ve temizleme
        this.googleSheetsData = rawData.map(record => {
            return this.mapGoogleSheetsRecord(record);
        });
        
        this.debugLog('Formatlanmış veriler:', this.googleSheetsData);
        
        // Sırala
        this.sortRecords();
        
        // En yeni 34 kaydı göster
        this.filterLatestRecords();
        
        // Render
        this.renderGoogleSheetsTable();
        
        Utils.showToast(`✅ Google Sheets verileri güncellendi (${this.googleSheetsData.length} kayıt)`, 'success');
    },

    /**
     * Tek bir Google Sheets kaydını map'le
     */
    mapGoogleSheetsRecord: function(record) {
        const rawDate = record.Tarih || record.date || '';
        const rawTime = record.Saat || record.time || '';
        
        // ✅ Merkezi fonksiyon ile tarih işleme
        const cleanDate = this.processDateTime(rawDate, null, { outputFormat: 'DD/MM/YYYY' });
        const cleanTime = this.processDateTime(null, rawTime, { outputFormat: 'time' });
        
        const formattedRecord = {
            id: record.ID || record.id || Date.now().toString(),
            date: cleanDate,  // ✅ String formatında
            time: cleanTime,  // ✅ String formatında
            amount: parseFloat(record['Buhar Miktarı (ton)'] || record.amount || 0),
            notes: record.Notlar || record.notes || '',
            recordedBy: record.Kaydeden || record.recordedBy || 'admin',
            sortDate: record.sortDate || null
        };
        
        // ✅ Sıralama anahtarı ekle (new Date() kullanmaz)
        formattedRecord.sortKey = this.createSortKey(formattedRecord.date, formattedRecord.time);
        
        // 1899 sorununu debug et
        if (formattedRecord.time && formattedRecord.time.includes('1899')) {
            this.debugLog('1899 sorunu tespit edildi:', {
                original: record,
                formatted: formattedRecord,
                sortDate: formattedRecord.sortDate
            });
        }
        
        this.debugLog('Formatlanmış kayıt:', formattedRecord);
        return formattedRecord;
    },

    /**
     * Son 34 kaydı göster (en yeniler)
     */
    filterLatestRecords: function() {
        const today = new Date();
        const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
        
        this.debugLog('Bugün (frontend):', todayString);
        
        // Frontend'de filtrele
        const beforeCount = this.googleSheetsData.length;
        this.debugLog('Filtrelemeden önceki kayıtlar:', this.googleSheetsData.map(r => ({
            date: r.date,
            normalized: this.normalizeDate(r.date)
        })));
        
        // ✅ Sadece en yeni 34 kaydı göster
        this.debugLog('⚠️ Sadece en yeni 34 kayıt gösteriliyor');
        
        // En yeni 34 kaydı al (sıralama zaten en yeni üstte)
        this.googleSheetsData = this.googleSheetsData.slice(0, 34);
        
        this.debugLog(`Toplam veriler: ${this.googleSheetsData.length}`);
        
        // Bugün için kayıt var mı kontrol et (sadece bilgi amaçlı)
        const todayRecords = this.googleSheetsData.filter(record => {
            const recordDate = this.normalizeDate(record.date);
            const isToday = recordDate === todayString;
            return isToday;
        });
        
        if (todayRecords.length > 0) {
            this.debugLog(`✅ Bugün için ${todayRecords.length} kayıt bulundu`);
        } else {
            this.debugLog(`ℹ️ Bugün için kayıt bulunamadı, en yeni 34 kayıt gösteriliyor`);
        }
    },

    /**
     * Kayıtları sırala (en yeni üstte)
     */
    sortRecords: function() {
        // Tarihe göre sırala (en yeni üstte) - ✅ String-based sıralama
        this.googleSheetsData.sort((a, b) => {
            // Öncelikle sortKey ile sırala (localeCompare)
            if (a.sortKey && b.sortKey) {
                return b.sortKey.localeCompare(a.sortKey);
            }
            
            // Fallback: sortDate varsa kullan (ISO string)
            if (a.sortDate && b.sortDate) {
                return b.sortDate.localeCompare(a.sortDate);
            }
            
            // Son fallback: manuel sortKey oluştur
            const sortKeyA = this.createSortKey(a.date, a.time);
            const sortKeyB = this.createSortKey(b.date, b.time);
            return sortKeyB.localeCompare(sortKeyA);
        });
        
        this.debugLog('Sıralanmış veriler:', this.googleSheetsData);
    },

    /**
     * Kayıt sayısını güncelle
     */
    updateRecordCount: function() {
        const countElement = document.getElementById('google-sheets-count');
        if (countElement) {
            countElement.textContent = this.googleSheetsData.length;
        }
    },

    /**
     * Formu temizle
     */
    resetForm: function() {
        const form = document.getElementById('steam-form');
        if (form) {
            form.reset();
            // Varsayılan tarih ve saati tekrar ayarla
            this.setDefaultDateTime();
        }
    },

    /**
     * Frontend verilerini temizle (sadece local view)
     */
    clearFrontendData: function() {
        if (confirm('Frontend verilerini temizlemek istediğinizden emin misiniz? Bu işlem sadece görünen verileri temizler, Google Sheets\'e dokunmaz.')) {
            this.googleSheetsData = [];
            this.renderGoogleSheetsTable();
            this.updateRecordCount();
            Utils.showToast('Frontend verileri temizlendi', 'info');
        }
    }
};

// Global olarak erişilebilir yap
window.BuharVerileri = BuharVerileri;
