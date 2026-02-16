/**
 * Bakım Takibi Modülü - Yeni Tasarım
 */
const BakimTakibi = {
    
    /**
     * Admin yetkisi
     */
    isAdmin: false,
    
    /**
     * Modülü başlat
     */
    init: function() {
        this.checkAdminAccess();
        this.loadStatistics();
        this.setupEventListeners();
    },

    /**
     * Admin erişimini kontrol et
     */
    checkAdminAccess: function() {
        // LocalStorage'dan admin durumunu kontrol et
        const adminStatus = Utils.loadFromStorage('admin_status', false);
        const currentUser = Auth.getCurrentUser();
        
        // Sadece admin ve yönetici erişebilir - operator engellendi
        if (currentUser && (currentUser.username === 'admin' || currentUser.username === 'yönetici' || currentUser.role === 'admin' || currentUser.role === 'yönetici' || adminStatus)) {
            this.isAdmin = true;
            this.showMaintenanceCards();
        } else {
            this.isAdmin = false;
            this.showAdminLock();
        }
    },

    /**
     * Admin giriş kontrolü
     */
    checkAdmin: function() {
        const password = prompt('Yönetici şifrenizi girin:');
        
        // Demo şifre: 'admin123' veya 'yonetici123'
        if (password === 'admin123' || password === 'yonetici123') {
            this.isAdmin = true;
            Utils.saveToStorage('admin_status', true);
            Utils.showToast('Yönetici girişi başarılı', 'success');
            this.showMaintenanceCards();
            this.loadStatistics();
        } else if (password !== null) {
            Utils.showToast('Yanlış şifre', 'error');
        }
    },

    /**
     * Bakım kartlarını göster
     */
    showMaintenanceCards: function() {
        const cards = document.querySelector('.maintenance-cards');
        const adminCheck = document.getElementById('admin-check');
        
        if (cards) {
            cards.style.display = 'grid';
        }
        if (adminCheck) {
            adminCheck.style.display = 'none';
        }
    },

    /**
     * Admin kilidi göster
     */
    showAdminLock: function() {
        const cards = document.querySelector('.maintenance-cards');
        const adminCheck = document.getElementById('admin-check');
        
        if (cards) {
            cards.style.display = 'none';
        }
        if (adminCheck) {
            adminCheck.style.display = 'flex';
        }
    },

    /**
     * İstatistikleri yükle
     */
    loadStatistics: function() {
        if (!this.isAdmin) return;

        // Arıza verilerini al
        const arizaData = Utils.loadFromStorage('ariza_data', []);
        
        // Periyodik bakım istatistikleri
        const periodikData = arizaData.filter(b => b.turu === 'periyodik');
        const periodikActive = periodikData.filter(b => b.durum !== 'tamamlandi' && b.durum !== 'cozuldu').length;
        const periodikCompleted = periodikData.filter(b => b.durum === 'tamamlandi' || b.durum === 'cozuldu').length;
        
        document.getElementById('periodik-count').textContent = periodikActive;
        document.getElementById('periodik-completed').textContent = periodikCompleted;

        // Normal bakım istatistikleri
        const normalData = arizaData.filter(b => b.turu === 'normal');
        const normalActive = normalData.filter(b => b.durum === 'devam' || b.durum === 'aktif').length;
        const normalPending = normalData.filter(b => b.durum === 'planlandi' || !b.durum).length;
        
        document.getElementById('normal-count').textContent = normalActive;
        document.getElementById('normal-pending').textContent = normalPending;

        // Arıza bakım istatistikleri
        const arizaDataFiltered = arizaData.filter(b => b.turu === 'ariza');
        const arizaActive = arizaDataFiltered.filter(b => b.durum === 'aktif' || !b.durum).length;
        const arizaResolved = arizaDataFiltered.filter(b => b.durum === 'cozuldu' || b.durum === 'tamamlandi').length;
        
        document.getElementById('ariza-count').textContent = arizaActive;
        document.getElementById('ariza-resolved').textContent = arizaResolved;

        // Debug için konsola yazdır
        console.log('Bakım İstatistikleri:', {
            totalRecords: arizaData.length,
            periodik: { active: periodikActive, completed: periodikCompleted },
            normal: { active: normalActive, pending: normalPending },
            ariza: { active: arizaActive, resolved: arizaResolved }
        });
    },

    /**
     * Event listener'ları ayarla
     */
    setupEventListeners: function() {
        // Sayfa değişiminde istatistikleri güncelle
        document.addEventListener('pageChanged', () => {
            if (this.isAdmin) {
                this.loadStatistics();
            }
        });
    },

    /**
     * Periyodik bakım yönetimini aç
     */
    openPeriodik: function() {
        if (!this.isAdmin) {
            Utils.showToast('Admin yetkisi gerekiyor', 'warning');
            return;
        }

        // Modal veya yeni sayfa açılacak
        this.showMaintenanceModal('periodik');
    },

    /**
     * Normal bakım yönetimini aç
     */
    openNormal: function() {
        if (!this.isAdmin) {
            Utils.showToast('Admin yetkisi gerekiyor', 'warning');
            return;
        }

        this.showMaintenanceModal('normal');
    },

    /**
     * Arıza bakım yönetimini aç
     */
    openAriza: function() {
        if (!this.isAdmin) {
            Utils.showToast('Admin yetkisi gerekiyor', 'warning');
            return;
        }

        this.showMaintenanceModal('ariza');
    },

    /**
     * Bakım modal'ını göster
     */
    showMaintenanceModal: function(type) {
        // Modal HTML'i oluştur
        const modal = this.createMaintenanceModal(type);
        document.body.appendChild(modal);
        
        // Modal'ı göster
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        // Event listener'ları ekle
        this.setupModalEvents(modal, type);
    },

    /**
     * Bakım modal'ı oluştur
     */
    createMaintenanceModal: function(type) {
        const modal = document.createElement('div');
        modal.className = 'maintenance-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="BakimTakibi.closeModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${this.getModalTitle(type)}</h2>
                    <button class="modal-close" onclick="BakimTakibi.closeModal()">×</button>
                </div>
                <div class="modal-body">
                    ${this.getModalContent(type)}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="BakimTakibi.closeModal()">Kapat</button>
                    <button class="btn-primary" onclick="BakimTakibi.saveMaintenance('${type}')">Kaydet</button>
                </div>
            </div>
        `;
        return modal;
    },

    /**
     * Modal başlığı al
     */
    getModalTitle: function(type) {
        const titles = {
            'periodik': '🔄 Periyodik Bakım',
            'normal': '🔧 Normal Bakım',
            'ariza': '⚠️ Arıza Bakım'
        };
        return titles[type] || 'Bakım';
    },

    /**
     * Modal içeriği al
     */
    getModalContent: function(type) {
        return `
            <form id="maintenance-form-${type}" class="maintenance-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Tarih</label>
                        <input type="date" id="tarih-${type}" required>
                    </div>
                    <div class="form-group">
                        <label>Motor</label>
                        <select id="motor-${type}" required>
                            <option value="">Seçiniz</option>
                            <option value="GM1">GM1 - JENBACH 1</option>
                            <option value="GM2">GM2 - JENBACH 2</option>
                            <option value="GM3">GM3 - JENBACH 3</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Durum</label>
                        <select id="durum-${type}" required>
                            <option value="">Seçiniz</option>
                            ${this.getStatusOptions(type)}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>${type === 'periodik' ? 'Bakım Saati' : (type === 'normal' ? 'Bakım Tipi' : 'Öncelik')}</label>
                        <select id="oncelik-${type}">
                            ${type === 'periodik' ? this.getBakimSaatiOptions() : (type === 'normal' ? this.getBakimTipiOptions() : this.getOncelikOptions())}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Açıklama</label>
                    <textarea id="aciklama-${type}" rows="4" placeholder="Bakım açıklamasını girin..." style="color: black;"></textarea>
                </div>
                <div class="form-group">
                    <label>Yapılan İşlemler</label>
                    <textarea id="islemler-${type}" rows="3" placeholder="Yapılan işlemleri girin..." style="color: black;"></textarea>
                </div>
                <div class="form-group">
                    <label>Sorumlu Personel</label>
                    <input type="text" id="personel-${type}" placeholder="Sorumlu personeli girin..." style="color: black;">
                </div>
                
                <!-- Dosya Ekleme Alanı -->
                <div class="form-group">
                    <label>Dosya Ekle</label>
                    <div class="file-upload-container">
                        <input type="file" id="dosya-${type}" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls">
                        <div class="file-upload-label">
                            <span class="upload-icon">📁</span>
                            <span class="upload-text">Dosya seçin veya sürükleyin</span>
                            <span class="upload-hint">PDF, DOC, JPG, PNG, XLS (Max 10MB)</span>
                        </div>
                        <div class="file-list" id="file-list-${type}">
                            <!-- Seçilen dosyalar burada gösterilecek -->
                        </div>
                    </div>
                </div>
            </form>
            <div class="maintenance-list" id="maintenance-list-${type}">
                <h3>Mevcut Kayıtlar</h3>
                <div class="list-content">
                    ${this.getMaintenanceList(type)}
                </div>
            </div>
        `;
    },

    /**
     * Bakım saati seçeneklerini al
     */
    getBakimSaatiOptions: function() {
        return `
            <option value="2000">2000 Saat</option>
            <option value="6000">6000 Saat</option>
            <option value="10000">10000 Saat</option>
            <option value="20000">20000 Saat</option>
            <option value="30000">30000 Saat</option>
        `;
    },

    /**
     * Bakım tipi seçeneklerini al
     */
    getBakimTipiOptions: function() {
        return `
            <option value="mekanik">Mekanik Bakım</option>
            <option value="elektrik">Elektrik Bakımı</option>
            <option value="elektronik">Elektronik Bakım</option>
            <option value="yag">Yağ Değişimi</option>
            <option value="filtre">Filtre Değişimi</option>
            <option value="kontrol">Kontrol ve Ayar</option>
            <option value="temizlik">Temizlik Bakımı</option>
            <option value="diger">Diğer</option>
        `;
    },

    /**
     * Öncelik seçeneklerini al
     */
    getOncelikOptions: function() {
        return `
            <option value="dusuk">Düşük</option>
            <option value="orta">Orta</option>
            <option value="yuksek">Yüksek</option>
            <option value="acil">Acil</option>
        `;
    },

    /**
     * Durum seçeneklerini al
     */
    getStatusOptions: function(type) {
        const options = {
            'periodik': `
                <option value="planlandi">Planlandı</option>
                <option value="devam">Devam Ediyor</option>
                <option value="tamamlandi">Tamamlandı</option>
                <option value="ertelendi">Ertelendi</option>
            `,
            'normal': `
                <option value="planlandi">Planlandı</option>
                <option value="devam">Devam Ediyor</option>
                <option value="tamamlandi">Tamamlandı</option>
                <option value="iptal">İptal</option>
            `,
            'ariza': `
                <option value="aktif">Aktif</option>
                <option value="cozuluyor">Çözülüyor</option>
                <option value="cozuldu">Çözüldü</option>
                <option value="bekleme">Beklemede</option>
            `
        };
        return options[type] || '';
    },

    /**
     * Mevcut bakım listesini al
     */
    getMaintenanceList: function(type) {
        const data = Utils.loadFromStorage(`${type}_bakim`, []);
        
        if (data.length === 0) {
            return '<p class="empty-message">Henüz kayıt bulunmuyor.</p>';
        }

        return data.map(item => `
            <div class="maintenance-item ${item.durum}">
                <div class="item-header">
                    <span class="item-date">${item.tarih}</span>
                    <span class="item-motor">${item.motor}</span>
                    <span class="item-status status-${item.durum}">${this.getStatusText(item.durum)}</span>
                </div>
                <div class="item-content">
                    <p class="item-description">${item.aciklama}</p>
                    ${item.islemler ? `<p class="item-islemler"><strong>İşlemler:</strong> ${item.islemler}</p>` : ''}
                    ${item.personel ? `<p class="item-personel"><strong>Sorumlu:</strong> ${item.personel}</p>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn-small btn-edit" onclick="BakimTakibi.editMaintenance('${type}', '${item.id}')">Düzenle</button>
                    <button class="btn-small btn-delete" onclick="BakimTakibi.deleteMaintenance('${type}', '${item.id}')">Sil</button>
                </div>
            </div>
        `).join('');
    },

    /**
     * Durum metnini al
     */
    getStatusText: function(status) {
        const statusTexts = {
            'planlandi': 'Planlandı',
            'devam': 'Devam Ediyor',
            'tamamlandi': 'Tamamlandı',
            'ertelendi': 'Ertelendi',
            'iptal': 'İptal',
            'aktif': 'Aktif',
            'cozuluyor': 'Çözülüyor',
            'cozuldu': 'Çözüldü',
            'bekleme': 'Beklemede'
        };
        return statusTexts[status] || status;
    },

    /**
     * Modal event'larını ayarla
     */
    setupModalEvents: function(modal, type) {
        // Formu doldur
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;
        
        const tarihInput = document.getElementById(`tarih-${type}`);
        if (tarihInput) {
            tarihInput.value = todayString;
            tarihInput.max = todayString;
        }

        // Dosya yükleme event'ları
        this.setupFileUpload(type);
    },

    /**
     * Dosya yükleme ayarları
     */
    setupFileUpload: function(type) {
        const fileInput = document.getElementById(`dosya-${type}`);
        const fileList = document.getElementById(`file-list-${type}`);
        const uploadLabel = fileInput.nextElementSibling;

        if (!fileInput || !fileList) return;

        // Dosya seçildiğinde
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files, fileList, type);
        });

        // Drag and drop
        uploadLabel.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadLabel.classList.add('drag-over');
        });

        uploadLabel.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadLabel.classList.remove('drag-over');
        });

        uploadLabel.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadLabel.classList.remove('drag-over');
            this.handleFileSelect(e.dataTransfer.files, fileList, type);
        });
    },

    /**
     * Dosya seçimi işle
     */
    handleFileSelect: function(files, fileList, type) {
        fileList.innerHTML = '';
        
        Array.from(files).forEach(file => {
            if (this.validateFile(file)) {
                this.createFileItem(file, fileList, type);
            }
        });
    },

    /**
     * Dosya validasyonu
     */
    validateFile: function(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (file.size > maxSize) {
            Utils.showToast(`${file.name} dosyası çok büyük (Max: 10MB)`, 'error');
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            Utils.showToast(`${file.name} dosya türü desteklenmiyor`, 'error');
            return false;
        }

        return true;
    },

    /**
     * Dosya item'ı oluştur
     */
    createFileItem: function(file, fileList, type) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileIcon = this.getFileIcon(file.type);
        const fileSize = this.formatFileSize(file.size);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <span class="file-icon">${fileIcon}</span>
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${fileSize}</span>
                </div>
            </div>
            <button type="button" class="file-remove" onclick="BakimTakibi.removeFile(this, '${type}')">
                <span>×</span>
            </button>
        `;
        
        fileList.appendChild(fileItem);
    },

    /**
     * Dosya ikonu al
     */
    getFileIcon: function(fileType) {
        const icons = {
            'application/pdf': '📄',
            'application/msword': '📝',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
            'image/jpeg': '🖼️',
            'image/jpg': '🖼️',
            'image/png': '🖼️',
            'application/vnd.ms-excel': '📊',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊'
        };
        return icons[fileType] || '📄';
    },

    /**
     * Dosya boyutu formatla
     */
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Dosya kaldır
     */
    removeFile: function(button, type) {
        const fileItem = button.closest('.file-item');
        fileItem.remove();
        
        // File input'ını temizle
        const fileInput = document.getElementById(`dosya-${type}`);
        if (fileInput) {
            fileInput.value = '';
        }
    },

    /**
     * Bakım kaydet
     */
    saveMaintenance: function(type) {
        const form = document.getElementById(`maintenance-form-${type}`);
        if (!form) return;

        const formData = {
            id: Date.now().toString(),
            tarih: document.getElementById(`tarih-${type}`).value,
            motor: document.getElementById(`motor-${type}`).value,
            durum: document.getElementById(`durum-${type}`).value,
            oncelik: document.getElementById(`oncelik-${type}`).value,
            aciklama: document.getElementById(`aciklama-${type}`).value,
            islemler: document.getElementById(`islemler-${type}`).value,
            personel: document.getElementById(`personel-${type}`).value,
            kayitZamani: CONFIG.formatDateTime(),
            turu: type
        };

        // Validasyon
        if (!formData.tarih || !formData.motor || !formData.durum) {
            Utils.showToast('Lütfen zorunlu alanları doldurun', 'warning');
            return;
        }

        this.saveMaintenanceRecord(formData);
    },

    /**
     * Bakım düzenle
     */
    editMaintenance: function(type, id) {
        // Düzenleme fonksiyonu
        Utils.showToast('Düzenleme özelliği yakında eklenecek', 'info');
    },

    /**
     * Bakım sil
     */
    deleteMaintenance: function(type, id) {
        if (!confirm('Bu bakım kaydını silmek istediğinize emin misiniz?')) {
            return;
        }

        const data = Utils.loadFromStorage(`${type}_bakim`, []);
        const filteredData = data.filter(item => item.id !== id);
        Utils.saveToStorage(`${type}_bakim`, filteredData);

        Utils.showToast('Bakım kaydı silindi', 'success');
        
        // Modal'ı yenile
        this.closeModal();
        this.openMaintenanceModal(type);
        this.loadStatistics();
    },

    /**
     * Modal'ı kapat
     */
    closeModal: function() {
        const modal = document.querySelector('.maintenance-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        }
    },

    /**
     * Admin çıkış yap
     */
    logoutAdmin: function() {
        this.isAdmin = false;
        Utils.saveToStorage('admin_status', false);
        Utils.showToast('Admin çıkışı yapıldı', 'info');
        this.showAdminLock();
    }
};

// BakimTakibi'yi global olarak erişilebilir yap
window.BakimTakibi = BakimTakibi;
