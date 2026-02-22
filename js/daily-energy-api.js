/**
 * GÜNLÜK ENERJİ API MODÜLÜ
 * Google Sheets entegrasyonu için
 * Mevcut enerji.js dosyasına entegre edilebilir
 */

const DailyEnergyAPI = {
    // API URL - Config dosyasından alınacak
    apiUrl: null,
    
    // API durumunu takip et
    isOnline: true,
    lastSyncTime: null,
    
    /**
     * API'yi başlat
     */
    init: function() {
        // Config'den URL'i al
        if (window.CONFIG && CONFIG.googleAppsScript && CONFIG.googleAppsScript.dailyEnergyUrl) {
            this.apiUrl = CONFIG.googleAppsScript.dailyEnergyUrl;
        }
        
        // API durumunu kontrol et
        this.checkApiStatus();
    },
    
    /**
     * API durumunu kontrol et
     */
    checkApiStatus: function() {
        if (!this.apiUrl) {
            console.warn('⚠️ Daily Energy API URL yapılandırılmamış');
            this.isOnline = false;
            return false;
        }
        
        // Basit ping testi
        fetch(this.apiUrl, {
            method: 'POST',
            body: new FormData().append('action', 'ping')
        })
        .then(response => {
            this.isOnline = response.ok;
            console.log(this.isOnline ? '✅ Daily Energy API online' : '❌ Daily Energy API offline');
        })
        .catch(error => {
            this.isOnline = false;
            console.warn('❌ Daily Energy API bağlantı hatası:', error.message);
        });
        
        return this.isOnline;
    },
    
    /**
     * Günlük enerji verilerini kaydet
     */
    saveDailyEnergy: function(formData) {
        return new Promise((resolve, reject) => {
            if (!this.apiUrl) {
                reject(new Error('API URL yapılandırılmamış'));
                return;
            }
            
            // Form verilerini API formatına dönüştür
            const apiData = {
                action: 'save',
                module: 'daily-energy',
                timestamp: new Date().toISOString(),
                ...formData
            };
            
            // FormData oluştur
            const postData = new FormData();
            Object.keys(apiData).forEach(key => {
                postData.append(key, apiData[key]);
            });
            
            // API'ye gönder
            fetch(this.apiUrl, {
                method: 'POST',
                body: postData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.lastSyncTime = new Date();
                    console.log('✅ Günlük enerji API\'ye kaydedildi:', data);
                    resolve(data);
                } else {
                    console.error('❌ API hatası:', data.message);
                    reject(new Error(data.message));
                }
            })
            .catch(error => {
                console.error('💥 API gönderim hatası:', error);
                reject(error);
            });
        });
    },
    
    /**
     * Günlük enerji verilerini getir
     */
    getDailyEnergy: function(date) {
        return new Promise((resolve, reject) => {
            if (!this.apiUrl) {
                reject(new Error('API URL yapılandırılmamış'));
                return;
            }
            
            const postData = new FormData();
            postData.append('action', 'get');
            postData.append('module', 'daily-energy');
            postData.append('date', date);
            
            fetch(this.apiUrl, {
                method: 'POST',
                body: postData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    resolve(data.data);
                } else {
                    reject(new Error(data.message));
                }
            })
            .catch(error => {
                reject(error);
            });
        });
    },
    
    /**
     * Tüm günlük enerji verilerini listele
     */
    listDailyEnergy: function(limit = 100, offset = 0) {
        return new Promise((resolve, reject) => {
            if (!this.apiUrl) {
                reject(new Error('API URL yapılandırılmamış'));
                return;
            }
            
            const postData = new FormData();
            postData.append('action', 'list');
            postData.append('module', 'daily-energy');
            postData.append('limit', limit.toString());
            postData.append('offset', offset.toString());
            
            fetch(this.apiUrl, {
                method: 'POST',
                body: postData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    resolve(data.data);
                } else {
                    reject(new Error(data.message));
                }
            })
            .catch(error => {
                reject(error);
            });
        });
    },
    
    /**
     * Çevrimdışı verileri senkronize et
     */
    syncOfflineData: function() {
        return new Promise(async (resolve, reject) => {
            if (!this.isOnline) {
                resolve({ synced: 0, message: 'API offline' });
                return;
            }
            
            try {
                // LocalStorage'daki tüm günlük enerji verilerini al
                const keys = Object.keys(localStorage).filter(key => key.startsWith('daily-energy-'));
                let syncedCount = 0;
                const errors = [];
                
                for (const key of keys) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        await this.saveDailyEnergy(data);
                        
                        // Başarılı ise local'den sil
                        localStorage.removeItem(key);
                        syncedCount++;
                        
                        // API limitini aşmamak için kısa bekleme
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                    } catch (error) {
                        errors.push({ key: key, error: error.message });
                    }
                }
                
                resolve({
                    synced: syncedCount,
                    errors: errors,
                    message: `${syncedCount} veri senkronize edildi`
                });
                
            } catch (error) {
                reject(error);
            }
        });
    },
    
    /**
     * Veri istatistiklerini al
     */
    getStats: function() {
        return {
            isOnline: this.isOnline,
            lastSyncTime: this.lastSyncTime,
            apiUrl: this.apiUrl ? '✅ Yapılandırıldı' : '❌ Yapılandırılmamış',
            offlineCount: Object.keys(localStorage).filter(key => key.startsWith('daily-energy-')).length
        };
    },
    
    /**
     * API URL'ini güncelle
     */
    updateApiUrl: function(newUrl) {
        this.apiUrl = newUrl;
        this.checkApiStatus();
        
        // Config'i güncelle
        if (window.CONFIG) {
            if (!CONFIG.googleAppsScript) {
                CONFIG.googleAppsScript = {};
            }
            CONFIG.googleAppsScript.dailyEnergyUrl = newUrl;
        }
    },
    
    /**
     * Test bağlantısı
     */
    testConnection: function() {
        return new Promise((resolve, reject) => {
            if (!this.apiUrl) {
                reject(new Error('API URL yapılandırılmamış'));
                return;
            }
            
            const testData = {
                action: 'save',
                module: 'daily-energy',
                date: new Date().toISOString().split('T')[0],
                yagSeviyesi: '99.9',
                kuplaj: '0.0',
                gm1: '0.0',
                gm2: '0.0',
                gm3: '0.0',
                icIhtiyac: '0.0',
                redresor1: '0.0',
                redresor2: '0.0',
                kojenIcIhtiyac: '0',
                servisTrafo: '0.0',
                timestamp: new Date().toISOString(),
                kaydeden: 'API Test'
            };
            
            this.saveDailyEnergy(testData)
                .then(result => {
                    resolve({
                        success: true,
                        message: 'API bağlantısı başarılı',
                        result: result
                    });
                })
                .catch(error => {
                    reject(error);
                });
        });
    }
};

// Global erişim
window.DailyEnergyAPI = DailyEnergyAPI;

// Otomatik başlatma
document.addEventListener('DOMContentLoaded', function() {
    DailyEnergyAPI.init();
});
