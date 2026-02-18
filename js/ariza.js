/**
 * KOJENERASYON TAKIP SISTEMI - ARIZA
 * Ariza takip ve kayit modulu
 */

const Ariza = {
    data: [],

    init: function() {
        this.loadData();
        this.setupEventListeners();
        this.renderList();
    },

    loadData: function() {
        this.data = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.ARIZA_DATA, []);
    },

    saveData: function() {
        Utils.saveToStorage(CONFIG.STORAGE_KEYS.ARIZA_DATA, this.data);
    },

    setupEventListeners: function() {
        const form = document.getElementById('ariza-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveFault();
            });
        }

        // Durum degisikliginde cozum tarihi alanini goster/gizle
        const durumSelect = document.getElementById('ariza-durum');
        if (durumSelect) {
            durumSelect.addEventListener('change', (e) => {
                const cozumTarih = document.getElementById('ariza-cozum-tarih');
                if (cozumTarih) {
                    if (e.target.value === 'cozuldu') {
                        cozumTarih.required = true;
                        if (!cozumTarih.value) {
                            cozumTarih.value = Utils.getCurrentDateTime();
                        }
                    } else {
                        cozumTarih.required = false;
                    }
                }
            });
        }
    },

    saveFault: function() {
        const ariza = {
            id: Utils.generateId(),
            tarih: document.getElementById('ariza-tarih').value,
            motor: document.getElementById('ariza-motor').value,
            tur: document.getElementById('ariza-turu').value,
            oncelik: document.getElementById('ariza-oncelik').value,
            aciklama: document.getElementById('ariza-aciklama').value,
            durum: document.getElementById('ariza-durum').value,
            cozumTarih: document.getElementById('ariza-cozum-tarih').value,
            cozum: document.getElementById('ariza-cozum').value
        };

        // Validasyon
        if (!ariza.tarih || !ariza.motor || !ariza.tur || !ariza.oncelik || !ariza.aciklama) {
            Utils.showToast('Lutfen zorunlu alanlari doldurun', 'warning');
            return;
        }

        if (ariza.durum === 'cozuldu' && !ariza.cozumTarih) {
            Utils.showToast('Cozuldu durumu icin cozum tarihi girin', 'warning');
            return;
        }

        // Veriye ekle
        this.data.push(ariza);
        this.saveData();

        // API'ye kaydet (varsa)
        const url = SheetsAPI.getScriptUrl();
        if (url) {
            SheetsAPI.saveFault(ariza)
                .then(() => {
                    Utils.showToast('Ariza kaydi API\'ye kaydedildi', 'success');
                })
                .catch(err => {
                    console.log('API kaydetme hatasi:', err);
                });
        }

        // Listeyi guncelle
        this.renderList();
        
        // Formu temizle
        Utils.clearForm('ariza-form');
        
        // Varsayilan degerleri geri ayarla
        document.getElementById('ariza-durum').value = 'aktif';

        Utils.showToast('Ariza kaydi eklendi', 'success');
    },

    renderList: function() {
        const listEl = document.getElementById('ariza-list');
        if (!listEl) return;

        // Sirala (yeni tarih ustte)
        const sorted = Utils.sortByDate(this.data, 'tarih');

        if (sorted.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Heniz ariza kaydi yok</p>';
            return;
        }

        listEl.innerHTML = sorted.map(item => this.createListItem(item)).join('');

        // Butonlari aktiflestir
        listEl.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.list-item').dataset.id;
                this.deleteFault(id);
            });
        });

        listEl.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.list-item').dataset.id;
                this.editFault(id);
            });
        });
    },

    createListItem: function(item) {
        const motorInfo = CONFIG.MOTORS.find(m => m.id === item.motor);
        const motorName = motorInfo ? `${item.motor} - ${motorInfo.name}` : item.motor;

        const oncelikBadge = {
            'dusuk': '<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Dusuk</span>',
            'orta': '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Orta</span>',
            'yuksek': '<span style="background: #fed7aa; color: #9a3412; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Yuksek</span>',
            'acil': '<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Acil</span>'
        };

        let html = `
            <div class="list-item" data-id="${item.id}">
                <div class="item-header">
                    <span class="item-title">${motorName} | ${Utils.getStatusText(item.tur)} ${oncelikBadge[item.oncelik] || ''}</span>
                    <span class="item-date">${Utils.formatDate(item.tarih)}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <span class="item-status status-${item.durum}">${Utils.getStatusText(item.durum)}</span>
                </div>
                <p class="item-desc"><strong>Ariza:</strong> ${Utils.truncateText(item.aciklama, 100)}</p>
        `;

        if (item.durum === 'cozuldu' && item.cozum) {
            html += `<p class="item-desc"><strong>Cozum:</strong> ${Utils.truncateText(item.cozum, 100)}</p>`;
        }

        html += `
                <div style="margin-top: 8px; display: flex; gap: 8px;">
                    <button class="btn-secondary edit-btn" style="padding: 4px 12px; font-size: 12px;">Duzenle</button>
                    <button class="btn-secondary delete-btn" style="padding: 4px 12px; font-size: 12px; background: var(--danger-color);">Sil</button>
                </div>
            </div>
        `;

        return html;
    },

    deleteFault: function(id) {
        if (!confirm('Bu ariza kaydini silmek istediginize emin misiniz?')) return;

        this.data = this.data.filter(item => item.id !== id);
        this.saveData();
        this.renderList();
        
        Utils.showToast('Ariza kaydi silindi', 'success');
    },

    editFault: function(id) {
        const item = this.data.find(i => i.id === id);
        if (!item) return;

        // Formu doldur
        Utils.setInputValue('ariza-tarih', item.tarih);
        Utils.setInputValue('ariza-motor', item.motor);
        Utils.setInputValue('ariza-turu', item.tur);
        Utils.setInputValue('ariza-oncelik', item.oncelik);
        Utils.setInputValue('ariza-aciklama', item.aciklama);
        Utils.setInputValue('ariza-durum', item.durum);
        Utils.setInputValue('ariza-cozum-tarih', item.cozumTarih || '');
        Utils.setInputValue('ariza-cozum', item.cozum || '');

        // Duzeltilen kaydi listeden kaldir (yenisi eklenecek)
        this.data = this.data.filter(i => i.id !== id);
        this.saveData();
        
        Utils.showToast('Kayit duzenleme modunda - degisiklikleri kaydedin', 'warning');
    },

    syncWithAPI: function() {
        const url = SheetsAPI.getScriptUrl();
        if (!url) return;

        SheetsAPI.getFaultData()
            .then(data => {
                if (data && Array.isArray(data)) {
                    this.data = data;
                    this.saveData();
                    this.renderList();
                    Utils.showToast('Veriler API\'den senkronize edildi', 'success');
                }
            })
            .catch(err => {
                console.error('Senkronizasyon hatasi:', err);
                Utils.showToast('Veri senkronizasyon hatasi', 'error');
            });
    }
};

window.Ariza = Ariza;
