/**
 * KOJENERASYON TAKIP SISTEMI - AUTH
 * Kimlik dogrulama ve oturum yonetimi
 */

const Auth = {
    /**
     * Kullanici listesini baslat
     */
    init: function() {
        // UserAPI'yi başlat
        if (window.UserAPI) {
            UserAPI.init();
        }
        
        // Varsayılan kullanıcıları kontrol et (sadece hiç kullanıcı yoksa)
        const users = this.getUsers();
        if (!users || users.length === 0) {
            // Varsayilan kullanicilari kaydet
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.USERS, CONFIG.DEFAULT_USERS);
            
            // Google Sheets'e de kaydet
            if (window.UserAPI && UserAPI.apiUrl) {
                CONFIG.DEFAULT_USERS.forEach(user => {
                    UserAPI.saveUser(user);
                });
            }
        }
    },

    /**
     * Operatör rolündeki kullanıcıları al
     */
    getOperators: function() {
        // Önce UserAPI'den dene
        if (window.UserAPI && UserAPI.isOnline) {
            // Asenkron olduğu için Promise döndürebiliriz
            // Ama şimdilik senkron çalışması için localStorage kullanalım
        }
        
        // LocalStorage'dan operator rollü kullanıcıları getir
        const users = this.getUsers();
        const operators = users.filter(user => user.role === 'operator')
            .map(user => ({
                name: user.name || user.username,
                role: 'operator'
            }));
        
        // Eğer hiç operator yoksa sabit listeyi kullan
        if (operators.length === 0 && window.CONFIG && CONFIG.FIXED_OPERATORS) {
            return CONFIG.FIXED_OPERATORS.map(name => ({
                name: name,
                role: 'operator'
            }));
        }
        
        return operators;
    },

    /**
     * Kullanici listesini al
     */
    getUsers: function() {
        return Utils.loadFromStorage(CONFIG.STORAGE_KEYS.USERS, []);
    },

    /**
     * Kullanici ekle
     */
    /**
 * Kullanici ekle
 */
    addUser: async function(user) {
        const users = this.getUsers();
        
        // Ayni kullanici adi var mi kontrol et
        if (users.find(u => u.username === user.username)) {
            return { success: false, message: 'Bu kullanici adi zaten kayitli' };
        }
        
        // ID ekle
        user.id = user.id || Date.now().toString();
        
        // LocalStorage'a kaydet
        users.push(user);
        Utils.saveToStorage(CONFIG.STORAGE_KEYS.USERS, users);
        
        // Google Sheets'e de kaydet (asenkron)
        if (window.UserAPI && UserAPI.apiUrl) {
            UserAPI.saveUser(user).then(result => {
                if (result.success) {
                    console.log('✅ Kullanici Google Sheets\'e de kaydedildi');
                }
            });
        }
        
        return { success: true, message: 'Kullanici eklendi' };
    },

    /**
     * Giris yap
     */
    /**
 * Giriş yap
 */
    login: async function(username, password, rememberMe = false) {
        // UserAPI ile dene
        if (window.UserAPI && UserAPI.apiUrl) {
            try {
                const result = await UserAPI.validateLogin(username, password);
                
                if (result.success) {
                    // ✅ BAŞARILI - Oturum bilgilerini kaydet
                    Utils.saveToStorage(CONFIG.STORAGE_KEYS.CURRENT_USER, result.user);
                    
                    if (rememberMe) {
                        localStorage.setItem(CONFIG.STORAGE_KEYS.REMEMBER_ME, username);
                    } else {
                        localStorage.removeItem(CONFIG.STORAGE_KEYS.REMEMBER_ME);
                    }
                    
                    // ✅ Toast'u BURADA göster (sadece 1 kere)
                    Utils.showToast('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
                    
                    setTimeout(() => {
                        this.showApp();
                    }, 500);
                    
                    return { success: true, user: result.user };
                } else {
                    // ❌ BAŞARISIZ
                    Utils.showToast(result.message || 'Giriş başarısız', 'error');
                    return { success: false, message: result.message || 'Giriş başarısız' };
                }
            } catch (error) {
                console.warn('UserAPI login hatası, localStorage deneniyor:', error);
                // LocalStorage'a düş
            }
        }
        
        // LocalStorage'dan dene (offline durumunda)
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.CURRENT_USER, user);
            
            if (rememberMe) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.REMEMBER_ME, username);
            } else {
                localStorage.removeItem(CONFIG.STORAGE_KEYS.REMEMBER_ME);
            }
            
            Utils.showToast('Giriş başarılı! (Offline mod)', 'success');
            return { success: true, user: user };
        }
        
        Utils.showToast('Kullanıcı adı veya şifre hatalı', 'error');
        return { success: false, message: 'Kullanıcı adı veya şifre hatalı', error: 'Kullanıcı adı veya şifre hatalı' };
    },

    /**
     * Cikis yap
     */
    logout: function() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.CURRENT_USER);
        return true;
    },

    /**
     * Mevcut kullaniciyi al
     */
    getCurrentUser: function() {
        return Utils.loadFromStorage(CONFIG.STORAGE_KEYS.CURRENT_USER);
    },

    /**
     * Oturum kontrolu
     */
    isLoggedIn: function() {
        return this.getCurrentUser() !== null;
    },

    /**
     * Beni hatirla kontrolu
     */
    getRememberedUser: function() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.REMEMBER_ME);
    },

    /**
     * Sifre degistir
     */
    changePassword: function(username, currentPassword, newPassword) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.username === username && u.password === currentPassword);
        
        if (userIndex === -1) {
            return { success: false, message: 'Mevcut sifre hatali' };
        }
        
        users[userIndex].password = newPassword;
        Utils.saveToStorage(CONFIG.STORAGE_KEYS.USERS, users);
        
        // Mevcut oturum kullanicisiysa guncelle
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.username === username) {
            currentUser.password = newPassword;
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.CURRENT_USER, currentUser);
        }
        
        return { success: true, message: 'Sifre degistirildi' };
    },

    /**
     * Sifre sifirla (demo)
     */
    resetPassword: function(username, email) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return { success: false, message: 'Kullanici bulunamadi' };
        }
        
        // Gercek uygulamada e-posta gonderilir
        // Demo: sifreyi varsayilan sifreye sifirla
        user.password = 'sifre123';
        Utils.saveToStorage(CONFIG.STORAGE_KEYS.USERS, users);
        
        return { success: true, message: `Sifre "sifre123" olarak sifirlandi` };
    },

    /**
     * Caps Lock durumunu kontrol et
     */
    checkCapsLock: function(e) {
        e = e || window.event;
        const charCode = e.which ? e.which : e.keyCode;
        
        // Shift tuşu basılı mı?
        const shiftPressed = e.shiftKey;
        
        // Harf mi ve büyük harf mi?
        if (charCode >= 65 && charCode <= 90) {
            // Büyük harf ve shift basılı değilse Caps Lock açık
            return !shiftPressed;
        }
        
        // Küçük harf ve shift basılıysa Caps Lock açık
        if (charCode >= 97 && charCode <= 122) {
            return shiftPressed;
        }
        
        return false;
    },

    /**
     * Giriş formu event listener'larını ayarla
     */
    setupLoginForm: function() {
        const loginForm = document.getElementById('login-form');
        const forgotLink = document.getElementById('forgot-password');
        const forgotModal = document.getElementById('forgot-modal');
        const closeForgot = document.getElementById('close-forgot');
        const sendResetBtn = document.getElementById('send-reset-btn');
        const togglePassword = document.getElementById('toggle-password');
        const passwordInput = document.getElementById('password');
        
        // Beni hatirla kontrolu
        const remembered = this.getRememberedUser();
        if (remembered) {
            document.getElementById('username').value = remembered;
            document.getElementById('remember-me').checked = true;
        }
        
        // Sifre goster/gizle
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                const eyeIcon = togglePassword.querySelector('.eye-icon');
                if (eyeIcon) {
                    eyeIcon.textContent = type === 'password' ? '👁️' : '🙈';
                }
            });
        }
        
        // Caps Lock uyarısı için password input dinleyicisi
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (this.checkCapsLock(e)) {
                    Utils.showToast('Caps Lock açık! Şifreniz büyük harflerle yazılabilir.', 'warning');
                }
            });
            
            passwordInput.addEventListener('keydown', (e) => {
                if (e.key === 'CapsLock') {
                    setTimeout(() => {
                        const capsLockOn = this.checkCapsLock({ 
                            which: 65, 
                            shiftKey: e.getModifierState('Shift') 
                        });
                        if (capsLockOn) {
                            Utils.showToast('Caps Lock açık!', 'warning');
                        }
                    }, 100);
                }
            });
        }
        
        // Giris formu submit - ŞU ANDAKİ KODU:
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Caps Lock kontrolü
                if (this.checkCapsLock(event)) {
                    Utils.showToast('Caps Lock açık! Şifreniz büyük harflerle yazılabilir.', 'warning');
                    return;
                }
                
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value;
                const rememberMe = document.getElementById('remember-me').checked;
                
                // Login fonksiyonu zaten toast gösteriyor, burada tekrar gösterme
                const result = await this.login(username, password, rememberMe);
                
                if (result.success) {
                    setTimeout(() => {
                        this.showApp();
                    }, 500);
                }
                // Hata durumunda toast zaten login içinde gösterildi
            });
        }
        
        // Sifremi unuttum modal
        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                forgotModal.classList.remove('hidden');
            });
        }
        
        if (closeForgot) {
            closeForgot.addEventListener('click', () => {
                forgotModal.classList.add('hidden');
            });
        }
        
        // Sifre sifirlama gonder
        if (sendResetBtn) {
            sendResetBtn.addEventListener('click', () => {
                const username = document.getElementById('forgot-username').value.trim();
                const email = document.getElementById('forgot-email').value.trim();
                
                if (!username || !email) {
                    document.getElementById('forgot-message').textContent = 'Tum alanlari doldurun';
                    document.getElementById('forgot-message').className = 'message error';
                    return;
                }
                
                const result = this.resetPassword(username, email);
                document.getElementById('forgot-message').textContent = result.message;
                document.getElementById('forgot-message').className = result.success ? 'message success' : 'message error';
                
                if (result.success) {
                    setTimeout(() => {
                        forgotModal.classList.add('hidden');
                    }, 2000);
                }
            });
        }
        
        // Cikis butonu
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
                this.showLogin();
                Utils.showToast('Cikis yapildi', 'success');
            });
        }
    },

    /**
     * Admin menüsünü göster/gizle
     */
    toggleAdminMenu: function() {
        const currentUser = this.getCurrentUser();
        const adminMenuItems = document.querySelectorAll('.nav-admin-only');
        
        adminMenuItems.forEach(item => {
            if (currentUser && currentUser.role === 'admin') {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    },

    /**
     * Uygulamayi goster (giris yapildi)
     */
    showApp: function() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return;
        
        // Login container'i gizle, app container'i goster
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        
        // Kullanici bilgilerini goster
        document.getElementById('user-info').textContent = `Hos geldiniz, ${currentUser.name}`;
        
        // Admin menüsünü kontrol et
        this.toggleAdminMenu();
        
        // Dashboard'i yukle
        if (window.Dashboard) {
            Dashboard.init();
        }
    },

    /**
     * Giris ekranini goster
     */
    showLogin: function() {
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('login-container').classList.remove('hidden');
        
        // Formu temizle
        document.getElementById('login-form').reset();
        
        // Beni hatirla varsa kullanici adini doldur
        const remembered = this.getRememberedUser();
        if (remembered) {
            document.getElementById('username').value = remembered;
            document.getElementById('remember-me').checked = true;
        }
    },

    /**
     * Uygulama baslangic kontrolu
     */
    checkAuth: function() {
        this.init();
        
        if (this.isLoggedIn()) {
            this.showApp();
        } else {
            this.showLogin();
        }
    }
};

// Auth'u global olarak erisilebilir yap
window.Auth = Auth;
