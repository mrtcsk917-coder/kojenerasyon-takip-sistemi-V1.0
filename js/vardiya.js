/**
 * Vardiya Takibi Modülü
 */
const Vardiya = {
    
    /**
     * Modülü başlat
     */
    init: function() {
        this.setupEventListeners();
        this.setupAutoFill();
        this.updateCharCount();
        this.updateCurrentVardiya();
        this.loadVardiyalar(); // Sayfa açıldığında kayıtları yükle
        this.loadRecentUsers(); // Son giriş yapan kullanıcıları yükle
        this.loadVardiyaPersonelOptions(); // Vardiya personel seçeneklerini yükle
        this.loadYardimciPersonelOptions(); // Yardımcı personel seçeneklerini yükle
        
        // Online/offline event listener'ları
        window.addEventListener('online', () => {
            Utils.showToast('İnternet bağlantısı kuruldu. Bekleyen kayıtlar senkronize ediliyor...', 'info');
            this.syncPendingRecords();
        });
        
        window.addEventListener('offline', () => {
            Utils.showToast('İnternet bağlantısı kesildi. Kayıtlar yerel olarak saklanacak.', 'warning');
        });
        
        // Sayfa yüklendiğinde bekleyen senkronizasyonları kontrol et
        if (navigator.onLine) {
            setTimeout(() => {
                this.syncPendingRecords();
            }, 2000); // 2 saniye bekle
        }
    },

    /**
     * Event listener'ları ayarla
     */
    setupEventListeners: function() {
        // Vardiya formu
        const form = document.getElementById('vardiya-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveVardiya();
            });
        }

        // Kaydet butonu
        const saveBtn = document.getElementById('save-vardiya-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveVardiya();
            });
        }

        // Yardımcı personel input'u (artık select dropdown)
        const yardimciInput = document.getElementById('yardimci-personel');
        if (yardimciInput) {
            yardimciInput.addEventListener('change', (e) => {
                // Seçim değiştiğinde yapılacak işlemler
                console.log('Yardımcı personel seçildi:', e.target.value);
            });
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.personel-input-wrapper')) {
                this.hidePersonelSuggestions('all');
            }
        });

        // Tarih değiştir butonu
        const changeDateBtn = document.getElementById('change-date-btn');
        if (changeDateBtn) {
            changeDateBtn.addEventListener('click', () => {
                this.toggleDateInput();
            });
        }

        // Form temizleme butonu
        const resetBtn = document.getElementById('reset-form-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Formu temizlemek istediğinize emin misiniz?')) {
                    this.resetForm();
                }
            });
        }

        // Vardiya tipi değişimi
        const vardiyaTipi = document.getElementById('vardiya-tipi');
        if (vardiyaTipi) {
            vardiyaTipi.addEventListener('change', () => {
                this.updateShiftInfo();
                this.toggleYardimciSection();
            });
        }

        // Yardımcı vardiya seçimi
        const yardimciRadios = document.querySelectorAll('input[name="yardimci"]');
        yardimciRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.toggleYardimciPersonelGroup();
            });
        });

        // Karakter sayacı
        const notlarTextarea = document.getElementById('vardiya-notlar');
        if (notlarTextarea) {
            notlarTextarea.addEventListener('input', () => {
                this.updateCharCount();
            });
        }

        // Şablon ekle butonu
        const addTemplateBtn = document.getElementById('add-template-btn');
        if (addTemplateBtn) {
            addTemplateBtn.addEventListener('click', () => {
                this.addTemplateNote();
            });
        }
    },

    /**
     * Otomatik doldurma ayarları
     */
    setupAutoFill: function() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayString = `${year}-${month}-${day}`;
        
        const dateInput = document.getElementById('vardiya-tarih');
        if (dateInput) {
            dateInput.value = todayString;
            dateInput.max = todayString;
        }

        // Mevcut vardiya belirle
        const hour = new Date().getHours();
        let vardiyaTipi = '';
        
        if (hour >= 0 && hour < 8) {
            vardiyaTipi = 'gece';
        } else if (hour >= 8 && hour < 16) {
            vardiyaTipi = 'gunduz';
        } else {
            vardiyaTipi = 'aksam';
        }

        const vardiyaSelect = document.getElementById('vardiya-tipi');
        if (vardiyaSelect) {
            vardiyaSelect.value = vardiyaTipi;
            this.updateShiftInfo();
            this.toggleYardimciSection();
        }
    },

    /**
     * Vardiya bilgisini güncelle
     */
    updateShiftInfo: function() {
        const vardiyaTipi = document.getElementById('vardiya-tipi').value;
        const shiftHoursEl = document.getElementById('shift-hours');
        
        const shiftTimes = {
            'gece': '00:00 - 08:00',
            'gunduz': '08:00 - 16:00',
            'aksam': '16:00 - 24:00'
        };

        if (shiftHoursEl) {
            shiftHoursEl.textContent = shiftTimes[vardiyaTipi] || '';
        }
    },

    /**
     * Yardımcı vardiya bölümünü göster/gizle
     */
    toggleYardimciSection: function() {
        const vardiyaTipi = document.getElementById('vardiya-tipi').value;
        const yardimciSection = document.getElementById('yardimci-section');
        
        if (yardimciSection) {
            if (vardiyaTipi === 'gunduz') {
                yardimciSection.style.display = 'block';
            } else {
                yardimciSection.style.display = 'none';
                // Gündüz değilse yardımcı seçimini sıfırla
                const yardimciYok = document.getElementById('yardimci-yok');
                if (yardimciYok) {
                    yardimciYok.checked = true;
                }
                this.toggleYardimciPersonelGroup();
            }
        }
    },

    /**
     * Yardımcı personel input grubunu göster/gizle
     */
    toggleYardimciPersonelGroup: function() {
        const yardimciVar = document.getElementById('yardimci-var');
        const yardimciPersonelGroup = document.getElementById('yardimci-personel-group');
        
        if (yardimciPersonelGroup) {
            if (yardimciVar && yardimciVar.checked) {
                yardimciPersonelGroup.style.display = 'block';
            } else {
                yardimciPersonelGroup.style.display = 'none';
            }
        }
    },

    /**
     * Tarih input'unu göster/gizle
     */
    toggleDateInput: function() {
        const dateInput = document.getElementById('vardiya-tarih');
        const changeBtn = document.getElementById('change-date-btn');
        
        if (dateInput && changeBtn) {
            if (dateInput.readOnly) {
                dateInput.readOnly = false;
                dateInput.style.background = 'var(--input-bg)';
                changeBtn.textContent = '🔒 Kilitle';
            } else {
                dateInput.readOnly = true;
                dateInput.style.background = 'var(--bg-tertiary)';
                changeBtn.textContent = '✏️ Değiştir';
            }
        }
    },

    /**
     * Vardiya personel dropdown'unu doldur
     */
    loadVardiyaPersonelOptions: async function() {
        try {
            // Google Sheets'ten kullanıcıları çek (timeout ile)
            const formData = new FormData();
            formData.append('action', 'getAllUsers');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

            const response = await fetch(CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.kullanici, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.users) {
                // Aktif kullanıcıları filtrele ve alfabetik sırala
                const activeUsers = result.users
                    .filter(user => user.Durum === 'active' && user.AdSoyad)
                    .sort((a, b) => (a.AdSoyad || '').localeCompare(b.AdSoyad || ''));

                this.displayVardiyaPersonelOptions(activeUsers);
            } else {
                // Hata olursa LocalStorage'dan al
                this.loadVardiyaPersonelFromStorage();
            }

        } catch (error) {
            console.error('Vardiya personel yüklenemedi:', error);
            // Timeout veya network hatası ise LocalStorage'dan al
            this.loadVardiyaPersonelFromStorage();
        }
    },

    /**
     * LocalStorage'dan vardiya personel yükle
     */
    loadVardiyaPersonelFromStorage: function() {
        try {
            const users = Utils.loadFromStorage('users', []);
            const activeUsers = users
                .filter(user => user.status === 'active' && user.name)
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            this.displayVardiyaPersonelOptions(activeUsers);
        } catch (error) {
            console.error('LocalStorage vardiya personel yüklenemedi:', error);
        }
    },

    /**
     * Vardiya personel seçeneklerini göster
     */
    displayVardiyaPersonelOptions: function(users) {
        const vardiyaSelect = document.getElementById('vardiya');
        
        if (!vardiyaSelect) return;
        
        // Mevcut seçimi koru
        const currentValue = vardiyaSelect.value;
        
        // Seçenekleri temizle ve doldur
        vardiyaSelect.innerHTML = '<option value="">Personel seçin...</option>';
        
        // Sadece 'operator' rolündeki kullanıcıları filtrele
        const operatorUsers = users.filter(user => {
            const role = user.Rol || user.role || 'user';
            return role.toLowerCase() === 'operator';
        });
        
        operatorUsers.forEach(user => {
            const displayName = user.name || user.AdSoyad || user.username || user.KullaniciAdi;
            const option = document.createElement('option');
            option.value = displayName;
            option.textContent = displayName; // Sadece isim göster
            vardiyaSelect.appendChild(option);
        });
        
        // Önceki seçimi geri yükle
        if (currentValue) {
            vardiyaSelect.value = currentValue;
        }
        
        // Eğer operator yoksa bilgi ver
        if (operatorUsers.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Operator rolünde kullanıcı bulunamadı";
            option.disabled = true;
            vardiyaSelect.appendChild(option);
        }
    },

    /**
     * Yardımcı personel dropdown'unu doldur
     */
    loadYardimciPersonelOptions: async function() {
        try {
            // Google Sheets'ten kullanıcıları çek (timeout ile)
            const formData = new FormData();
            formData.append('action', 'getAllUsers');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

            const response = await fetch(CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.kullanici, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.users) {
                // Aktif kullanıcıları filtrele ve alfabetik sırala
                const activeUsers = result.users
                    .filter(user => user.Durum === 'active' && user.AdSoyad)
                    .sort((a, b) => (a.AdSoyad || '').localeCompare(b.AdSoyad || ''));

                this.displayYardimciPersonelOptions(activeUsers);
            } else {
                // Hata olursa LocalStorage'dan al
                this.loadYardimciPersonelFromStorage();
            }

        } catch (error) {
            console.error('Yardımcı personel yüklenemedi:', error);
            // Timeout veya network hatası ise LocalStorage'dan al
            this.loadYardimciPersonelFromStorage();
        }
    },

    /**
     * LocalStorage'dan yardımcı personel yükle
     */
    loadYardimciPersonelFromStorage: function() {
        try {
            const users = Utils.loadFromStorage('users', []);
            const activeUsers = users
                .filter(user => user.status === 'active' && user.name)
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            this.displayYardimciPersonelOptions(activeUsers);
        } catch (error) {
            console.error('LocalStorage yardımcı personel yüklenemedi:', error);
        }
    },

    /**
     * Yardımcı personel seçeneklerini göster
     */
    displayYardimciPersonelOptions: function(users) {
        const yardimciSelect = document.getElementById('yardimci-personel');
        
        if (!yardimciSelect) return;
        
        // Mevcut seçimi koru
        const currentValue = yardimciSelect.value;
        
        // Seçenekleri temizle ve doldur
        yardimciSelect.innerHTML = '<option value="">Yardımcı personel seçin...</option>';
        
        // Sadece 'operator' rolündeki kullanıcıları filtrele
        const operatorUsers = users.filter(user => {
            const role = user.Rol || user.role || 'user';
            return role.toLowerCase() === 'operator';
        });
        
        operatorUsers.forEach(user => {
            const displayName = user.name || user.AdSoyad || user.username || user.KullaniciAdi;
            const option = document.createElement('option');
            option.value = displayName;
            option.textContent = displayName; // Sadece isim göster, rol belirtme
            yardimciSelect.appendChild(option);
        });
        
        // Önceki seçimi geri yükle
        if (currentValue) {
            yardimciSelect.value = currentValue;
        }
        
        // Eğer operator yoksa bilgi ver
        if (operatorUsers.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "Operator rolünde kullanıcı bulunamadı";
            option.disabled = true;
            yardimciSelect.appendChild(option);
        }
    },

    /**
     * Son giriş yapan kullanıcıları yükle
     */
    loadRecentUsers: async function() {
        try {
            // Google Sheets'ten kullanıcıları çek (timeout ile)
            const formData = new FormData();
            formData.append('action', 'getAllUsers');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

            const response = await fetch(CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.kullanici, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.users) {
                // Aktif kullanıcıları filtrele ve son giriş zamanına göre sırala
                const activeUsers = result.users
                    .filter(user => user.Durum === 'active' && user.AdSoyad)
                    .sort((a, b) => {
                        // Son giriş zamanına göre sırala (varsa)
                        const timeA = a.SonGiris ? new Date(a.SonGiris) : new Date(0);
                        const timeB = b.SonGiris ? new Date(b.SonGiris) : new Date(0);
                        return timeB - timeA;
                    })
                    .slice(0, 5); // Son 5 kullanıcı

                this.displayRecentUsers(activeUsers);
            } else {
                // Hata olursa LocalStorage'dan al
                this.loadRecentUsersFromStorage();
            }

        } catch (error) {
            console.error('Son kullanıcılar yüklenemedi:', error);
            // Timeout veya network hatası ise LocalStorage'dan al
            this.loadRecentUsersFromStorage();
        }
    },

    /**
     * LocalStorage'dan son kullanıcıları yükle
     */
    loadRecentUsersFromStorage: function() {
        try {
            const users = Utils.loadFromStorage('users', []);
            const activeUsers = users
                .filter(user => user.status === 'active' && user.name)
                .slice(0, 5);

            this.displayRecentUsers(activeUsers);
        } catch (error) {
            console.error('LocalStorage son kullanıcılar yüklenemedi:', error);
        }
    },

    /**
     * Son kullanıcıları göster
     */
    displayRecentUsers: function(users) {
        const recentPersonelEl = document.getElementById('recent-personel');
        
        if (!recentPersonelEl || !users || users.length === 0) {
            if (recentPersonelEl) {
                recentPersonelEl.innerHTML = '<small>Son giriş yapanlar: </small><span class="no-recent">Veri bulunamadı</span>';
            }
            return;
        }

        const userTags = users.map(user => {
            const displayName = user.name || user.AdSoyad || user.username || user.KullaniciAdi;
            return `<span class="personel-tag recent-user" data-personel="${displayName}">${displayName}</span>`;
        }).join('');

        recentPersonelEl.innerHTML = `<small>Son giriş yapanlar: </small>${userTags}`;

        // Click event listener ekle
        recentPersonelEl.querySelectorAll('.recent-user').forEach(tag => {
            tag.addEventListener('click', () => {
                const personelName = tag.getAttribute('data-personel');
                document.getElementById('vardiya-personel').value = personelName;
                this.hidePersonelSuggestions('all');
            });
        });
    },

    /**
     * Personel önerilerini göster
     */
    showPersonelSuggestions: function(query, inputType = 'vardiya') {
        const suggestionsId = inputType === 'yardimci' ? 'yardimci-personel-suggestions' : 'personel-suggestions';
        const suggestions = document.getElementById(suggestionsId);
        
        if (!suggestions) return;
        
        // Kullanıcı verilerinden personel listesini al
        const users = Utils.loadFromStorage('users', []);
        const allPersonel = users.map(user => user.name || user.AdSoyad).filter(name => name);
        
        // Eğer kullanıcı verisi yoksa varsayılan listeyi kullan
        const defaultPersonel = ['Ahmet Yılmaz', 'Mehmet Demir', 'Ayşe Kaya', 'Fatma Şahin', 'Mustafa Öz', 'Zeynep Çelik'];
        const personelList = allPersonel.length > 0 ? allPersonel : defaultPersonel;
        
        if (!query || query.length < 2) {
            suggestions.classList.remove('show');
            return;
        }

        const filtered = personelList.filter(personel => 
            personel.toLowerCase().includes(query.toLowerCase())
        );

        suggestions.innerHTML = '';
        filtered.forEach(personel => {
            const div = document.createElement('div');
            div.className = 'personel-tag';
            div.textContent = personel;
            div.addEventListener('click', () => {
                const targetInput = inputType === 'yardimci' ? 
                    document.getElementById('yardimci-personel') : 
                    document.getElementById('vardiya-personel');
                targetInput.value = personel;
                this.hidePersonelSuggestions(inputType);
            });
            suggestions.appendChild(div);
        });

        if (filtered.length > 0) {
            suggestions.classList.add('show');
        } else {
            suggestions.classList.remove('show');
        }
    },

    /**
     * Personel önerilerini gizle
     */
    hidePersonelSuggestions: function(inputType = 'all') {
        const suggestionsIds = inputType === 'all' ? 
            ['personel-suggestions', 'yardimci-personel-suggestions'] : 
            [inputType === 'yardimci' ? 'yardimci-personel-suggestions' : 'personel-suggestions'];
            
        suggestionsIds.forEach(id => {
            const suggestions = document.getElementById(id);
            if (suggestions) {
                suggestions.classList.remove('show');
            }
        });
    },

    /**
     * Karakter sayacını güncelle
     */
    updateCharCount: function() {
        const textarea = document.getElementById('vardiya-notlar');
        const counter = document.getElementById('char-counter');
        
        if (textarea && counter) {
            const count = textarea.value.length;
            counter.textContent = count;
            
            if (count > 500) {
                counter.style.color = 'var(--danger-color)';
            } else if (count > 400) {
                counter.style.color = 'var(--warning-color)';
            } else {
                counter.style.color = 'inherit';
            }
        }
    },

    /**
     * Şablon not ekle
     */
    addTemplateNote: function() {
        const templates = [
            'Vardiya normal şekilde tamamlandı.',
            'Küçük arızalar yaşandı ancak çözüldü.',
            'Bakım çalışmaları yapıldı.',
            'Ekipman kontrolü yapıldı.'
        ];

        const template = templates[Math.floor(Math.random() * templates.length)];
        const textarea = document.getElementById('vardiya-notlar');
        
        if (textarea) {
            const currentText = textarea.value;
            const newText = currentText ? `${currentText}\n\n${template}` : template;
            textarea.value = newText;
            this.updateCharCount();
        }
    },

    /**
     * Formu sıfırla
     */
    resetForm: function() {
        const form = document.getElementById('vardiya-form');
        if (form) {
            form.reset();
            this.setupAutoFill();
            this.updateCharCount();
        }
    },

    /**
     * Vardiya kaydet
     */
    saveVardiya: async function() {
        const saveBtn = document.getElementById('save-vardiya-btn');
        
        // ✅ Tarih ve vardiya tipi kontrolü - aynı tarihte ve vardiya tipinde kayıt var mı?
        const vardiyaTarih = document.getElementById('vardiya-tarih').value;
        const vardiyaTipi = document.getElementById('vardiya-tipi').value;
        
        if (!vardiyaTarih) {
            Utils.showToast('Lütfen tarih seçin', 'error');
            return;
        }
        
        // Aynı tarihte ve aynı vardiya tipinde kayıt var mı kontrol et
        const vardiyaDataList = Utils.loadFromStorage('vardiya_data', []);
        const existingRecord = vardiyaDataList.find(v => 
            v.tarih === vardiyaTarih && v.vardiya_tipi === vardiyaTipi
        );
        
        if (existingRecord) {
            Utils.showToast(`Bu tarihte (${vardiyaTarih}) ve bu vardiya tipinde (${this.getShiftLabel(vardiyaTipi)}) zaten bir kayıt var!`, 'warning');
            return;
        }
        
        // Form verilerini al
        const formData = {
            id: Date.now().toString(),
            tarih: vardiyaTarih,
            vardiya_tipi: document.getElementById('vardiya-tipi').value,
            vardiya_personel: document.getElementById('vardiya').value,
            yardimci_personel: document.getElementById('yardimci-personel').value || '',
            isler: this.getSelectedIsler(),
            notlar: document.getElementById('vardiya-notlar').value,
            kayitZamani: CONFIG.formatDateTime(),
            synced: false // Senkronizasyon durumu
        };
        
        // Butonu disabled yap
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.querySelector('.btn-text').textContent = 'Kaydediliyor...';
        }
        
        // Önce LocalStorage'a kaydet
        this.saveToLocalStorage(formData);
        
        // Google Sheets'e senkronize et
        await this.syncToGoogleSheets(formData);
        
        // Butonu tekrar aktif et
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.querySelector('.btn-text').textContent = 'Vardiyayı Kaydet';
        }
    },

    /**
     * LocalStorage'a kaydet
     */
    saveToLocalStorage: function(vardiyaData) {
        try {
            // Ana vardiya listesine ekle
            const vardiyaDataList = Utils.loadFromStorage('vardiya_data', []);
            vardiyaDataList.push(vardiyaData);
            Utils.saveToStorage('vardiya_data', vardiyaDataList);
            
            // Tarih bazlı kaydet (hızlı erişim için)
            const storageKey = `vardiya-${vardiyaData.tarih}`;
            Utils.saveToStorage(storageKey, vardiyaData);
            
            // Bekleyen senkronizasyon listesine ekle
            const pendingSync = Utils.loadFromStorage('pending_vardiya_sync', []);
            pendingSync.push(vardiyaData.id);
            Utils.saveToStorage('pending_vardiya_sync', pendingSync);
            
            Utils.showToast('Vardiya yerel olarak kaydedildi', 'success');
            
        } catch (error) {
            console.error('LocalStorage kayıt hatası:', error);
            Utils.showToast('Yerel kayıt hatası: ' + error.message, 'error');
        }
    },

    /**
     * Google Sheets'e senkronize et
     */
    syncToGoogleSheets: async function(vardiyaData) {
        try {
            // İnternet bağlantısı kontrolü
            if (!navigator.onLine) {
                Utils.showToast('İnternet bağlantısı yok. Kayıt senkronizasyon kuyruğuna alındı.', 'warning');
                return;
            }
            
            const result = await GoogleSheetsAPI.addVardiyaRecord(vardiyaData);
            
            if (result.success) {
                // Senkronizasyon başarılı - işaretle
                this.markAsSynced(vardiyaData.id);
                
                // Bekleyen senkronizasyon listesinden çıkar
                this.removeFromPendingSync(vardiyaData.id);
                
                Utils.showToast('Vardiya Google Sheets\'e senkronize edildi', 'success');
                this.loadVardiyalar(); // Listeyi yenile
                
            } else {
                Utils.showToast('Google Sheets senkronizasyonu başarısız: ' + result.error, 'error');
                console.error('Google Sheets senkronizasyon hatası:', result);
            }
            
        } catch (error) {
            console.error('Senkronizasyon hatası:', error);
            Utils.showToast('Senkronizasyon hatası: ' + error.message, 'error');
        }
    },

    /**
     * Vardiyayı senkronize edilmiş olarak işaretle
     */
    markAsSynced: function(vardiyaId) {
        try {
            const vardiyaDataList = Utils.loadFromStorage('vardiya_data', []);
            const vardiyaIndex = vardiyaDataList.findIndex(v => v.id === vardiyaId);
            
            if (vardiyaIndex !== -1) {
                vardiyaDataList[vardiyaIndex].synced = true;
                vardiyaDataList[vardiyaIndex].syncTime = new Date().toISOString();
                Utils.saveToStorage('vardiya_data', vardiyaDataList);
            }
            
            // Tarih bazlı kaydı da güncelle
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('vardiya-')) {
                    const record = Utils.loadFromStorage(key);
                    if (record && record.id === vardiyaId) {
                        record.synced = true;
                        record.syncTime = new Date().toISOString();
                        Utils.saveToStorage(key, record);
                    }
                }
            });
            
        } catch (error) {
            console.error('Sync işaretleme hatası:', error);
        }
    },

    /**
     * Bekleyen senkronizasyon listesinden çıkar
     */
    removeFromPendingSync: function(vardiyaId) {
        try {
            const pendingSync = Utils.loadFromStorage('pending_vardiya_sync', []);
            const updatedPending = pendingSync.filter(id => id !== vardiyaId);
            Utils.saveToStorage('pending_vardiya_sync', updatedPending);
        } catch (error) {
            console.error('Pending sync kaldırma hatası:', error);
        }
    },

    /**
     * Bekleyen senkronizasyonları yap
     */
    syncPendingRecords: async function() {
        try {
            const pendingSync = Utils.loadFromStorage('pending_vardiya_sync', []);
            
            if (pendingSync.length === 0) {
                return;
            }
            
            const vardiyaDataList = Utils.loadFromStorage('vardiya_data', []);
            
            for (const vardiyaId of pendingSync) {
                const vardiya = vardiyaDataList.find(v => v.id === vardiyaId);
                
                if (vardiya && !vardiya.synced) {
                    console.log('Bekleyen vardiya senkronize ediliyor:', vardiyaId);
                    await this.syncToGoogleSheets(vardiya);
                    
                    // 1 saniye bekle (API limitlerini aşmamak için)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
        } catch (error) {
            console.error('Bekleyen senkronizasyon hatası:', error);
        }
    },

    /**
     * Google Sheets'e vardiya kaydet
     */
    saveToGoogleSheets: async function(vardiyaData) {
        try {
            const formData = new FormData();
            formData.append('action', 'saveVardiya');
            formData.append('data', JSON.stringify({
                id: vardiyaData.id,
                tarih: vardiyaData.tarih,
                vardiyaTipi: vardiyaData.vardiya_tipi,
                vardiyaPersonel: vardiyaData.vardiya_personel,
                yardimciPersonel: vardiyaData.yardimci_personel || '',
                yapilanIsler: vardiyaData.isler.map(i => i.text).join(', '),
                notlar: vardiyaData.notlar
            }));

            const response = await fetch(CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.vardiya, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('Google Sheets API hatası:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Google Sheets'ten vardiya kayıtlarını yükle
     */
    loadVardiyalar: async function() {
        try {
            const formData = new FormData();
            formData.append('action', 'getAllVardiyalar');

            const response = await fetch(CONFIG.GOOGLE_SHEETS_WEB_APP_URLS.vardiya, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayVardiyalar(result.vardiyalar);
            } else {
                Utils.showToast('Vardiya kayıtları yüklenemedi: ' + result.error, 'error');
            }

        } catch (error) {
            console.error('Vardiya yükleme hatası:', error);
            Utils.showToast('Vardiya kayıtları yüklenemedi', 'error');
        }
    },

    /**
     * Vardiya kayıtlarını göster
     */
    displayVardiyalar: function(vardiyalar) {
        const listEl = document.getElementById('vardiya-list');
        
        if (!vardiyalar || vardiyalar.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <i>📭</i>
                    <h4>Henüz kayıt bulunmuyor</h4>
                    <p>İlk vardiya kaydınızı oluşturmak için formu doldurun.</p>
                </div>
            `;
            return;
        }

        const html = vardiyalar.map(vardiya => {
            const syncStatus = vardiya.synced ? 
                '<span class="sync-status synced">✅ Senkronize edildi</span>' : 
                '<span class="sync-status pending">⏳ Bekliyor</span>';
                
            return `
                <div class="vardiya-item ${vardiya.synced ? 'synced' : 'pending'}" data-id="${vardiya.id}">
                    <div class="vardiya-header">
                        <div class="vardiya-date">${this.formatDate(vardiya.tarih)}</div>
                        <div class="vardiya-shift">${this.getShiftLabel(vardiya.vardiya_tipi)}</div>
                        <div class="vardiya-sync">${syncStatus}</div>
                    </div>
                    <div class="vardiya-personel">
                        👤 <strong>${vardiya.vardiya_personel}</strong>
                        ${vardiya.yardimci_personel ? ` + ${vardiya.yardimci_personel}` : ''}
                    </div>
                    <div class="vardiya-isler">
                        📋 ${vardiya.isler ? vardiya.isler.map(i => i.text).join(', ') : 'İş belirtilmemiş'}
                    </div>
                    ${vardiya.notlar ? `
                        <div class="vardiya-notlar">
                            📝 ${vardiya.notlar}
                        </div>
                    ` : ''}
                    ${vardiya.syncTime ? `
                        <div class="vardiya-sync-time">
                            🕐 Senkronizasyon: ${new Date(vardiya.syncTime).toLocaleString('tr-TR')}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        listEl.innerHTML = html;
    },

    /**
     * Tarihi formatla
     */
    formatDate: function(tarih) {
        if (!tarih) return '';
        const date = new Date(tarih);
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    /**
     * Vardiya tipini label olarak döndür
     */
    getShiftLabel: function(tip) {
        const labels = {
            'gece': '🌙 Gece',
            'gunduz': '☀️ Gündüz',
            'aksam': '🌆 Akşam'
        };
        return labels[tip] || tip;
    },

    /**
     * Seçili işleri al
     */
    getSelectedIsler: function() {
        const isler = [];
        const checkboxes = document.querySelectorAll('.isler-checklist input[type="checkbox"]:checked');
        
        checkboxes.forEach(checkbox => {
            isler.push({
                id: checkbox.id,
                text: checkbox.nextElementSibling.textContent.trim()
            });
        });

        return isler;
    },

    /**
     * Vardiyaları yükle
     */
    loadVardiyalar: function() {
        try {
            // LocalStorage'dan vardiya verilerini al
            const vardiyaDataList = Utils.loadFromStorage('vardiya_data', []);
            
            // Tarihe göre tersten sırala (en yeni üstte)
            const sortedVardiyalar = vardiyaDataList.sort((a, b) => {
                return new Date(b.tarih) - new Date(a.tarih);
            });
            
            // Vardiyaları göster
            this.displayVardiyalar(sortedVardiyalar);
            
        } catch (error) {
            console.error('Vardiyalar yüklenemedi:', error);
            Utils.showToast('Vardiyalar yüklenemedi: ' + error.message, 'error');
        }
    },

    /**
     * Mevcut vardiya bilgisini güncelle
     */
    updateCurrentVardiya: function() {
        const statusEl = document.getElementById('current-vardiya-status');
        const shiftNameEl = document.getElementById('current-shift-name');
        
        if (statusEl && shiftNameEl) {
            const hour = new Date().getHours();
            let shiftName = '';
            
            if (hour >= 0 && hour < 8) {
                shiftName = 'Gece Vardiyası';
            } else if (hour >= 8 && hour < 16) {
                shiftName = 'Gündüz Vardiyası';
            } else {
                shiftName = 'Akşam Vardiyası';
            }

            shiftNameEl.textContent = shiftName;
        }
    }
};

// Vardiya'yı global olarak erişilebilir yap
window.Vardiya = Vardiya;
