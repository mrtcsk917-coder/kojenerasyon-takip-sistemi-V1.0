/**
 * Google Sheets Kayıtları Modülü
 * Günlük enerji verilerini Google Sheets'ten çeker ve tablo olarak gösterir
 */

const DailyRecords = {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 20,
    allRecords: [],
    
    /**
     * Modülü başlat
     */
    init: function() {
        this.bindEvents();
        console.log('📋 Daily Records modülü başlatıldı');
    },
    
    /**
     * Event listener'ları bağla
     */
    bindEvents: function() {
        // Kayıt yükle butonu
        document.getElementById('load-records-btn')?.addEventListener('click', () => {
            this.loadRecords();
        });
        
        // Satır sayısı seçimi
        document.getElementById('row-count')?.addEventListener('change', (e) => {
            this.recordsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.renderTable();
        });
    },
    
    /**
     * Kayıtları Google Sheets'ten yükle
     */
    loadRecords: async function() {
        const loadBtn = document.getElementById('load-records-btn');
        const tbody = document.getElementById('records-tbody');
        const totalInfo = document.getElementById('total-records');
        
        try {
            // Butonu devre dışı bırak
            loadBtn.disabled = true;
            loadBtn.innerHTML = '<span>⏳</span><span>Yükleniyor...</span>';
            
            // Yükleme mesajı göster
            tbody.innerHTML = '<tr><td colspan="17" class="loading">Kayıtlar yükleniyor...</td></tr>';
            
            // Sadece Google Sheets'ten veri al
            await this.tryGoogleSheets(tbody, totalInfo, loadBtn);
            
        } catch (error) {
            console.error('❌ Kayıtlar yüklenemedi:', error);
            tbody.innerHTML = `<tr><td colspan="17" class="error-message">Hata: ${error.message}</td></tr>`;
            Utils.showToast('Kayıtlar yüklenemedi: ' + error.message, 'error');
        } finally {
            // Butonu eski haline getir
            loadBtn.disabled = false;
            loadBtn.innerHTML = '<span>🔄</span><span>Kayıtları Yükle</span>';
        }
    },
    
    /**
     * Google Sheets'ten veri çekmeyi dene
     */
    tryGoogleSheets: async function(tbody, totalInfo, loadBtn) {
        try {
            console.log('🌐 Google Sheets deneniyor...');
            
            // API'den tüm kayıtları al
            if (!window.DailyEnergyAPI) {
                throw new Error('DailyEnergyAPI modülü bulunamadı');
            }
            
            const records = await DailyEnergyAPI.listDailyEnergy(1000, 0); // İlk 1000 kayıt
            console.log('📋 API\'den gelen ham veri:', records);
            console.log('📋 Veri tipi:', typeof records);
            console.log('📋 Array mi?:', Array.isArray(records));
            
            // Gelen veriyi array'e çevir
            const apiRecords = Array.isArray(records) ? records : (records?.data || records?.records || []);
            console.log('📋 API kayıtları:', apiRecords);
            console.log('📋 API kayıt sayısı:', apiRecords.length);
            
            if (apiRecords.length > 0) {
                this.allRecords = apiRecords;
                this.totalRecords = this.allRecords.length;
                
                // Toplam kayıt bilgisini güncelle
                totalInfo.textContent = `Toplam: ${this.totalRecords} kayıt (Google Sheets)`;
                
                // Sayfaları hesapla
                this.totalPages = Math.ceil(this.totalRecords / this.recordsPerPage);
                this.currentPage = 1;
                
                // Tabloyu render et
                this.renderTable();
                
                Utils.showToast(`${this.totalRecords} kayıt Google Sheets'ten yüklendi`, 'success');
            } else {
                // Kayıt yoksa mesaj göster
                tbody.innerHTML = '<tr><td colspan="17" class="no-data">Google Sheets\'te kayıt bulunamadı</td></tr>';
                totalInfo.textContent = 'Toplam: 0 kayıt';
                Utils.showToast('Google Sheets\'te kayıt bulunamadı', 'warning');
            }
            
        } catch (error) {
            console.warn('⚠️ Google Sheets hatası:', error.message);
            tbody.innerHTML = `<tr><td colspan="17" class="error-message">Google Sheets hatası: ${error.message}</td></tr>`;
            Utils.showToast('Google Sheets erişilemiyor: ' + error.message, 'error');
        }
    },
    
    /**
     * Tabloyu render et
     */
    renderTable: function() {
        const tbody = document.getElementById('records-tbody');
        
        if (this.allRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="17" class="no-data">Kayıt bulunamadı</td></tr>';
            this.renderPagination();
            return;
        }
        
        // Sayfadaki kayıtları hesapla
        const startIndex = (this.currentPage - 1) * this.recordsPerPage;
        const endIndex = Math.min(startIndex + this.recordsPerPage, this.totalRecords);
        const pageRecords = this.allRecords.slice(startIndex, endIndex);
        
        // Tablo satırlarını oluştur
        let html = '';
        pageRecords.forEach(record => {
            html += this.createTableRow(record);
        });
        
        tbody.innerHTML = html;
        
        // Sayfalamayı render et
        this.renderPagination();
    },
    
    /**
     * Tablo satırı oluştur
     */
    createTableRow: function(record) {
        console.log('🔍 Kayıt detayı:', record);
        
        // Tarih formatla - Google Sheets'ten gelen tip belirsiz olabilir
        let date = record.date || record.Tarih || '-';
        
        // Google Sheets'ten gelen Tarih alanını güvenli hale getir
        if (record.Tarih) {
            if (record.Tarih instanceof Date) {
                // Date objesi ise YYYY-MM-DD formatına çevir
                const y = record.Tarih.getFullYear();
                const m = String(record.Tarih.getMonth() + 1).padStart(2, '0');
                const d = String(record.Tarih.getDate()).padStart(2, '0');
                date = `${y}-${m}-${d}`;
            } else {
                // String ise olduğu gibi kullan
                date = record.Tarih.toString();
            }
        }
        
        const formattedDate = this.formatDate(date); // formatDate zaten Türkçe formatlıyor
        
        // Kayıt tarihi
        const timestamp = record.timestamp || record['Kayıt Tarihi'] || '';
        const formattedTimestamp = timestamp ? this.formatDateTime(timestamp) : '-';
        
        // Kaydeden
        const kaydeden = record.kaydeden || record['Kaydeden'] || '-';
        
        // Değerleri kontrol et - Google Sheets ve LocalStorage formatlarını destekle
        const values = {
            yagSeviyesi: record.yagSeviyesi || record['Yağ Seviyesi (L)'] || '-',
            kuplaj: record.kuplaj || record['Kuplaj (MW)'] || '-',
            gm1: record.gm1 || record['GM-1 (MW)'] || '-',
            gm2: record.gm2 || record['GM-2 (MW)'] || '-',
            gm3: record.gm3 || record['GM-3 (MW)'] || '-',
            icIhtiyac: record.icIhtiyac || record['İç İhtiyaç (MW)'] || '-',
            redresor1: record.redresor1 || record['1. Redresör (MW)'] || '-',
            redresor2: record.redresor2 || record['2. Redresör (MW)'] || '-',
            kojenIcIhtiyac: record.kojenIcIhtiyac || record['Kojen İç İhtiyaç (kW)'] || '-',
            servisTrafo: record.servisTrafo || record['Servis Trafosu (MW)'] || '-'
        };
        
        console.log('📊 Tablo değerleri:', values);
        
        return `
            <tr>
                <td>${formattedDate}</td>
                <td>${values.yagSeviyesi}</td>
                <td>${values.kuplaj}</td>
                <td>${values.gm1}</td>
                <td>${values.gm2}</td>
                <td>${values.gm3}</td>
                <td>${values.icIhtiyac}</td>
                <td>${values.redresor1}</td>
                <td>${values.redresor2}</td>
                <td>${values.kojenIcIhtiyac}</td>
                <td>${values.servisTrafo}</td>
                <td>${kaydeden}</td>
                <td>${formattedTimestamp}</td>
                <td>${record['Düzenleyen'] || '-'}</td>
                <td>${record['Düzenleme Zamanı'] ? this.formatDateTime(record['Düzenleme Zamanı']) : '-'}</td>
                <td>${record['Düzenlenmiş Değer'] || '-'}</td>
            </tr>
        `;
    },
    
    /**
     * Sayfalamayı render et
     */
    renderPagination: function() {
        const pagination = document.getElementById('pagination');
        
        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Önceki butonu
        html += `<button ${this.currentPage === 1 ? 'disabled' : ''} onclick="DailyRecords.goToPage(${this.currentPage - 1})">←</button>`;
        
        // Sayfa numaraları
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            html += `<button onclick="DailyRecords.goToPage(1)">1</button>`;
            if (startPage > 2) {
                html += `<span>...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === this.currentPage ? 'active' : ''}" onclick="DailyRecords.goToPage(${i})">${i}</button>`;
        }
        
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                html += `<span>...</span>`;
            }
            html += `<button onclick="DailyRecords.goToPage(${this.totalPages})">${this.totalPages}</button>`;
        }
        
        // Sonraki butonu
        html += `<button ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="DailyRecords.goToPage(${this.currentPage + 1})">→</button>`;
        
        // Sayfa bilgisi
        html += `<span class="page-info">${this.currentPage} / ${this.totalPages}</span>`;
        
        pagination.innerHTML = html;
    },
    
    /**
     * Belirtilen sayfaya git
     */
    goToPage: function(page) {
        if (page < 1 || page > this.totalPages) return;
        
        this.currentPage = page;
        this.renderTable();
        
        // Üste kaydır
        document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth' });
    },
    
    /**
     * Tarihi formatla (ISO formatından görüntüleme formatına)
     */
    formatDate: function(dateStr) {
        if (!dateStr || dateStr === '-') return '-';
        
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            
            return date.toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    },
    
    /**
     * Tarih ve saati formatla
     */
    formatDateTime: function(dateTimeStr) {
        if (!dateTimeStr || dateTimeStr === '-') return '-';
        
        try {
            const date = new Date(dateTimeStr);
            if (isNaN(date.getTime())) return dateTimeStr;
            
            return date.toLocaleString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateTimeStr;
        }
    }
};

// Global erişim
window.DailyRecords = DailyRecords;
