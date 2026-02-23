/**
 * ============================================
 * KULLANICI API MODÜLÜ - Google Sheets Entegrasyonu
 * ============================================
 * 
 * Bu modül localStorage'daki kullanıcıları Google Sheets ile senkronize eder
 * ve bulut tabanlı kullanıcı yönetimi sağlar.
 * 
 * Kurulum:
 * 1. kullanici-google-apps-script.js'i Google Apps Script'e yükleyin
 * 2. Web App URL'sini config.js'e ekleyin
 * 3. Bu dosyayı js/ klasörüne kaydedin
 */

const UserAPI = {
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
            CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.kullanici) {
            this.apiUrl = CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.kullanici;
        }
        
        console.log('👤 UserAPI baslatiliyor...');
        this.checkApiStatus();
        
        // Otomatik senkronizasyon (isteğe bağlı)
        // this.syncLocalUsersToCloud();
    },
    
    /**
     * API durumunu kontrol et
     */
    checkApiStatus: function() {
        if (!this.apiUrl) {
            console.warn('⚠️ Kullanici API URL yapilandirilmamis');
            this.isOnline = false;
            return false;
        }
        
        // Test isteği gönder
        fetch(this.apiUrl + '?action=test')
            .then(response => response.json())
            .then(data => {
                this.isOnline = data.success;
                console.log(this.isOnline ? '✅ Kullanici API online' : '❌ Kullanici API offline');
            })
            .catch(error => {
                this.isOnline = false;
                console.warn('❌ Kullanici API baglanti hatasi:', error.message);
            });
    },
    
    /**
     * Tüm kullanıcıları getir (Google Sheets'ten)
     */
    getAllUsers: async function() {
        try {
            if (!this.apiUrl) {
                console.warn('API URL yapilandirilmamis, localStorage kullaniliyor');
                return { success: true, users: this.getLocalUsers() };
            }
            
            const formData = new FormData();
            formData.append('action', 'getAllUsers');
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                // LocalStorage'ı güncelle
                this.saveLocalUsers(result.users);
                return result;
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Kullanici getirme hatasi:', error);
            // API hatası durumunda localStorage'dan getir
            return { success: true, users: this.getLocalUsers(), offline: true };
        }
    },
    
    /**
     * Kullanıcı adına göre kullanıcı getir
     */
    getUserByUsername: async function(username) {
        try {
            const formData = new FormData();
            formData.append('action', 'getUserByUsername');
            formData.append('data', JSON.stringify({ username: username }));
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            return await response.json();
            
        } catch (error) {
            console.error('Kullanici arama hatasi:', error);
            // LocalStorage'dan ara
            const users = this.getLocalUsers();
            const user = users.find(u => u.username === username);
            return user ? { success: true, user: user } : { success: false, error: 'Kullanici bulunamadi' };
        }
    },
    
    /**
     * Yeni kullanıcı kaydet
     */
    saveUser: async function(userData) {
        try {
            // Önce localStorage'a kaydet
            const localResult = this.saveLocalUser(userData);
            if (!localResult.success) {
                return localResult;
            }
            
            // API'ye gönder
            if (this.apiUrl) {
                const formData = new FormData();
                formData.append('action', 'saveUser');
                formData.append('data', JSON.stringify(userData));
                
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Kullanici Google Sheets\'e kaydedildi:', userData.username);
                    this.lastSyncTime = new Date();
                } else {
                    console.warn('⚠️ Google Sheets kayit hatasi:', result.error);
                }
                
                return result;
            }
            
            return { success: true, message: 'Kullanici local olarak kaydedildi', offline: true };
            
        } catch (error) {
            console.error('Kullanici kayit hatasi:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Kullanıcı güncelle
     */
    updateUser: async function(userData) {
        try {
            // Önce localStorage'ı güncelle
            this.updateLocalUser(userData);
            
            // API'ye gönder
            if (this.apiUrl) {
                const formData = new FormData();
                formData.append('action', 'updateUser');
                formData.append('data', JSON.stringify(userData));
                
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Kullanici guncellendi:', userData.username);
                }
                
                return result;
            }
            
            return { success: true, message: 'Kullanici local olarak guncellendi', offline: true };
            
        } catch (error) {
            console.error('Kullanici guncelleme hatasi:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Kullanıcı sil
     */
    deleteUser: async function(username) {
        try {
            // Önce localStorage'dan sil
            this.deleteLocalUser(username);
            
            // API'ye gönder
            if (this.apiUrl) {
                const formData = new FormData();
                formData.append('action', 'deleteUser');
                formData.append('data', JSON.stringify({ username: username }));
                
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Kullanici silindi:', username);
                }
                
                return result;
            }
            
            return { success: true, message: 'Kullanici local olarak silindi', offline: true };
            
        } catch (error) {
            console.error('Kullanici silme hatasi:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Local kullanıcıları Google Sheets'e senkronize et
     */
    syncLocalUsersToCloud: async function() {
        try {
            if (!this.apiUrl) {
                console.warn('API URL yapilandirilmamis, senkronizasyon yapilamadi');
                return { success: false, error: 'API URL yapilandirilmamis' };
            }
            
            const localUsers = this.getLocalUsers();
            
            if (localUsers.length === 0) {
                console.log('Senkronize edilecek local kullanici yok');
                return { success: true, message: 'Senkronize edilecek kullanici yok' };
            }
            
            const formData = new FormData();
            formData.append('action', 'syncUsers');
            formData.append('data', JSON.stringify({ users: localUsers }));
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.lastSyncTime = new Date();
                console.log('✅ Kullanicilar senkronize edildi:', result.results);
                
                // Başarılı senkronizasyon sonrası Google Sheets'ten güncel listeyi çek
                await this.getAllUsers();
            }
            
            return result;
            
        } catch (error) {
            console.error('Senkronizasyon hatasi:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Login doğrulama
     */
    validateLogin: async function(username, password) {
        try {
            if (!this.apiUrl) {
                // API yoksa localStorage'dan doğrula
                return this.validateLoginLocal(username, password);
            }
            
            const formData = new FormData();
            formData.append('action', 'validateLogin');
            formData.append('data', JSON.stringify({ username: username, password: password }));
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Login basarili:', username);
            }
            
            return result;
            
        } catch (error) {
            console.error('Login dogrulama hatasi:', error);
            // API hatası durumunda localStorage'dan doğrula
            return this.validateLoginLocal(username, password);
        }
    },
    
    // ==================== LOCAL STORAGE İŞLEMLERİ ====================
    
    /**
     * LocalStorage'dan kullanıcıları getir
     */
    getLocalUsers: function() {
        if (window.Utils && Utils.loadFromStorage) {
            return Utils.loadFromStorage(CONFIG.STORAGE_KEYS.USERS, []);
        }
        // Utils yoksa direkt localStorage'dan oku
        try {
            const data = localStorage.getItem('kojen_users');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },
    
    /**
     * LocalStorage'a kullanıcıları kaydet
     */
    saveLocalUsers: function(users) {
        if (window.Utils && Utils.saveToStorage) {
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.USERS, users);
        } else {
            try {
                localStorage.setItem('kojen_users', JSON.stringify(users));
            } catch (e) {
                console.error('LocalStorage kayit hatasi:', e);
            }
        }
    },
    
    /**
     * LocalStorage'a tek kullanıcı kaydet
     */
    saveLocalUser: function(userData) {
        const users = this.getLocalUsers();
        
        // Aynı kullanıcı adı var mı kontrol et
        if (users.find(u => u.username === userData.username)) {
            return { success: false, message: 'Bu kullanici adi zaten kayitli' };
        }
        
        // ID ve tarih ekle
        userData.id = userData.id || Date.now().toString();
        userData.createdAt = new Date().toLocaleString('tr-TR');
        userData.updatedAt = userData.createdAt;
        
        users.push(userData);
        this.saveLocalUsers(users);
        
        return { success: true, message: 'Kullanici local olarak eklendi' };
    },
    
    /**
     * LocalStorage'daki kullanıcıyı güncelle
     */
    updateLocalUser: function(userData) {
        let users = this.getLocalUsers();
        const index = users.findIndex(u => u.username === userData.username);
        
        if (index === -1) {
            return { success: false, message: 'Guncellenecek kullanici bulunamadi' };
        }
        
        users[index] = { ...users[index], ...userData, updatedAt: new Date().toLocaleString('tr-TR') };
        this.saveLocalUsers(users);
        
        return { success: true, message: 'Kullanici guncellendi' };
    },
    
    /**
     * LocalStorage'dan kullanıcı sil
     */
    deleteLocalUser: function(username) {
        let users = this.getLocalUsers();
        users = users.filter(u => u.username !== username);
        this.saveLocalUsers(users);
        
        return { success: true, message: 'Kullanici silindi' };
    },
    
    /**
     * LocalStorage'dan login doğrula
     */
    validateLoginLocal: function(username, password) {
        const users = this.getLocalUsers();
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            return {
                success: true,
                message: 'Giris basarili',
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name || user.username,
                    role: user.role || 'user',
                    status: user.status || 'active'
                }
            };
        }
        
        return { success: false, error: 'Kullanici adi veya sifre hatali' };
    }
};

// Global olarak erişilebilir yap
window.UserAPI = UserAPI;
