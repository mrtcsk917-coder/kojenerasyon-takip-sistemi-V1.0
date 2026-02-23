/**
 * ============================================
 * VARDİYA API MODÜLÜ - Google Sheets Entegrasyonu
 * ============================================
 * 
 * Bu modül vardiya verilerini Google Sheets ile senkronize eder
 * ve bulut tabanlı vardiya yönetimi sağlar.
 * 
 * Kurulum:
 * 1. vardiya-google-apps-script.js'i Google Apps Script'e yükleyin
 * 2. Web App URL'sini config.js'e ekleyin
 * 3. Bu dosyayı js/ klasörüne kaydedin
 */

const VardiyaAPI = {
    // API URL - Config'den alınacak
    apiUrl: null,
    
    // API durumu
    isOnline: true,
    lastSyncTime: null,
    
    /**
     * API'yi başlat
     */
    init: function() {
        // Config'den URL'i al
        if (window.CONFIG && CONFIG.GOOGLE_SHEETS_WEB_APP_URLS && 
            CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.vardiya) {
            this.apiUrl = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.vardiya;
        }
        
        console.log('🔄 VardiyaAPI başlatılıyor...');
        this.checkApiStatus();
    },
    
    /**
     * API durumunu kontrol et
     */
    checkApiStatus: function() {
        if (!this.apiUrl || this.apiUrl === 'https://script.google.com/macros/s/PLACEHOLDER_URL_HERE/exec') {
            console.warn('⚠️ Vardiya API URL yapılandırılmamış');
            this.isOnline = false;
            return false;
        }
        
        // Test isteği gönder
        fetch(this.apiUrl + '?action=test')
            .then(response => response.json())
            .then(data => {
                this.isOnline = data.success;
                console.log(this.isOnline ? '✅ Vardiya API online' : '❌ Vardiya API offline');
            })
            .catch(error => {
                this.isOnline = false;
                console.warn('❌ Vardiya API bağlantı hatası:', error.message);
            });
    },
    
    /**
     * Tüm vardiyaları getir (Google Sheets'ten)
     */
    getAllVardiyalar: async function() {
        try {
            if (!this.apiUrl || this.apiUrl === 'https://script.google.com/macros/s/PLACEHOLDER_URL_HERE/exec') {
                console.warn('API URL yapılandırılmamış, localStorage kullanılıyor');
                return { success: true, vardiyalar: this.getLocalVardiyalar(), offline: true };
            }
            
            const formData = new FormData();
            formData.append('action', 'getAllVardiyalar');
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // LocalStorage'ı güncelle
                this.saveLocalVardiyalar(result.vardiyalar);
                return result;
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Vardiya getirme hatası:', error);
            // API hatası durumunda localStorage'dan getir
            return { success: true, vardiyalar: this.getLocalVardiyalar(), offline: true };
        }
    },
    
    /**
     * Tarihe göre vardiya getir
     */
    getVardiyaByDate: async function(tarih) {
        try {
            if (!this.apiUrl || this.apiUrl === 'https://script.google.com/macros/s/PLACEHOLDER_URL_HERE/exec') {
                // LocalStorage'dan ara
                const vardiyalar = this.getLocalVardiyalar();
                const vardiya = vardiyalar.find(v => v.Tarih === tarih);
                return vardiya ? 
                    { success: true, vardiya: vardiya, offline: true } : 
                    { success: false, error: 'Vardiya bulunamadı' };
            }
            
            const formData = new FormData();
            formData.append('action', 'getVardiyaByDate');
            formData.append('data', JSON.stringify({ tarih: tarih }));
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            return await response.json();
            
        } catch (error) {
            console.error('Vardiya arama hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Yeni vardiya kaydet
     */
    saveVardiya: async function(vardiyaData) {
        try {
            // Önce localStorage'a kaydet
            const localResult = this.saveLocalVardiya(vardiyaData);
            if (!localResult.success) {
                return localResult;
            }
            
            // API'ye gönder
            if (this.apiUrl && this.apiUrl !== 'https://script.google.com/macros/s/PLACEHOLDER_URL_HERE/exec') {
                const formData = new FormData();
                formData.append('action', 'saveVardiya');
                formData.append('data', JSON.stringify(vardiyaData));
                
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Vardiya Google Sheets\'e kaydedildi:', vardiyaData.tarih);
                    this.lastSyncTime = new Date();
                } else {
                    throw new Error(result.error);
                }
                
                return result;
            } else {
                // API yoksa sadece local olarak kaydedildiğini bildir
                return { 
                    success: true, 
                    message: 'Vardiya yerel olarak kaydedildi', 
                    offline: true 
                };
            }
            
        } catch (error) {
            console.error('Vardiya kaydetme hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Vardiya güncelle
     */
    updateVardiya: async function(vardiyaData) {
        try {
            if (!this.apiUrl || this.apiUrl === 'https://script.google.com/macros/s/PLACEHOLDER_URL_HERE/exec') {
                return { success: false, error: 'API URL yapılandırılmamış' };
            }
            
            const formData = new FormData();
            formData.append('action', 'updateVardiya');
            formData.append('data', JSON.stringify(vardiyaData));
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Vardiya güncellendi:', vardiyaData.id);
                this.lastSyncTime = new Date();
            }
            
            return result;
            
        } catch (error) {
            console.error('Vardiya güncelleme hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Vardiya sil
     */
    deleteVardiya: async function(id) {
        try {
            if (!this.apiUrl || this.apiUrl === 'https://script.google.com/macros/s/PLACEHOLDER_URL_HERE/exec') {
                return { success: false, error: 'API URL yapılandırılmamış' };
            }
            
            const formData = new FormData();
            formData.append('action', 'deleteVardiya');
            formData.append('data', JSON.stringify({ id: id }));
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Vardiya silindi:', id);
                // LocalStorage'dan da sil
                this.deleteLocalVardiya(id);
            }
            
            return result;
            
        } catch (error) {
            console.error('Vardiya silme hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Tarih aralığına göre vardiyaları getir
     */
    getVardiyalarByDateRange: async function(baslangic, bitis) {
        try {
            if (!this.apiUrl || this.apiUrl === 'https://script.google.com/macros/s/PLACEHOLDER_URL_HERE/exec') {
                // LocalStorage'dan filtrele
                const vardiyalar = this.getLocalVardiyalar();
                const filtered = vardiyalar.filter(v => 
                    v.Tarih >= baslangic && v.Tarih <= bitis
                );
                return { success: true, vardiyalar: filtered, offline: true };
            }
            
            const formData = new FormData();
            formData.append('action', 'getVardiyalarByDateRange');
            formData.append('data', JSON.stringify({ baslangic: baslangic, bitis: bitis }));
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            return await response.json();
            
        } catch (error) {
            console.error('Tarih aralığı vardiya getirme hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    // ========== LOCAL STORAGE FONKSİYONLARI ==========
    
    /**
     * LocalStorage'dan vardiyaları getir
     */
    getLocalVardiyalar: function() {
        return Utils.loadFromStorage('vardiya_data', []);
    },
    
    /**
     * LocalStorage'a vardiya kaydet
     */
    saveLocalVardiya: function(vardiyaData) {
        try {
            const vardiyalar = this.getLocalVardiyalar();
            
            // Aynı ID'li vardiya varsa güncelle
            const existingIndex = vardiyalar.findIndex(v => v.ID === vardiyaData.id);
            if (existingIndex >= 0) {
                vardiyalar[existingIndex] = vardiyaData;
            } else {
                vardiyalar.push(vardiyaData);
            }
            
            Utils.saveToStorage('vardiya_data', vardiyalar);
            
            return { 
                success: true, 
                message: 'Vardiya yerel olarak kaydedildi',
                vardiyaId: vardiyaData.id
            };
            
        } catch (error) {
            console.error('Yerel vardiya kaydetme hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * LocalStorage'a vardiyaları kaydet
     */
    saveLocalVardiyalar: function(vardiyalar) {
        try {
            Utils.saveToStorage('vardiya_data', vardiyalar);
            return { success: true };
        } catch (error) {
            console.error('Yerel vardiya listesi kaydetme hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * LocalStorage'dan vardiya sil
     */
    deleteLocalVardiya: function(id) {
        try {
            const vardiyalar = this.getLocalVardiyalar();
            const filtered = vardiyalar.filter(v => v.ID !== id);
            Utils.saveToStorage('vardiya_data', filtered);
            return { success: true };
        } catch (error) {
            console.error('Yerel vardiya silme hatası:', error);
            return { success: false, error: error.message };
        }
    }
};

// VardiyaAPI'yi global olarak erişilebilir yap
window.VardiyaAPI = VardiyaAPI;
