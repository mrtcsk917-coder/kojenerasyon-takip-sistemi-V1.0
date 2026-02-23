/**
 * ============================================
 * VARDİYA TAKİBİ - GOOGLE SHEETS APP SCRIPT
 * ============================================
 * 
 * Kurulum:
 * 1. Google Sheets oluşturun -> "Kojenerasyon_Vardiyalar" adı verin
 * 2. Uzantılar > Apps Script
 * 3. Bu kodu yapıştırın
 * 4. Dağıt > Yeni dağıtım
 * 5. Web uygulaması olarak yayınla (Herkes erişebilir)
 * 6. URL'yi config.js'e ekleyin
 * 
 * Sheet yapısı otomatik oluşturulur:
 * - ID, Tarih, VardiyaTipi, SorumluPersonel, YardimciPersonel, Isler, Notlar, KayitZamani
 */

/**
 * Tarih formatını Türkçe'ye çevir
 */
function formatDateToTurkish(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}

/**
 * POST isteklerini işle
 */
function doPost(e) {
  try {
    const action = e.parameter.action;
    const vardiyaData = JSON.parse(e.parameter.data || '{}');
    
    // Sheet hazırla
    const sheet = getOrCreateSheet();
    
    let result;
    
    switch(action) {
      case 'getAllVardiyalar':
        result = getAllVardiyalar(sheet);
        break;
        
      case 'getVardiyaByDate':
        result = getVardiyaByDate(sheet, vardiyaData.tarih);
        break;
        
      case 'saveVardiya':
        result = saveVardiya(sheet, vardiyaData);
        break;
        
      case 'updateVardiya':
        result = updateVardiya(sheet, vardiyaData);
        break;
        
      case 'deleteVardiya':
        result = deleteVardiya(sheet, vardiyaData.id);
        break;
        
      case 'getVardiyalarByDateRange':
        result = getVardiyalarByDateRange(sheet, vardiyaData.baslangic, vardiyaData.bitis);
        break;
        
      case 'test':
        result = { success: true, message: 'Vardiya API çalışıyor', timestamp: new Date().toISOString() };
        break;
        
      default:
        result = { success: false, error: 'Bilinmeyen işlem: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Hata: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET isteklerini işle (test için)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Vardiya Takibi API çalışıyor',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    actions: ['getAllVardiyalar', 'getVardiyaByDate', 'saveVardiya', 'updateVardiya', 'deleteVardiya', 'getVardiyalarByDateRange']
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Sheet oluştur veya mevcut olanı al
 */
function getOrCreateSheet() {
  const sheetName = "Vardiyalar";
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
    
    // Başlıkları ekle
    const headers = [
      'ID',
      'Tarih',
      'Tarih_TR', // Türkçe tarih
      'VardiyaTipi',
      'SorumluPersonel',
      'YardimciPersonel',
      'Isler',
      'Notlar',
      'KayitZamani'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
         .setFontWeight('bold')
         .setBackground('#f0f0f0');
         
    // Sütun genişliklerini ayarla
    sheet.autoResizeColumns();
    
    Logger.log('Vardiyalar sheeti oluşturuldu');
  }
  
  return sheet;
}

/**
 * Tüm vardiyaları getir
 */
function getAllVardiyalar(sheet) {
  try {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const vardiyalar = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const vardiya = {};
      
      headers.forEach((header, index) => {
        vardiya[header] = row[index] || '';
      });
      
      // Frontend uyumlu formata çevir
      vardiyalar.push({
        id: vardiya['ID'] || vardiya['id'] || '',
        tarih: vardiya['Tarih'] || vardiya['tarih'] || '',
        tarih_tr: vardiya['Tarih_TR'] || vardiya['tarih_tr'] || '',
        vardiya_tipi: vardiya['VardiyaTipi'] || vardiya['vardiya_tipi'] || '',
        sorumlu_personel: vardiya['SorumluPersonel'] || vardiya['sorumlu_personel'] || '',
        yardimci_personel: vardiya['YardimciPersonel'] || vardiya['yardimci_personel'] || '',
        isler: vardiya['Isler'] ? vardiya['Isler'].split(', ').filter(is => is.trim()) : [],
        notlar: vardiya['Notlar'] || vardiya['notlar'] || '',
        kayitZamani: vardiya['KayitZamani'] || vardiya['kayitZamani'] || ''
      });
    }
    
    return {
      success: true,
      vardiyalar: vardiyalar,
      count: vardiyalar.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tarihe göre vardiya getir
 */
function getVardiyaByDate(sheet, data) {
  try {
    if (!data.tarih) {
      return { success: false, error: 'Tarih gerekli' };
    }
    
    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData[0];
    const tarihIndex = headers.indexOf('Tarih');
    const vardiyaTipiIndex = headers.indexOf('VardiyaTipi');
    
    if (tarihIndex === -1) {
      return { success: false, error: 'Tarih kolonu bulunamadi' };
    }
    
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][tarihIndex] === data.tarih) {
        const row = sheetData[i];
        const vardiya = {};
        
        headers.forEach((header, index) => {
          vardiya[header] = row[index] || '';
        });
        
        // Frontend uyumlu formata çevir
        return {
          success: true,
          vardiya: {
            id: vardiya['ID'] || vardiya['id'] || '',
            tarih: vardiya['Tarih'] || vardiya['tarih'] || '',
            tarih_tr: vardiya['Tarih_TR'] || vardiya['tarih_tr'] || '',
            vardiya_tipi: vardiya['VardiyaTipi'] || vardiya['vardiya_tipi'] || '',
            sorumlu_personel: vardiya['SorumluPersonel'] || vardiya['sorumlu_personel'] || '',
            yardimci_personel: vardiya['YardimciPersonel'] || vardiya['yardimci_personel'] || '',
            isler: vardiya['Isler'] ? vardiya['Isler'].split(', ').filter(is => is.trim()) : [],
            notlar: vardiya['Notlar'] || vardiya['notlar'] || '',
            kayitZamani: vardiya['KayitZamani'] || vardiya['kayitZamani'] || ''
          }
        };
      }
    }
    
    return { success: false, error: 'Vardiya bulunamadi' };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Yeni vardiya kaydet
 */
function saveVardiya(sheet, vardiyaData) {
  try {
    // Zorunlu alan kontrolü
    if (!vardiyaData.tarih || !vardiyaData.sorumlu_personel) {
      return { success: false, error: 'Tarih ve sorumlu personel zorunlu' };
    }
    
    // ID kontrolü
    if (!vardiyaData.id) {
      vardiyaData.id = Date.now().toString();
    }
    
    // Türkçe tarih formatı
    const turkishDate = formatDateToTurkish(vardiyaData.tarih);
    
    // Yeni satır olarak ekle
    const newRow = [
      vardiyaData.id,
      vardiyaData.tarih,
      turkishDate, // Türkçe tarih
      vardiyaData.vardiya_tipi,
      vardiyaData.sorumlu_personel,
      vardiyaData.yardimci_personel || '',
      vardiyaData.isler ? vardiyaData.isler.join(', ') : '',
      vardiyaData.notlar || '',
      vardiyaData.kayitZamani || new Date().toISOString()
    ];
    
    sheet.appendRow(newRow);
    
    return { 
      success: true, 
      message: 'Vardiya başarıyla kaydedildi',
      vardiyaId: vardiyaData.id,
      turkishDate: turkishDate
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Vardiya güncelle
 */
function updateVardiya(sheet, vardiyaData) {
  try {
    if (!vardiyaData.id) {
      return { success: false, error: 'Güncellenecek vardiya ID gerekli' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('ID');
    
    // Vardiyayı bul
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === vardiyaData.id) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Güncellenecek vardiya bulunamadı: ' + vardiyaData.id };
    }
    
    // Güncelleme yap
    const now = new Date().toLocaleString('tr-TR');
    
    if (vardiyaData.vardiya_tipi !== undefined) {
      const tipIndex = headers.indexOf('VardiyaTipi');
      sheet.getRange(rowIndex, tipIndex + 1).setValue(vardiyaData.vardiya_tipi);
    }
    
    if (vardiyaData.sorumlu_personel !== undefined) {
      const sorumluIndex = headers.indexOf('SorumluPersonel');
      sheet.getRange(rowIndex, sorumluIndex + 1).setValue(vardiyaData.sorumlu_personel);
    }
    
    if (vardiyaData.yardimci_personel !== undefined) {
      const yardimciIndex = headers.indexOf('YardimciPersonel');
      sheet.getRange(rowIndex, yardimciIndex + 1).setValue(vardiyaData.yardimci_personel);
    }
    
    if (vardiyaData.isler !== undefined) {
      const islerIndex = headers.indexOf('Isler');
      const islerString = JSON.stringify(vardiyaData.isler);
      sheet.getRange(rowIndex, islerIndex + 1).setValue(islerString);
    }
    
    if (vardiyaData.notlar !== undefined) {
      const notlarIndex = headers.indexOf('Notlar');
      sheet.getRange(rowIndex, notlarIndex + 1).setValue(vardiyaData.notlar);
    }
    
    // Kayıt zamanını güncelle
    const kayitIndex = headers.indexOf('KayitZamani');
    sheet.getRange(rowIndex, kayitIndex + 1).setValue(now);
    
    Logger.log('Vardiya güncellendi: ' + vardiyaData.id);
    
    return {
      success: true,
      message: 'Vardiya başarıyla güncellendi',
      vardiyaId: vardiyaData.id,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Vardiya sil
 */
function deleteVardiya(sheet, id) {
  try {
    if (!id) {
      return { success: false, error: 'Silinecek vardiya ID gerekli' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('ID');
    
    // Vardiyayı bul
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === id) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Silinecek vardiya bulunamadı: ' + id };
    }
    
    // Sil
    sheet.deleteRow(rowIndex);
    
    Logger.log('Vardiya silindi: ' + id);
    
    return {
      success: true,
      message: 'Vardiya başarıyla silindi',
      vardiyaId: id,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Tarih aralığına göre vardiyaları getir
 */
function getVardiyalarByDateRange(sheet, baslangic, bitis) {
  try {
    if (!baslangic || !bitis) {
      return { success: false, error: 'Başlangıç ve bitiş tarihleri gerekli' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const tarihIndex = headers.indexOf('Tarih');
    
    if (tarihIndex === -1) {
      return { success: false, error: 'Tarih kolonu bulunamadı' };
    }
    
    const vardiyalar = [];
    
    for (let i = 1; i < data.length; i++) {
      const rowTarih = data[i][tarihIndex];
      
      // Tarih aralığında mı kontrol et
      if (rowTarih >= baslangic && rowTarih <= bitis) {
        const vardiya = {};
        headers.forEach((header, index) => {
          vardiya[header] = data[i][index] || '';
        });
        
        // İşler string'ini JSON'a çevir
        if (vardiya.Isler && typeof vardiya.Isler === 'string') {
          try {
            vardiya.Isler = JSON.parse(vardiya.Isler);
          } catch (e) {
            vardiya.Isler = [];
          }
        }
        
        vardiyalar.push(vardiya);
      }
    }
    
    return {
      success: true,
      vardiyalar: vardiyalar,
      count: vardiyalar.length,
      tarihAraligi: { baslangic: baslangic, bitis: bitis },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
