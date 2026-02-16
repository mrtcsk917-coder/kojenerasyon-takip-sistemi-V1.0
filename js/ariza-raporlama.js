/**
 * Arıza Kayıtları İzleme Modülü
 */
const ArizaRaporlama = {
    
    /**
     * Mevcut filtreler
     */
    filters: {
        baslangicTarih: '',
        bitisTarih: '',
        motor: '',
        turu: '',
        oncelik: '',
        durum: ''
    },

    /**
     * Modülü başlat
     */
    init: function() {
        this.loadArizaRecords();
        this.setupEventListeners();
    },

    /**
     * Event listener'ları ayarla
     */
    setupEventListeners: function() {
        const form = document.getElementById('ariza-form');
        if (!form) return;

        // Form submit event'ı
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateFiltersFromForm();
            this.fetchArizaRecords();
        });

        // Filtreleme event'ları
        this.setupFilterListeners();
    },

    /**
     * Arıza kaydı (Google Sheets ile)
     */
    saveArizaRecord: async function() {
        const form = document.getElementById('ariza-form');
        if (!form) return;

        const formData = {
            id: Date.now().toString(),
            tarih: document.getElementById('ariza-baslangic-tarih').value,
            motor: document.getElementById('ariza-motor').value,
            turu: document.getElementById('ariza-turu').value,
            aciklama: document.getElementById('ariza-aciklama').value,
            cozum: document.getElementById('ariza-cozum').value,
            personel: 'Sorumlu Personel', // Formda personel alanı yok
            durum: 'aktif',
            kayitZamani: CONFIG.formatDateTime(),
        };

        // Validasyon
        if (!formData.tarih || !formData.motor || !formData.turu || !formData.aciklama) {
            Utils.showToast('Lütfen zorunlu alanları doldurun', 'warning');
            return;
        }

        // LocalStorage'a kaydet
        const arizaData = Utils.loadFromStorage('ariza_data', []);
        arizaData.push(formData);
        Utils.saveToStorage('ariza_data', arizaData);

        // Google Sheets'e gönder
        try {
            const result = await GoogleSheetsAPI.addArizaRecord(formData);
            if (result.success) {
                Utils.showToast('Arıza kaydı Google Sheets\'e eklendi', 'success');
            } else {
                Utils.showToast('Google Sheets\'e eklenemedi: ' + result.error, 'error');
            }
        } catch (error) {
            Utils.showToast('Google Sheets hatası: ' + error.message, 'error');
        }

        // Formu temizle
        form.reset();

        // Listeyi güncelle
        this.loadArizaRecords();

        // Başarılı mesajı
        const typeText = this.getTypeText(formData.turu);
        Utils.showToast(`${typeText} başarıyla kaydedildi`, 'success');
    },

    /**
     * Formdan filtreleri güncelle
     */
    updateFiltersFromForm: function() {
        this.filters.baslangicTarih = document.getElementById('ariza-baslangic-tarih').value;
        this.filters.bitisTarih = document.getElementById('ariza-bitis-tarih').value;
        this.filters.motor = document.getElementById('ariza-motor').value;
        this.filters.turu = document.getElementById('ariza-turu').value;
        this.filters.oncelik = document.getElementById('ariza-oncelik').value;
        this.filters.durum = document.getElementById('ariza-durum').value;

        // Debug için konsola yazdır
        console.log('Form Filtreleri Güncellendi:', this.filters);
    },

    /**
     * Filtreleme event'ları ayarla
     */
    setupFilterListeners: function() {
        const filters = ['baslangic-tarih', 'bitis-tarih', 'motor', 'turu', 'oncelik', 'durum'];
        
        filters.forEach(filterId => {
            const element = document.getElementById(`ariza-${filterId}`);
            if (element) {
                element.addEventListener('change', () => {
                    this.updateFilter(filterId, element.value);
                });
            }
        });
    },

    /**
     * Filtreyi güncelle
     */
    updateFilter: function(filterType, value) {
        this.filters[filterType] = value;
        this.fetchArizaRecords();
    },

    /**
     * Arıza kayıtlarını getir
     */
    fetchArizaRecords: function() {
        const allRecords = Utils.loadFromStorage('ariza_data', []);
        
        // Debug için konsola yazdır
        console.log('Arıza Kayıtları Getiriliyor:', {
            totalRecords: allRecords.length,
            filters: this.filters,
            records: allRecords
        });
        
        // Filtreleme - "Tümü" seçeneği boş değer olarak kabul edilir
        let filteredRecords = allRecords.filter(record => {
            if (this.filters.baslangicTarih && record.tarih < this.filters.baslangicTarih) return false;
            if (this.filters.bitisTarih && record.tarih > this.filters.bitisTarih) return false;
            if (this.filters.motor && this.filters.motor !== 'hepsi' && record.motor !== this.filters.motor) return false;
            if (this.filters.turu && record.turu !== this.filters.turu) return false;
            if (this.filters.oncelik && record.oncelik !== this.filters.oncelik) return false;
            if (this.filters.durum && record.durum !== this.filters.durum) return false;
            return true;
        });

        console.log('Filtrelenmiş Kayıtlar:', filteredRecords.length);
        this.displayArizaList(filteredRecords);
    },

    /**
     * Arıza listesini göster
     */
    displayArizaList: function(arizaData) {
        const arizaList = document.getElementById('ariza-list');
        const countElement = document.getElementById('ariza-count');
        
        if (!arizaList) return;

        // Kayıt sayısını güncelle
        if (countElement) {
            countElement.textContent = arizaData.length;
        }

        if (arizaData.length === 0) {
            arizaList.innerHTML = `
                <div class="empty-message">
                    <span class="empty-icon">📋</span>
                    <p>Filtrelere uygun arıza kaydı bulunmuyor.</p>
                    <button class="btn-primary" onclick="ArizaRaporlama.clearFilters()">
                        <span>Filtreleri Temizle</span>
                    </button>
                </div>
            `;
            return;
        }

        // Arıza kayıtlarını gruplandır
        const groupedData = this.groupRecordsByStatus(arizaData);
        
        let html = '';
        
        // Aktif arızalar
        if (groupedData.aktif.length > 0) {
            html += `
                <div class="record-group">
                    <h4 class="group-title">
                        <span class="group-icon">🔴</span>
                        Aktif Arızalar (${groupedData.aktif.length})
                    </h4>
                    <div class="record-list">
                        ${this.generateRecordRows(groupedData.aktif)}
                    </div>
                </div>
            `;
        }

        // Çözülen arızalar
        if (groupedData.cozuldu.length > 0) {
            html += `
                <div class="record-group">
                    <h4 class="group-title">
                        <span class="group-icon">🟢</span>
                        Çözülen Arızalar (${groupedData.cozuldu.length})
                    </h4>
                    <div class="record-list">
                        ${this.generateRecordRows(groupedData.cozuldu)}
                    </div>
                </div>
            `;
        }

        arizaList.innerHTML = html;
    },

    /**
     * Kayıtları duruma göre gruplandır
     */
    groupRecordsByStatus: function(records) {
        return {
            aktif: records.filter(r => r.durum === 'aktif'),
            cozuldu: records.filter(r => r.durum === 'cozuldu')
        };
    },

    /**
     * Kayıt satırları oluştur
     */
    generateRecordRows: function(records) {
        return records.map(record => `
            <div class="record-item ${record.durum}">
                <div class="record-header">
                    <span class="record-date">${this.formatDate(record.tarih)}</span>
                    <span class="record-motor">${record.motor}</span>
                    <span class="record-type">${this.getTypeText(record.turu)}</span>
                    <span class="record-status status-${record.durum}">${this.getStatusText(record.durum)}</span>
                    <span class="record-oncelik oncelik-${record.oncelik}">${this.getOncelikText(record.oncelik)}</span>
                </div>
                <div class="record-content">
                    <p class="record-description">${record.aciklama}</p>
                    ${record.cozum ? `<p class="record-solution"><strong>Çözüm:</strong> ${record.cozum}</p>` : ''}
                </div>
            </div>
        `).join('');
    },

    /**
     * Tarih formatla
     */
    formatDate: function(tarih) {
        if (!tarih) return '';
        const date = new Date(tarih);
        return date.toLocaleString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Tür metnini al
     */
    getTypeText: function(turu) {
        const types = {
            'ariza': 'Arıza',
            'periyodik': 'Periyodik Bakım',
            'normal': 'Normal Bakım'
        };
        return types[turu] || turu;
    },

    /**
     * Durum metnini al
     */
    getStatusText: function(durum) {
        const statuses = {
            'aktif': 'Aktif',
            'cozuldu': 'Çözüldü'
        };
        return statuses[durum] || durum;
    },

    /**
     * Öncelik metnini al
     */
    getOncelikText: function(oncelik) {
        const oncelikler = {
            'dusuk': 'Düşük',
            'orta': 'Orta',
            'yuksek': 'Yüksek',
            'acil': 'Acil'
        };
        return oncelikler[oncelik] || oncelik;
    },

    /**
     * Filtreleri temizle
     */
    clearFilters: function() {
        // Form alanlarını temizle
        const form = document.getElementById('ariza-form');
        if (form) {
            form.reset();
        }

        // Filtreleri sıfırla
        this.filters = {
            baslangicTarih: '',
            bitisTarih: '',
            motor: '',
            turu: '',
            oncelik: '',
            durum: ''
        };

        // Tüm kayıtları yeniden yükle
        this.loadArizaRecords();
        
        Utils.showToast('Filtreler temizlendi', 'success');
    },

    /**
     * Arıza kayıtlarını yükle
     */
    loadArizaRecords: function() {
        const arizaData = Utils.loadFromStorage('ariza_data', []);
        this.displayArizaList(arizaData);
    },

    /**
     * Excel'e aktar
     */
    exportExcel: function() {
        const allRecords = Utils.loadFromStorage('ariza_data', []);
        
        if (allRecords.length === 0) {
            Utils.showToast('Dışa aktarılacak veri bulunmuyor', 'warning');
            return;
        }

        // Excel verisini hazırla
        const worksheet = XLSX.utils.json_to_sheet(allRecords.map(record => ({
            'Tarih': this.formatDate(record.tarih),
            'Tür': this.getTypeText(record.turu),
            'Motor': record.motor,
            'Açıklama': record.aciklama,
            'Çözüm': record.cozum || '',
            'Durum': this.getStatusText(record.durum),
            'Öncelik': this.getOncelikText(record.oncelik),
            'Kategori': record.turu === 'ariza' ? 'Arıza' : 'Bakım Arızası'
        })));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Arıza Kayıtları');

        // Dosyayı indir
        XLSX.writeFile(workbook, `ariza-kayitlari-${this.getFileNameDate()}.xlsx`);
        
        Utils.showToast('Excel dosyası başarıyla indirildi', 'success');
    },

    /**
     * PDF'e aktar
     */
    exportPDF: function() {
        const allRecords = Utils.loadFromStorage('ariza_data', []);
        
        if (allRecords.length === 0) {
            Utils.showToast('Dışa aktarılacak veri bulunmuyor', 'warning');
            return;
        }

        // PDF içeriğini hazırla
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Başlık
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Arıza Kayıtları Raporu', 105, 20);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Rapor Tarihi: ${new Date().toLocaleString('tr-TR')}`, 105, 35);

        // Verileri gruplandır
        const groupedData = this.groupRecordsByStatus(allRecords);
        let yPosition = 60;

        // Aktif arızalar
        if (groupedData.aktif.length > 0) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('🔴 Aktif Arızalar', 20, yPosition);
            yPosition += 15;

            groupedData.aktif.forEach((record, index) => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                
                const recordText = [
                    `Tarih: ${this.formatDate(record.tarih)}`,
                    `Motor: ${record.motor}`,
                    `Tür: ${this.getTypeText(record.turu)}`,
                    `Açıklama: ${record.aciklama}`,
                    record.cozum ? `Çözüm: ${record.cozum}` : '',
                    `Öncelik: ${this.getOncelikText(record.oncelik)}`
                ];

                recordText.forEach((text, i) => {
                    doc.text(text, 20, yPosition + (i * 5));
                });

                yPosition += 35;
            });
        }

        // Çözülen arızalar
        if (groupedData.cozuldu.length > 0) {
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('🟢 Çözülen Arızalar', 20, yPosition);
            yPosition += 15;

            groupedData.cozuldu.forEach((record, index) => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                
                const recordText = [
                    `Tarih: ${this.formatDate(record.tarih)}`,
                    `Motor: ${record.motor}`,
                    `Tür: ${this.getTypeText(record.turu)}`,
                    `Açıklama: ${record.aciklama}`,
                    record.cozum ? `Çözüm: ${record.cozum}` : '',
                    `Öncelik: ${this.getOncelikText(record.oncelik)}`
                ];

                recordText.forEach((text, i) => {
                    doc.text(text, 20, yPosition + (i * 5));
                });

                yPosition += 35;
            });
        }

        // PDF'i indir
        doc.save(`ariza-kayitlari-raporu-${this.getFileNameDate()}.pdf`);
        
        Utils.showToast('PDF dosyası başarıyla indirildi', 'success');
    },

    /**
     * Dosya adı için tarih formatla
     */
    getFileNameDate: function() {
        const now = new Date();
        return now.toISOString().split('T')[0].replace(/-/g, '');
    }
};

// ArizaRaporlama'yi global olarak erişilebilir yap
window.ArizaRaporlama = ArizaRaporlama;
