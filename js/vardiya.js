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
     * Personel önerilerini göster
     */
    showPersonelSuggestions: function(query) {
        const suggestions = document.getElementById('personel-suggestions');
        const allPersonel = ['Ahmet Yılmaz', 'Mehmet Demir', 'Ayşe Kaya', 'Fatma Şahin', 'Mustafa Öz', 'Zeynep Çelik'];
        
        if (!query || query.length < 2) {
            suggestions.classList.remove('show');
            return;
        }

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
     * Vardiya kaydet
     */
    saveVardiya: async function() {
        const formData = {
            id: Date.now().toString(),
            tarih: document.getElementById('vardiya-tarih').value,
            vardiya_tipi: document.getElementById('vardiya-tipi').value,
            sorumlu_personel: document.getElementById('sorumlu-personel').value,
            isler: this.getSelectedIsler(),
            notlar: document.getElementById('vardiya-notlar').value,
            kayitZamani: CONFIG.formatDateTime(),
        };
        
        // LocalStorage'a kaydet
        const vardiyaData = Utils.loadFromStorage('vardiya_data', []);
        vardiyaData.push(formData);
        Utils.saveToStorage('vardiya_data', vardiyaData);

        // Google Sheets'e gönder
        try {
            const result = await GoogleSheetsAPI.addVardiyaRecord(formData);
            if (result.success) {
                Utils.showToast('Vardiya verileri Google Sheets\'e eklendi', 'success');
            } else {
                Utils.showToast('Google Sheets\'e eklenemedi: ' + result.error, 'error');
            }
        } catch (error) {
            Utils.showToast('Google Sheets hatası: ' + error.message, 'error');
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
    }
};

// Vardiya'yı global olarak erişilebilir yap
window.Vardiya = Vardiya;
