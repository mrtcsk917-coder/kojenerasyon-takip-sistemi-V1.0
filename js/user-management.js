/**
 * ============================================
 * KULLANICI YÖNETİMİ MODÜLÜ
 * ============================================
 * 
 * Kullanıcı ekleme, düzenleme, silme işlemlerini yönetir
 * UserAPI ile Google Sheets entegrasyonu sağlar
 */

const UserManagement = {
    // Mevcut kullanıcılar
    users: [],
    
    // Filtrelenmiş kullanıcılar
    filteredUsers: [],
    
    // Düzenlenmekte olan kullanıcı
    editingUser: null,
    
    // Silinecek kullanıcı
    deletingUser: null,
    
    /**
     * Modülü başlat
     */
    init: function() {
        console.log('👥 Kullanici Yonetimi baslatiliyor...');
        
        // UserAPI'yi başlat
        if (window.UserAPI) {
            UserAPI.init();
        }
        
        // Event listener'ları ayarla
        this.setupEventListeners();
        
        // Kullanıcıları yükle
        this.loadUsers();
        
        // Admin kontrolü
        this.checkAdminAccess();
    },
    
    /**
     * Admin erişim kontrolü
     */
    checkAdminAccess: function() {
        const currentUser = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.CURRENT_USER);
        
        if (!currentUser || currentUser.role !== 'admin') {
            // Sayfa içeriğini hemen gizle
            document.body.innerHTML = `
                <div style="
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-align: center;
                ">
                    <div>
                        <h1 style="font-size: 48px; margin-bottom: 20px;">🚫</h1>
                        <h2>Erişim Reddedildi</h2>
                        <p>Bu sayfaya sadece admin kullanıcılar erişebilir.</p>
                        <p style="margin-top: 30px; font-size: 14px; opacity: 0.8;">Ana sayfaya yönlendiriliyorsunuz...</p>
                    </div>
                </div>
            `;
            
            // Hemen yönlendir
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
            
            return false;
        }
        
        return true;
    },
    
    /**
     * Event listener'ları ayarla
     */
    setupEventListeners: function() {
        // Yeni kullanıcı butonu
        document.getElementById('add-user-btn')?.addEventListener('click', () => {
            this.openAddModal();
        });
        
        // Modal kapatma
        document.getElementById('close-modal')?.addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('cancel-btn')?.addEventListener('click', () => {
            this.closeModal();
        });
        
        // Form gönderme
        document.getElementById('user-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });
        
        // Şifre göster/gizle
        document.getElementById('toggle-password')?.addEventListener('click', () => {
            this.togglePasswordVisibility();
        });
        
        // Silme modalı
        document.getElementById('close-delete-modal')?.addEventListener('click', () => {
            this.closeDeleteModal();
        });
        
        document.getElementById('cancel-delete')?.addEventListener('click', () => {
            this.closeDeleteModal();
        });
        
        document.getElementById('confirm-delete')?.addEventListener('click', () => {
            this.confirmDelete();
        });
        
        // Yenile butonu
        document.getElementById('refresh-users-btn')?.addEventListener('click', () => {
            this.loadUsers();
        });
        
        // Senkronize butonu
        document.getElementById('sync-users-btn')?.addEventListener('click', () => {
            this.syncUsers();
        });
        
        // Filtreler
        document.getElementById('filter-role')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('filter-status')?.addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('search-users')?.addEventListener('input', () => {
            this.applyFilters();
        });
        
        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });
        
        // Modal dışına tıklama
        window.addEventListener('click', (e) => {
            if (e.target.id === 'user-modal') {
                this.closeModal();
            }
            if (e.target.id === 'delete-modal') {
                this.closeDeleteModal();
            }
        });
        
        // Klavye kısayolları
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeDeleteModal();
            }
        });
    },
    
    /**
     * Kullanıcıları yükle
     */
    loadUsers: async function() {
        this.showLoading(true);
        
        try {
            // Önce localStorage'dan yükle ve normalize et
            const localUsers = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.USERS, []);
            this.users = localUsers.map(u => this.normalizeUserData(u));
            this.filteredUsers = [...this.users];
            this.renderTable();
            this.updateStats();
            
            // Sonra Google Sheets'ten güncelle
            if (window.UserAPI && UserAPI.apiUrl) {
                const result = await UserAPI.getAllUsers();
                
                if (result.success && result.users) {
                    this.users = result.users.map(u => {
                        const normalized = this.normalizeUserData(u);
                        // Eski yonetici rolunu admin olarak degistir
                        if (normalized.role === 'yonetici') {
                            normalized.role = 'admin';
                        }
                        return normalized;
                    });
                    this.filteredUsers = [...this.users];
                    this.renderTable();
                    this.updateStats();
                    
                    // LocalStorage'ı güncelle
                    Utils.saveToStorage(CONFIG.STORAGE_KEYS.USERS, this.users);
                    
                    this.updateSyncStatus('success');
                }
            }
            
        } catch (error) {
            console.error('Kullanici yukleme hatasi:', error);
            this.showToast('❌ Kullanicilar yuklenirken hata olustu', 'error');
        } finally {
            this.showLoading(false);
        }
    },
    
    /**
     * Kullanıcı verisini normalize et
     */
    normalizeUserData: function(user) {
        const id = user.ID || user.id || Date.now().toString();
        return {
            id: typeof id === 'string' ? id : String(id),
            username: user.KullaniciAdi || user.username || '',
            password: user.Sifre || user.password || '',
            name: user.AdSoyad || user.name || '',
            role: user.Rol || user.role || 'user',
            status: user.Durum || user.status || 'active',
            createdAt: user.OlusturmaTarihi || user.createdAt || new Date().toLocaleString('tr-TR'),
            updatedAt: user.GuncellemeTarihi || user.updatedAt || ''
        };
    },
    
    /**
     * Tabloyu render et
     */
    renderTable: function() {
        const tbody = document.getElementById('users-table-body');
        
        if (!tbody) return;
        
        if (this.filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            <span class="empty-icon">📋</span>
                            <p>Kullanici bulunamadi</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.filteredUsers.map(user => this.createUserRow(user)).join('');
        
        // Düzenleme butonlarına event listener ekle
        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.closest('tr').dataset.username;
                this.openEditModal(username);
            });
        });
        
        // Silme butonlarına event listener ekle
        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.target.closest('tr').dataset.username;
                this.openDeleteModal(username);
            });
        });
    },
    
    /**
     * Kullanıcı satırı oluştur
     */
    createUserRow: function(user) {
        const roleClass = `role-${user.role}`;
        const roleIcon = this.getRoleIcon(user.role);
        const statusClass = `status-${user.status}`;
        const statusText = user.status === 'active' ? 'Aktif' : 'Pasif';
        const statusIcon = user.status === 'active' ? '✅' : '❌';
        
        return `
            <tr data-username="${user.username}">
                <td>${user.id ? user.id.substring(0, 8) + '...' : 'N/A'}</td>
                <td><strong>${user.username}</strong></td>
                <td>${user.name || '-'}</td>
                <td>
                    <span class="role-badge ${roleClass}">
                        ${roleIcon} ${this.capitalizeFirst(user.role)}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusIcon} ${statusText}
                    </span>
                </td>
                <td>${user.createdAt}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" title="Düzenle">
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" title="Sil" ${user.username === 'admin' ? 'disabled' : ''}>
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },
    
    /**
     * Rol ikonu getir
     */
    getRoleIcon: function(role) {
        const icons = {
            admin: '👑',
            operator: '⚙️',
            user: '👤'
        };
        return icons[role] || '👤';
    },
    
    /**
     * İlk harfi büyük yap
     */
    capitalizeFirst: function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },
    
    /**
     * İstatistikleri güncelle
     */
    updateStats: function() {
        document.getElementById('total-users').textContent = this.users.length;
        document.getElementById('active-users').textContent = this.users.filter(u => u.status === 'active').length;
        document.getElementById('admin-users').textContent = this.users.filter(u => u.role === 'admin').length;
    },
    
    /**
     * Senkronizasyon durumunu güncelle
     */
    updateSyncStatus: function(status) {
        const el = document.getElementById('sync-status');
        if (!el) return;
        
        if (status === 'success') {
            const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            el.textContent = now;
            el.style.color = '#10b981';
        } else if (status === 'error') {
            el.textContent = 'Hata';
            el.style.color = '#dc2626';
        }
    },
    
    /**
     * Filtreleri uygula
     */
    applyFilters: function() {
        const roleFilter = document.getElementById('filter-role').value;
        const statusFilter = document.getElementById('filter-status').value;
        const searchTerm = document.getElementById('search-users').value.toLowerCase();
        
        this.filteredUsers = this.users.filter(user => {
            const matchRole = !roleFilter || user.role === roleFilter;
            const matchStatus = !statusFilter || user.status === statusFilter;
            const matchSearch = !searchTerm || 
                user.username.toLowerCase().includes(searchTerm) ||
                user.name?.toLowerCase().includes(searchTerm);
            
            return matchRole && matchStatus && matchSearch;
        });
        
        this.renderTable();
    },
    
    /**
     * Filtreleri temizle
     */
    clearFilters: function() {
        document.getElementById('filter-role').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('search-users').value = '';
        
        this.filteredUsers = [...this.users];
        this.renderTable();
    },
    
    /**
     * Yeni kullanıcı modalını aç
     */
    openAddModal: function() {
        this.editingUser = null;
        document.getElementById('modal-title').textContent = '➕ Yeni Kullanıcı Ekle';
        document.getElementById('user-form').reset();
        document.getElementById('user-id').value = '';
        
        // Şifre alanını zorunlu yap
        document.getElementById('user-password').required = true;
        
        this.openModal();
    },
    
    /**
     * Düzenleme modalını aç
     */
    openEditModal: function(username) {
        const user = this.users.find(u => u.username === username);
        if (!user) return;
        
        this.editingUser = user;
        document.getElementById('modal-title').textContent = '✏️ Kullanıcı Düzenle';
        
        // Form alanlarını doldur
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-username').value = user.username;
        document.getElementById('user-username').readOnly = true;
        document.getElementById('user-password').value = '';
        document.getElementById('user-password').placeholder = 'Değiştirmek için yeni şifre girin';
        document.getElementById('user-password').required = false;
        document.getElementById('user-name').value = user.name || '';
        document.getElementById('user-role').value = user.role;
        document.getElementById('user-status').value = user.status;
        
        this.openModal();
    },
    
    /**
     * Modalı aç
     */
    openModal: function() {
        document.getElementById('user-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Modalı kapat
     */
    closeModal: function() {
        document.getElementById('user-modal').classList.remove('active');
        document.body.style.overflow = '';
        document.getElementById('user-username').readOnly = false;
    },
    
    /**
     * Silme modalını aç
     */
    openDeleteModal: function(username) {
        this.deletingUser = username;
        document.getElementById('delete-username').textContent = username;
        document.getElementById('delete-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Silme modalını kapat
     */
    closeDeleteModal: function() {
        document.getElementById('delete-modal').classList.remove('active');
        document.body.style.overflow = '';
        this.deletingUser = null;
    },
    
    /**
     * Kullanıcı kaydet
     */
    saveUser: async function() {
        const userData = {
            id: document.getElementById('user-id').value || Date.now().toString(),
            username: document.getElementById('user-username').value.trim(),
            password: document.getElementById('user-password').value,
            name: document.getElementById('user-name').value.trim(),
            role: document.getElementById('user-role').value,
            status: document.getElementById('user-status').value
        };
        
        // Validasyon
        if (!userData.username || !userData.role) {
            this.showToast('❌ Kullanici adi ve rol zorunlu!', 'error');
            return;
        }
        
        // Yeni kullanıcıda şifre kontrolü
        if (!this.editingUser && !userData.password) {
            this.showToast('❌ Sifre zorunlu!', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            let result;
            
            if (this.editingUser) {
                // Güncelleme
                // Şifre boşsa mevcut şifreyi koru
                if (!userData.password) {
                    userData.password = this.editingUser.password;
                }
                
                result = await UserAPI.updateUser(userData);
                
                if (result.success) {
                    this.showToast('✅ Kullanici guncellendi', 'success');
                }
            } else {
                // Yeni kullanıcı
                result = await UserAPI.saveUser(userData);
                
                if (result.success) {
                    this.showToast('✅ Kullanici eklendi', 'success');
                }
            }
            
            if (result.success) {
                // ✅ Google Sheets başarılı - LocalStorage'a da kaydet
                this.saveUserToLocalStorage(userData);
                
                this.closeModal();
                await this.loadUsers();
            } else {
                this.showToast('❌ ' + (result.error || 'Bir hata olustu'), 'error');
            }
            
        } catch (error) {
            console.error('Kaydetme hatasi:', error);
            this.showToast('❌ Kaydetme sirasinda hata olustu', 'error');
        } finally {
            this.showLoading(false);
        }
    },

    /**
     * Kullanıcıyı LocalStorage'a kaydet
     */
    saveUserToLocalStorage: function(userData) {
        try {
            // Mevcut kullanıcıları al
            const users = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.USERS, []);
            
            // Eğer düzenleme yapılmıyorsa, aynı kullanıcı adı var mı kontrol et
            if (!this.editingUser) {
                const existingUser = users.find(u => u.username === userData.username);
                if (existingUser) {
                    console.warn('⚠️ Bu kullanıcı adı LocalStorage\'da zaten var:', userData.username);
                    return;
                }
            }
            
            // Kullanıcıyı ekle/güncelle
            if (this.editingUser) {
                // Güncelleme
                const index = users.findIndex(u => u.id === userData.id);
                if (index !== -1) {
                    users[index] = userData;
                }
            } else {
                // Yeni kullanıcı
                users.push(userData);
            }
            
            // Kaydet
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.USERS, users);
            console.log('✅ Kullanıcı LocalStorage\'a kaydedildi:', userData.username);
            
        } catch (error) {
            console.error('❌ LocalStorage kaydetme hatası:', error);
        }
    },
    
    /**
     * Silme işlemini onayla
     */
    confirmDelete: async function() {
        if (!this.deletingUser) return;
        
        this.showLoading(true);
        
        try {
            const result = await UserAPI.deleteUser(this.deletingUser);
            
            if (result.success) {
                this.showToast('✅ Kullanici silindi', 'success');
                this.closeDeleteModal();
                await this.loadUsers();
            } else {
                this.showToast('❌ ' + (result.error || 'Silme sirasinda hata'), 'error');
            }
            
        } catch (error) {
            console.error('Silme hatasi:', error);
            this.showToast('❌ Silme sirasinda hata olustu', 'error');
        } finally {
            this.showLoading(false);
        }
    },
    
    /**
     * Kullanıcıları senkronize et
     */
    syncUsers: async function() {
        this.showLoading(true);
        
        try {
            const result = await UserAPI.syncLocalUsersToCloud();
            
            if (result.success) {
                this.showToast('✅ Kullanicilar senkronize edildi', 'success');
                this.updateSyncStatus('success');
                await this.loadUsers();
            } else {
                this.showToast('❌ Senkronizasyon hatasi: ' + (result.error || ''), 'error');
                this.updateSyncStatus('error');
            }
            
        } catch (error) {
            console.error('Senkronizasyon hatasi:', error);
            this.showToast('❌ Senkronizasyon sirasinda hata', 'error');
            this.updateSyncStatus('error');
        } finally {
            this.showLoading(false);
        }
    },
    
    /**
     * Şifre görünürlüğünü toggle et
     */
    togglePasswordVisibility: function() {
        const input = document.getElementById('user-password');
        const icon = document.querySelector('#toggle-password .eye-icon');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = '🙈';
        } else {
            input.type = 'password';
            icon.textContent = '👁️';
        }
    },
    
    /**
     * Toast bildirimi göster
     */
    showToast: function(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    },
    
    /**
     * Yükleme göstergesini toggle et
     */
    showLoading: function(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    UserManagement.init();
});

// Global olarak erişilebilir yap
window.UserManagement = UserManagement;
