/**
 * KOJENERASYON TAKIP SISTEMI - RAPORLAR
 * Rapor olusturma ve goruntuleme modulu
 */

const Raporlar = {
    init: function() {
        this.setupEventListeners();
        
        // Varsayilan ayi ayarla
        const monthInput = document.getElementById('report-month');
        if (monthInput) {
            const now = new Date();
            monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
    },

    setupEventListeners: function() {
        const btn = document.getElementById('generate-report-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                this.generateReport();
            });
        }
    },

    generateReport: function() {
        const monthInput = document.getElementById('report-month');
        if (!monthInput || !monthInput.value) {
            Utils.showToast('Lutfen rapor donemi secin', 'warning');
            return;
        }

        const [year, month] = monthInput.value.split('-');
        const container = document.getElementById('report-container');
        
        container.innerHTML = '<p style="text-align: center; padding: 40px;">Rapor olusturuluyor...</p>';

        // Demo rapor verisi olustur
        const reportData = this.createDemoReport(parseInt(month), parseInt(year));
        this.renderReport(reportData, container);
    },

    createDemoReport: function(month, year) {
        const date = new Date(year, month - 1);
        const monthName = date.toLocaleDateString('tr-TR', { month: 'long' });
        const ayAdi = `${monthName} ${year}`;
        
        // Motor bazli uretim verileri (demo)
        const motorUretim = {
            'GM1': { uretim: 45000, tuketim: 38000, calismaSaat: 720 },
            'GM2': { uretim: 42000, tuketim: 36000, calismaSaat: 680 },
            'GM3': { uretim: 48000, tuketim: 40000, calismaSaat: 720 }
        };

        // Toplamlar
        let toplamUretim = 0;
        let toplamTuketim = 0;
        let toplamSaat = 0;

        Object.values(motorUretim).forEach(m => {
            toplamUretim += m.uretim;
            toplamTuketim += m.tuketim;
            toplamSaat += m.calismaSaat;
        });

        const verimlilik = ((toplamUretim - toplamTuketim) / toplamUretim * 100).toFixed(1);

        return {
            donem: ayAdi,
            toplamUretim,
            toplamTuketim,
            verimlilik,
            toplamSaat,
            motorUretim,
            bakimSayisi: 5,
            arizaSayisi: 2,
            cozulenAriza: 2
        };
    },

    renderReport: function(data, container) {
        const html = `
            <div class="report-content" style="background: white; padding: 30px; border-radius: 12px; box-shadow: var(--shadow);">
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid var(--primary-color);">
                    <h2 style="color: var(--primary-color); margin-bottom: 8px;">Kojenerasyon Raporu</h2>
                    <p style="color: var(--text-secondary); font-size: 18px;">${data.donem}</p>
                </div>

                <!-- Ozet Kartlar -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 700;">${(data.toplamUretim / 1000).toFixed(1)}</div>
                        <div style="font-size: 14px; opacity: 0.9;">Toplam Uretim (MWh)</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 700;">${(data.toplamTuketim / 1000).toFixed(1)}</div>
                        <div style="font-size: 14px; opacity: 0.9;">Toplam Tuketim (MWh)</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 700;">${data.verimlilik}%</div>
                        <div style="font-size: 14px; opacity: 0.9;">Verimlilik</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 700;">${Math.round(data.toplamSaat / 3)}</div>
                        <div style="font-size: 14px; opacity: 0.9;">Ort. Calisma Saati</div>
                    </div>
                </div>

                <!-- Motor Bazli Uretim -->
                <div style="margin-bottom: 30px;">
                    <h3 style="color: var(--text-primary); margin-bottom: 20px; font-size: 20px;">Motor Bazli Uretim</h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: var(--bg-color);">
                                    <th style="padding: 12px; text-align: left; border: 1px solid var(--border-color);">Motor</th>
                                    <th style="padding: 12px; text-align: right; border: 1px solid var(--border-color);">Uretim (MWh)</th>
                                    <th style="padding: 12px; text-align: right; border: 1px solid var(--border-color);">Tuketim (MWh)</th>
                                    <th style="padding: 12px; text-align: right; border: 1px solid var(--border-color);">Calisma Saati</th>
                                    <th style="padding: 12px; text-align: right; border: 1px solid var(--border-color);">Verim (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(data.motorUretim).map(([motor, deger]) => `
                                    <tr>
                                        <td style="padding: 12px; border: 1px solid var(--border-color); font-weight: 600;">${motor}</td>
                                        <td style="padding: 12px; text-align: right; border: 1px solid var(--border-color);">${(deger.uretim / 1000).toFixed(1)}</td>
                                        <td style="padding: 12px; text-align: right; border: 1px solid var(--border-color);">${(deger.tuketim / 1000).toFixed(1)}</td>
                                        <td style="padding: 12px; text-align: right; border: 1px solid var(--border-color);">${deger.calismaSaat}</td>
                                        <td style="padding: 12px; text-align: right; border: 1px solid var(--border-color);">${((deger.uretim - deger.tuketim) / deger.uretim * 100).toFixed(1)}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Bakim ve Ariza Ozeti -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                    <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; border: 1px solid #bbf7d0;">
                        <h4 style="color: #166534; margin-bottom: 12px;">Bakim Ozeti</h4>
                        <p style="color: #166534;"><strong>${data.bakimSayisi}</strong> adet bakim islemi gerceklestirildi</p>
                    </div>
                    <div style="background: #fef2f2; padding: 20px; border-radius: 10px; border: 1px solid #fecaca;">
                        <h4 style="color: #991b1b; margin-bottom: 12px;">Ariza Ozeti</h4>
                        <p style="color: #991b1b;"><strong>${data.arizaSayisi}</strong> ariza kaydedildi, <strong>${data.cozulenAriza}</strong> adet cozuldu</p>
                    </div>
                </div>

                <!-- Rapor Butonlari -->
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="window.print()" style="padding: 12px 24px; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        🖨️ Yazdir
                    </button>
                    <button onclick="Raporlar.downloadCSV()" style="padding: 12px 24px; background: var(--success-color); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        📥 CSV Indir
                    </button>
                    <button onclick="Raporlar.downloadPDF()" style="padding: 12px 24px; background: var(--danger-color); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        📄 PDF Indir
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;
        Utils.showToast('Rapor olusturuldu', 'success');
    },

    downloadCSV: function() {
        const monthInput = document.getElementById('report-month');
        const [year, month] = monthInput.value.split('-');
        
        // Demo CSV verisi
        const csv = [
            ['Motor', 'Uretim (kWh)', 'Tuketim (kWh)', 'Calisma Saati', 'Verimlilik (%)'],
            ['GM1', '45000', '38000', '720', '15.6'],
            ['GM2', '42000', '36000', '680', '14.3'],
            ['GM3', '48000', '40000', '720', '16.7'],
            ['TOPLAM', '135000', '114000', '2120', '15.6']
        ].map(row => row.join(';')).join('\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Kojenerasyon_Rapor_${year}_${month}.csv`;
        link.click();
        
        Utils.showToast('CSV indirildi', 'success');
    },

    downloadPDF: function() {
        // PDF indirme fonksiyonu (tarayici print ile yapilir)
        window.print();
    }
};

window.Raporlar = Raporlar;
