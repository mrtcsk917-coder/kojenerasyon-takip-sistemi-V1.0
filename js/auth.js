/**
 * KOJENERASYON TAKIP SISTEMI - AUTH
 * Kimlik dogrulama ve oturum yonetimi
 */

const Auth = {
    /**
     * Kullanici listesini baslat
     */
    init: function() {
        const users = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.USERS);
        if (!users || users.length === 0) {
            // Varsayilan kullanicilari kaydet
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.USERS, CONFIG.DEFAULT_USERS);
        }
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
    addUser: function(user) {
        const users = this.getUsers();
        // Ayni kullanici adi var mi kontrol et
        if (users.find(u => u.username === user.username)) {
            return { success: false, message: 'Bu kullanici adi zaten kayitli' };
        }
        users.push(user);
        Utils.saveToStorage(CONFIG.STORAGE_KEYS.USERS, users);
        return { success: true, message: 'Kullanici eklendi' };
    },

    /**
     * Giris yap
     */
    login: function(username, password, rememberMe = false) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            // Oturum bilgilerini kaydet
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.CURRENT_USER, user);
            
            if (rememberMe) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.REMEMBER_ME, username);
            } else {
                localStorage.removeItem(CONFIG.STORAGE_KEYS.REMEMBER_ME);
            }
            
            return { success: true, user: user };
        }
        
        return { success: false, message: 'Kullanici adi veya sifre hatali' };
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
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                togglePassword.querySelector('.eye-icon').textContent = type === 'password' ? '👁️' : '🙈';
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
        
        // Giris formu submit
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Caps Lock kontrolü
                if (this.checkCapsLock(event)) {
                    Utils.showToast('Caps Lock açık! Şifreniz büyük harflerle yazılabilir.', 'warning');
                    return;
                }
                
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value;
                const rememberMe = document.getElementById('remember-me').checked;
                
                const result = this.login(username, password, rememberMe);
                
                if (result.success) {
                    Utils.showToast('Giris basarili! Yonlendiriliyorsunuz...', 'success');
                    setTimeout(() => {
                        this.showApp();
                    }, 500);
                } else {
                    Utils.showToast(result.message, 'error');
                }
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
