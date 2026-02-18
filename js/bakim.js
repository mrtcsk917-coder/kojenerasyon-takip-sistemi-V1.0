/**
 * KOJENERASYON TAKIP SISTEMI - BAKIM
 * Bakim takip ve kayit modulu
 */

const Bakim = {
    data: [],

    init: function() {
        this.loadData();
        this.setupEventListeners();
        this.renderList();
        
        // Varsayilan tarihi ayarla
        const dateInput = document.getElementById('bakim-tarih');
        if (dateInput) {
            dateInput.value = Utils.formatDateInput(new Date());
        }
    },

    loadData: function() {
        this.data = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.BAKIM_DATA, []);
    },

    saveData: function() {
        Utils.saveToStorage(CONFIG.STORAGE_KEYS.BAKIM_DATA, this.data);
    },

    setupEventListeners: function() {
        const form = document.getElementById('bakim-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveMaintenance();
            });
        }
    },

    saveMaintenance: function() {
        const bakim = {
            id: Utils.generateId(),
            tarih: document.getElementById('bakim-tarih').value,
            motor: document.getElementById('bakim-motor').value,
            tur: document.getElementById('bakim-turu').value,
            durum: document.getElementById('bakim-durum').value,
            aciklama: document.getElementById('bakim-aciklama').value,
            islemler: document.getElementById('bakim-islemler').value
        };

        // Validasyon
        if (!bakim.tarih || !bakim.motor || !bakim.tur || !bakim.durum) {
            Utils.showToast('Lutfen zorunlu alanlari doldurun', 'warning');
            return;
        }

        // Veriye ekle
        this.data.push(bakim);
        this.saveData();

        // API'ye kaydet (varsa)
        const url = SheetsAPI.getScriptUrl();
        if (url) {
            SheetsAPI.saveMaintenance(bakim)
                .then(() => {
                    Utils.showToast('Bakim kaydi API\'ye kaydedildi', 'success');
                })
                .catch(err => {
                    console.log('API kaydetme hatasi:', err);
                });
        }

        // Listeyi guncelle
        this.renderList();
        
        // Formu temizle (tarih haric)
        document.getElementById('bakim-motor').value = '';
        document.getElementById('bakim-turu').value = '';
        document.getElementById('bakim-durum').value = '';
        document.getElementById('bakim-aciklama').value = '';
        document.getElementById('bakim-islemler').value = '';

        Utils.showToast('Bakim kaydi eklendi', 'success');
    },

    renderList: function() {
        const listEl = document.getElementById('bakim-list');
        if (!listEl) return;

        // Sirala (yeni tarih ustte)
        const sorted = Utils.sortByDate(this.data, 'tarih');

        if (sorted.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Heniz bakim kaydi yok</p>';
            return;
        }

        listEl.innerHTML = sorted.map(item => this.createListItem(item)).join('');

        // Sil butonlarini aktiflestir
        listEl.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.list-item').dataset.id;
                this.deleteMaintenance(id);
            });
        });
    },

    createListItem: function(item) {
        const motorInfo = CONFIG.MOTORS.find(m => m.id === item.motor);
        const motorName = motorInfo ? `${item.motor} - ${motorInfo.name}` : item.motor;

        return `
            <div class="list-item" data-id="${item.id}">
                <div class="item-header">
                    <span class="item-title">${motorName} | ${Utils.getStatusText(item.tur)}</span>
                    <span class="item-date">${Utils.formatDate(item.tarih)}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <span class="item-status status-${item.durum}">${Utils.getStatusText(item.durum)}</span>
                </div>
                <p class="item-desc">${Utils.truncateText(item.aciklama || 'Aciklama yok', 100)}</p>
                <div style="margin-top: 8px; display: flex; gap: 8px;">
                    <button class="btn-secondary delete-btn" style="padding: 4px 12px; font-size: 12px;">Sil</button>
                </div>
            </div>
        `;
    },

    deleteMaintenance: function(id) {
        if (!confirm('Bu bakim kaydini silmek istediginize emin misiniz?')) return;

        this.data = this.data.filter(item => item.id !== id);
        this.saveData();
        this.renderList();
        
        Utils.showToast('Bakim kaydi silindi', 'success');
    },

    syncWithAPI: function() {
        const url = SheetsAPI.getScriptUrl();
        if (!url) return;

        SheetsAPI.getMaintenanceData()
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

window.Bakim = Bakim;
