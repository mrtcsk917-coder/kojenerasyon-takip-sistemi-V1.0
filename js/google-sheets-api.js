/**
 * KOJENERASYON TAKIP SISTEMI - GOOGLE SHEETS API
 * API Key olmadan Google Sheets entegrasyonu
 */

const GoogleSheetsAPI = {
    
    /**
     * Veri kaydet
     * @param {string} module - Modül adı (buhar, kojen_motor, kojen_enerji, vb.)
     * @param {Object} data - Kaydedilecek veri
     * @param {string} action - İşlem türü (save, update, delete)
     */
    saveData: async function(module, data, action = 'save') {
        try {
            const url = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS[module];
            if (!url) {
                console.error(`Google Sheets URL bulunamadı: ${module}`);
                return { success: false, error: 'Modül URL bulunamadı' };
            }

            // FormData oluştur
            const formData = new FormData();
            formData.append('action', action);
            formData.append('module', module);
            formData.append('timestamp', new Date().toISOString());
            
            // Veri alanlarını FormData'ya ekle
            Object.keys(data).forEach(key => {
                formData.append(key, data[key]);
            });

            const response = await fetch(url, {
                method: 'POST',
                body: formData  // Content-Type otomatik ayarlanır
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`${module} verisi başarıyla kaydedildi:`, result);
            
            return { success: true, data: result };

        } catch (error) {
            console.error(`${module} kayıt hatası:`, error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Veri çek
     * @param {string} module - Modül adı
     * @param {Object} filters - Filtreler (tarih, tarih_araligi, vb.)
     */
    getData: async function(module, filters = {}) {
        try {
            const url = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS[module];
            if (!url) {
                console.error(`Google Sheets URL bulunamadı: ${module}`);
                return { success: false, error: 'Modül URL bulunamadı' };
            }

            // FormData oluştur
            const formData = new FormData();
            formData.append('action', 'get');
            formData.append('module', module);
            
            // Filtreleri FormData'ya ekle
            Object.keys(filters).forEach(key => {
                formData.append(key, filters[key]);
            });

            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`${module} verisi başarıyla çekildi:`, result);
            
            return { success: true, data: result };

        } catch (error) {
            console.error(`${module} veri çekme hatası:`, error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Veri güncelle
     * @param {string} module - Modül adı
     * @param {string} recordId - Kayıt ID
     * @param {Object} data - Güncellenecek veri
     */
    updateData: async function(module, recordId, data) {
        return await this.saveData(module, {
            id: recordId,
            ...data
        }, 'update');
    },

    /**
     * Veri sil
     * @param {string} module - Modül adı
     * @param {string} recordId - Kayıt ID
     */
    deleteData: async function(module, recordId) {
        return await this.saveData(module, {
            id: recordId
        }, 'delete');
    },

    /**
     * Tarih aralığına göre veri çek
     * @param {string} module - Modül adı
     * @param {string} startDate - Başlangıç tarihi (YYYY-MM-DD)
     * @param {string} endDate - Bitiş tarihi (YYYY-MM-DD)
     */
    getDataByDateRange: async function(module, startDate, endDate) {
        return await this.getData(module, {
            type: 'date_range',
            start_date: startDate,
            end_date: endDate
        });
    },

    /**
     * Son N kaydı çek
     * @param {string} module - Modül adı
     * @param {number} limit - Kayıt sayısı
     */
    getRecentData: async function(module, limit = 10) {
        return await this.getData(module, {
            type: 'recent',
            limit: limit
        });
    },

    /**
     * İstatistikleri çek
     * @param {string} module - Modül adı
     * @param {Object} filters - Filtreler
     */
    getStatistics: async function(module, filters = {}) {
        return await this.getData(module, {
            type: 'statistics',
            ...filters
        });
    },

    /**
     * Bağlantı testi
     * @param {string} module - Modül adı
     */
    testConnection: async function(module) {
        try {
            const url = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS[module];
            if (!url) {
                console.error(`Google Sheets URL bulunamadı: ${module}`);
                return { success: false, error: 'Modül URL bulunamadı' };
            }

            // FormData oluştur
            const formData = new FormData();
            formData.append('action', 'test');
            formData.append('module', module);

            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`${module} bağlantı testi başarılı:`, result);
            
            return { success: true, data: result };

        } catch (error) {
            console.error(`${module} bağlantı hatası:`, error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Toplu veri kaydet
     * @param {string} module - Modül adı
     * @param {Array} dataList - Kaydedilecek veri listesi
     */
    saveBulkData: async function(module, dataList) {
        try {
            const url = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS[module];
            if (!url) {
                console.error(`Google Sheets URL bulunamadı: ${module}`);
                return { success: false, error: 'Modül URL bulunamadı' };
            }

            // FormData oluştur
            const formData = new FormData();
            formData.append('action', 'bulk_save');
            formData.append('module', module);
            formData.append('data', JSON.stringify(dataList)); // Array'i string olarak ekle

            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`${module} toplu verisi başarıyla kaydedildi:`, result);
            
            return { success: true, data: result };

        } catch (error) {
            console.error(`${module} toplu kayıt hatası:`, error);
            return { success: false, error: error.message };
        }
    }
};

// Global olarak erişilebilir yap
window.GoogleSheetsAPI = GoogleSheetsAPI;
