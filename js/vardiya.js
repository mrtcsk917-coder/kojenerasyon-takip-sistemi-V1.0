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
        this.loadVardiyalar();
        this.updateCurrentVardiya();
        // Operator listesini Google Sheets'ten yükle
        this.loadOperators();
        // VardiyaAPI'yi başlat
        if (typeof VardiyaAPI !== 'undefined') {
            VardiyaAPI.init();
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

        // Personel input'u
        const personelInput = document.getElementById('sorumlu-personel');
        if (personelInput) {
            personelInput.addEventListener('input', (e) => {
                this.showPersonelSuggestions(e.target.value);
            });

            personelInput.addEventListener('focus', () => {
                this.showPersonelSuggestions(personelInput.value);
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.personel-input-wrapper')) {
                    this.hidePersonelSuggestions();
                }
            });
        }

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

        // Tarih değiştiğinde kontrol et
        const tarihInput = document.getElementById('vardiya-tarih');
        const vardiyaTipiSelect = document.getElementById('vardiya-tipi');
        
        function resetFormAndButton() {
            // Formu sıfırla ve butonu aktif et
            this.resetForm();
            const saveBtn = document.querySelector('#vardiya-form button[type="submit"]');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.querySelector('.btn-text').textContent = 'Vardiyayı Kaydet';
            }
            // Kayıt zamanını temizle
            const kayitZamaniDiv = document.getElementById('kayit-zamani');
            if (kayitZamaniDiv) {
                kayitZamaniDiv.innerHTML = '';
            }
        }
        
        if (tarihInput) {
            tarihInput.addEventListener('change', () => {
                resetFormAndButton.call(this);
            });
        }
        
        if (vardiyaTipiSelect) {
            vardiyaTipiSelect.addEventListener('change', () => {
                resetFormAndButton.call(this);
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
     * Personel önerilerini göster (Google Sheets'ten çekilen operatorler)
     */
    showPersonelSuggestions: function(query) {
        const suggestions = document.getElementById('personel-suggestions');
        
        // Google Sheets'ten yüklenen operator listesini kullan
        const allPersonel = this.operatorList && this.operatorList.length > 0 
            ? this.operatorList 
            : []; // Boş liste - kullanıcı manuel girebilir
        
        if (!suggestions) return;

        const filtered = allPersonel.filter(personel => 
            personel.toLowerCase().includes(query.toLowerCase())
        );

        suggestions.innerHTML = '';
        filtered.forEach(personel => {
            const div = document.createElement('div');
            div.className = 'personel-tag';
            div.textContent = personel;
            div.addEventListener('click', () => {
                document.getElementById('sorumlu-personel').value = personel;
                this.hidePersonelSuggestions();
            });
            suggestions.appendChild(div);
        });

        suggestions.classList.add('show');
    },

    /**
     * Personel önerilerini gizle
     */
    hidePersonelSuggestions: function() {
        const suggestions = document.getElementById('personel-suggestions');
        if (suggestions) {
            suggestions.classList.remove('show');
        }
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
     * Mevcut vardiya kaydını göster
     */
    showExistingVardiya: function(vardiya) {
        // Form alanlarını doldur
        document.getElementById('vardiya-tipi').value = vardiya.vardiya_tipi || '';
        document.getElementById('sorumlu-personel').value = vardiya.sorumlu_personel || '';
        
        // Yardımcı personel varsa
        if (vardiya.yardimci_personel) {
            const yardimciCheckbox = document.getElementById('yardimci-var');
            if (yardimciCheckbox) {
                yardimciCheckbox.checked = true;
                document.getElementById('yardimci-personel-group').style.display = 'block';
            }
            const yardimciSelect = document.getElementById('yardimci-personel');
            if (yardimciSelect) {
                yardimciSelect.value = vardiya.yardimci_personel;
            }
        }
        
        // İşleri işaretle
        if (vardiya.isler && Array.isArray(vardiya.isler)) {
            vardiya.isler.forEach(is => {
                const checkbox = document.querySelector(`input[name="isler"][value="${is}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
        
        // Notları doldur
        document.getElementById('vardiya-notlar').value = vardiya.notlar || '';
        
        // Kayıt zamanını göster
        const kayitZamaniDiv = document.getElementById('kayit-zamani');
        if (kayitZamaniDiv && vardiya.kayitZamani) {
            kayitZamaniDiv.innerHTML = `<small style="color: #666;">Kayıt Zamanı: ${vardiya.kayitZamani}</small>`;
        }
        
        // Kaydet butonunu devre dışı bırak ve metnini değiştir
        const saveBtn = document.querySelector('#vardiya-form button[type="submit"]');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.querySelector('.btn-text').textContent = 'Bu Tarihte Kayıt Mevcut';
        }
        
        // Storage'daki mevcut kaydı da temizle ki yeni kayıt yapılabilsin
        const vardiyaTarih = document.getElementById('vardiya-tarih').value;
        const vardiyaTipi = document.getElementById('vardiya-tipi').value;
        const storageKey = `vardiya-${vardiyaTarih}-${vardiyaTipi}`;
        localStorage.removeItem(storageKey);
        
        Utils.showToast(`Bu tarihte ve vardiya tipinde zaten kayıt var: ${vardiya.sorumlu_personel} (${vardiya.vardiya_tipi})`, 'info');
    },

    /**
     * Vardiya kaydet
     */
    saveVardiya: async function() {
        const saveBtn = document.querySelector('#vardiya-form button[type="submit"]');
        
        // Aynı tarihte ve vardiya tipinde kayıt var mı kontrol et
        const vardiyaTarih = document.getElementById('vardiya-tarih').value;
        const vardiyaTipi = document.getElementById('vardiya-tipi').value;
        
        if (!vardiyaTarih) {
            Utils.showToast('Lütfen tarih seçin', 'error');
            return;
        }
        
        const storageKey = `vardiya-${vardiyaTarih}-${vardiyaTipi}`;
        const existingRecord = Utils.loadFromStorage(storageKey);
        if (existingRecord) {
            // Mevcut kaydı göster
            this.showExistingVardiya(existingRecord);
            return;
        }
        
        // Yardımcı personel bilgisini al
        const yardimciVar = document.getElementById('yardimci-var');
        const yardimciPersonel = yardimciVar && yardimciVar.checked ? 
            document.getElementById('yardimci-personel').value : '';
        
        const formData = {
            id: Date.now().toString(),
            tarih: vardiyaTarih,
            vardiya_tipi: document.getElementById('vardiya-tipi').value,
            sorumlu_personel: document.getElementById('sorumlu-personel').value,
            yardimci_personel: yardimciPersonel,
            isler: this.getSelectedIsler(),
            notlar: document.getElementById('vardiya-notlar').value,
            kayitZamani: CONFIG.formatDateTime(),
        };
        
        // LocalStorage'a kaydet
        const vardiyaData = Utils.loadFromStorage('vardiya_data', []);
        vardiyaData.push(formData);
        Utils.saveToStorage('vardiya_data', vardiyaData);
        
        // Ayrıca tarih+vardiya tipi bazlı kaydet (kontrol için)
        Utils.saveToStorage(storageKey, formData);

        // VardiyaAPI ile Google Sheets'e gönder
        try {
            if (typeof VardiyaAPI !== 'undefined') {
                const result = await VardiyaAPI.saveVardiya(formData);
                if (result.success && !result.offline) {
                    Utils.showToast('Vardiya verileri Google Sheets\'e eklendi', 'success');
                } else if (result.success && result.offline) {
                    Utils.showToast('Vardiya yerel olarak kaydedildi (çevrimdışı)', 'warning');
                } else {
                    Utils.showToast('Google Sheets\'e eklenemedi: ' + result.error, 'error');
                }
            } else {
                Utils.showToast('Vardiya yerel olarak kaydedildi', 'success');
            }
        } catch (error) {
            Utils.showToast('Vardiya kaydetme hatası: ' + error.message, 'error');
        }

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.querySelector('.btn-text').textContent = 'Vardiyayı Kaydet';
        }
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
        // Bu fonksiyon ileride vardiya listesi gösterimi için kullanılacak
        // Şimdilik boş bırakıldı
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
    },

    // Operator listesi cache
    operatorList: [],
    
    /**
     * Operator listesini Google Sheets'ten yükle
     */
    loadOperators: async function() {
        console.log('🔍 Operator listesi yükleniyor...');
        
        try {
            // UserAPI var mı kontrol et
            if (typeof UserAPI === 'undefined') {
                console.error('❌ UserAPI tanımlı değil!');
                return;
            }
            
            console.log('✅ UserAPI bulundu, getAllUsers çağrılıyor...');
            const result = await UserAPI.getAllUsers();
            
            console.log('📊 API Yanıtı:', result);
            
            if (!result.success) {
                console.error('❌ API başarısız:', result.error);
                return;
            }
            
            if (!result.users || result.users.length === 0) {
                console.warn('⚠️ Kullanıcı listesi boş!');
                return;
            }
            
            console.log('👥 Toplam kullanıcı:', result.users.length);
            console.log('👥 Kullanıcılar:', result.users.map(u => ({ name: u.name || u.username, role: u.role, status: u.status })));
            
            // Tüm rolleri kontrol et
            const allRoles = [...new Set(result.users.map(u => u.role))];
            console.log('🎭 Sistemdeki roller:', allRoles);
            
            // Sadece operator rolündeki aktif kullanıcıları al
            const operators = result.users.filter(u => {
                const isOperator = u.role === 'operator';
                const isActive = u.status === 'active' || u.status === undefined || u.status === null;
                console.log(`  ${u.name || u.username}: role=${u.role}, status=${u.status} → operator=${isOperator}, active=${isActive}`);
                return isOperator && isActive;
            });
            
            console.log('✅ Filtrelenmiş operatorler:', operators.length);
            
            this.operatorList = operators
                .map(u => u.name || u.username)
                .filter(name => name);
            
            console.log('✅ Son operator listesi:', this.operatorList);
            
            // Yardımcı personel select elementini doldur
            this.populateYardimciSelect();
            
        } catch (error) {
            console.error('❌ Operator listesi yüklenemedi:', error);
            this.operatorList = [];
        }
    },

    /**
     * Yardımcı personel select elementini doldur
     */
    populateYardimciSelect: function() {
        const select = document.getElementById('yardimci-personel');
        if (!select) return;
        
        // Mevcut options'ları koru (ilk boş option)
        select.innerHTML = '<option value="">Personel seçiniz...</option>';
        
        // Operator listesini ekle
        this.operatorList.forEach(personel => {
            const option = document.createElement('option');
            option.value = personel;
            option.textContent = personel;
            select.appendChild(option);
        });
        
        console.log('✅ Yardımcı personel select dolduruldu:', this.operatorList.length, 'kişi');
    }
};

// Vardiya'yı global olarak erişilebilir yap
window.Vardiya = Vardiya;
