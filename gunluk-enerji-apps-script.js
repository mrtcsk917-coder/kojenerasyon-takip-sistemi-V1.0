/**
 * GOOGLE SHEETS APP SCRIPT - Günlük Enerji Verileri
 * Google Apps Script tarafında çalışacak kod
 * 
 * Kurulum:
 * 1. Google Sheets açın
 * 2. Uzantılar > Apps Script
 * 3. Bu kodu yapıştırın
 * 4. Kaydedin ve dağıtın (Web App olarak)
 * 5. Web app URL'sini kopyalayın
 */

// Global değişkenler
const SHEET_NAME = "Günlük Enerji";
const HEADER_ROW = [
  "Tarih",
  "Yağ Seviyesi (L)",
  "Kuplaj (MW)",
  "GM-1 (MW)",
  "GM-2 (MW)", 
  "GM-3 (MW)",
  "İç İhtiyaç (MW)",
  "1. Redresör (MW)",
  "2. Redresör (MW)",
  "Kojen İç İhtiyaç (kW)",
  "Servis Trafosu (MW)",
  "Kayıt Zamanı",
  "Kaydeden",
  "Düzenleyen",
  "Düzenleme Zamanı",
  "Düzenlenmiş Değer"
];

/**
 * doGet - GET isteklerini yönetir
 */
function doGet(e) {
  return HtmlService.createHtmlOutput("Günlük Enerji API - POST only");
}

/**
 * doPost - POST isteklerini yönetir (Ana fonksiyon)
 */
function doPost(e) {
  try {
    const params = e.parameter;
    const action = params.action || 'save';
    const module = params.module || 'daily-energy';
    
    // Modüle göre işlem yönlendir
    switch (module) {
      case 'daily-energy':
        return handleDailyEnergy(params, action);
      default:
        return createResponse(false, 'Bilinmeyen modül: ' + module);
    }
    
  } catch (error) {
    Logger.log('POST Error: ' + error.toString());
    return createResponse(false, 'Sunucu hatası: ' + error.message);
  }
}

/**
 * Günlük enerji verilerini yönetir
 */
function handleDailyEnergy(params, action) {
  try {
    switch (action) {
      case 'save':
        return saveDailyEnergyData(params);
      case 'upsert':
        return saveDailyEnergyData(params); // upsert = save (tarih kontrolü içinde)
      case 'get':
        return getDailyEnergyData(params);
      case 'list':
        return listDailyEnergyData(params);
      case 'update':
        return updateDailyEnergyData(params);
      default:
        return createResponse(false, 'Bilinmeyen işlem: ' + action);
    }
  } catch (error) {
    Logger.log('Daily Energy Error: ' + error.toString());
    return createResponse(false, 'İşlem hatası: ' + error.message);
  }
}

/**
 * Günlük enerji verisini kaydeder
 */
function saveDailyEnergyData(params) {
  try {
    Logger.log('=== SAVE DAILY ENERGY DEBUG ===');
    Logger.log('Gelen params:', JSON.stringify(params));
    Logger.log('Action parametresi:', params.action);
    
    // Verileri doğrula
    const requiredFields = ['date', 'timestamp'];
    for (const field of requiredFields) {
      if (!params[field]) {
        return createResponse(false, 'Eksik alan: ' + field);
      }
    }
    
    // Tarihi olduğu gibi kullan (UTC sorunu olmasın diye)
    const formattedDate = params.date; // JavaScript'ten gelen YYYY-MM-DD formatı
    const sheetDate = new Date(params.date); // Sheet'e yazılacak Date objesi
    Logger.log('Formatlanmış tarih (string):', formattedDate);
    Logger.log('Sheet\'e yazılacak Date objesi:', sheetDate);
    
    // Zaman damgasını formatla
    const timestampObj = new Date(params.timestamp);
    const formattedTimestamp = timestampObj.toISOString();
    
    // Veriyi hazırla
    const rowData = [
      sheetDate, // Her zaman Date objesi
      params.yagSeviyesi || '0',
      params.kuplaj || '0',
      params.gm1 || '0',
      params.gm2 || '0',
      params.gm3 || '0',
      params.icIhtiyac || '0',
      params.redresor1 || '0',
      params.redresor2 || '0',
      params.kojenIcIhtiyac || '0',
      params.servisTrafo || '0',
      formattedTimestamp,
      params.kaydeden || 'Bilinmeyen'
    ];
    
    // Spreadsheet'e kaydet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    // Sayfa yoksa oluştur
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.getRange(1, 1, 1, HEADER_ROW.length).setValues([HEADER_ROW]);
      sheet.getRange("A1:R1").setFontWeight("bold").setBackground("#4285f4").setFontColor("white");
    }
    
    // Tarih kontrolü - aynı tarihte kayıt var mı?
    Logger.log('=== TARİH KONTROLÜ DEBUG ===');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dateIndex = headers.indexOf("Tarih");
    Logger.log('Headers:', headers);
    Logger.log('Date index:', dateIndex);
    Logger.log('Toplam satır sayısı:', data.length);
    Logger.log('Aranan tarih:', formattedDate);
    
    let existingRow = -1;
    let existingData = null;
    
    for (let i = 1; i < data.length; i++) {
      const rowDate = data[i][dateIndex];
      Logger.log(`Satır ${i} tarihi: "${rowDate}" - Aranan: "${formattedDate}"`);
      Logger.log(`Satır ${i} tarih tipi: ${typeof rowDate} - Date mi?: ${rowDate instanceof Date}`);
      
      // Tarih karşılaştırması - Google Sheets Date objesi için
      if (rowDate) {
        let rowDateStr;
        
        // Eğer Date objesi ise, JavaScript formatına çevir
        if (rowDate instanceof Date) {
          // Date objesini YYYY-MM-DD formatına çevir (UTC olmadan)
          const year = rowDate.getFullYear();
          const month = String(rowDate.getMonth() + 1).padStart(2, '0');
          const day = String(rowDate.getDate()).padStart(2, '0');
          rowDateStr = `${year}-${month}-${day}`;
          Logger.log(`Date objesi -> YYYY-MM-DD format: "${rowDateStr}"`);
        } else {
          // Eğer string ise, ISO formatından tarih kısmını al
          rowDateStr = rowDate.toString().split('T')[0];
          Logger.log(`String -> format: "${rowDateStr}"`);
        }
        
        Logger.log(`Karşılaştırma: "${rowDateStr}" vs "${formattedDate}"`);
        
        if (rowDateStr === formattedDate) {
          existingRow = i + 1; // +1 çünkü range 1-tabanlı
          existingData = data[i];
          Logger.log('EŞLEŞME BULUNDU! Satır:', existingRow);
          Logger.log('Mevcut veri:', existingData);
          break;
        }
      }
    }
    
    if (existingRow > 0) {
      // Mevcut kayıt varsa direkt güncelle (Web App'te onay gösterilemez)
      
      // Değişen alanları tespit et
      const currentData = data[existingRow - 1]; // Mevcut veri (0-tabanlı)
      const changedFields = [];
      
      // Alanları karşılaştır ve değişenleri bul
      const fieldMappings = [
        {key: 'yagSeviyesi', index: 1, name: 'Yağ Seviyesi'},
        {key: 'kuplaj', index: 2, name: 'Kuplaj'},
        {key: 'gm1', index: 3, name: 'GM-1'},
        {key: 'gm2', index: 4, name: 'GM-2'},
        {key: 'gm3', index: 5, name: 'GM-3'},
        {key: 'icIhtiyac', index: 6, name: 'İç İhtiyaç'},
        {key: 'redresor1', index: 7, name: '1. Redresör'},
        {key: 'redresor2', index: 8, name: '2. Redresör'},
        {key: 'kojenIcIhtiyac', index: 9, name: 'Kojen İç İhtiyaç'},
        {key: 'servisTrafo', index: 10, name: 'Servis Trafosu'}
      ];
      
      fieldMappings.forEach(field => {
        const newValue = params[field.key] || '0';
        const oldValue = currentData[field.index] || '0';
        
        if (newValue.toString() !== oldValue.toString()) {
          changedFields.push(`${field.name}: ${oldValue} → ${newValue}`);
        }
      });
      
      const changedFieldsStr = changedFields.length > 0 ? changedFields.join(', ') : 'Değişiklik yok';
      
      const updateRowData = [
        sheetDate, // Her zaman Date objesi
        params.yagSeviyesi || '0',
        params.kuplaj || '0',
        params.gm1 || '0',
        params.gm2 || '0',
        params.gm3 || '0',
        params.icIhtiyac || '0',
        params.redresor1 || '0',
        params.redresor2 || '0',
        params.kojenIcIhtiyac || '0',
        params.servisTrafo || '0',
        formattedTimestamp,
        params.kaydeden || 'Bilinmeyen',
        params.kaydeden || 'Bilinmeyen', // Düzenleyen
        new Date().toISOString(), // Düzenleme Zamanı
        changedFieldsStr // Düzenlenmiş Değer
      ];
      
      sheet.getRange(existingRow, 1, 1, updateRowData.length).setValues([updateRowData]);
      
      return createResponse(true, 'Mevcut kayıt başarıyla güncellendi', {
        row: existingRow,
        date: formattedDate,
        timestamp: formattedTimestamp,
        action: 'updated'
      });
    }
    
    // Yeni kayıt - son satıra ekle
    const lastRow = sheet.getLastRow();
    const newRowData = [
      formattedDate,
      params.yagSeviyesi || '0',
      params.kuplaj || '0',
      params.gm1 || '0',
      params.gm2 || '0',
      params.gm3 || '0',
      params.icIhtiyac || '0',
      params.redresor1 || '0',
      params.redresor2 || '0',
      params.kojenIcIhtiyac || '0',
      params.servisTrafo || '0',
      formattedTimestamp,
      params.kaydeden || 'Bilinmeyen',
      '', // Düzenleyen (yeni kayıt olduğu için boş)
      '', // Düzenleme Zamanı
      ''  // Düzenlenmiş Değer
    ];
    
    sheet.getRange(lastRow + 1, 1, 1, newRowData.length).setValues([newRowData]);
    
    // Başarı mesajı
    return createResponse(true, 'Veri başarıyla kaydedildi', {
      row: lastRow + 1,
      date: formattedDate,
      timestamp: formattedTimestamp
    });
    
  } catch (error) {
    Logger.log('Save Error: ' + error.toString());
    return createResponse(false, 'Kaydetme hatası: ' + error.message);
  }
}

/**
 * Tarihi Türkçe formatına çevirir (DD.MM.YYYY)
 */
function formatDateTurkish(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Tarih ve saati Türkçe formatına çevirir (DD.MM.YYYY HH:mm:ss)
 */
function formatDateTimeTurkish(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Günlük enerji verilerini getirir
 */
function getDailyEnergyData(params) {
  try {
    const date = params.date;
    if (!date) {
      return createResponse(false, 'Tarih parametresi gerekli');
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return createResponse(false, 'Sayfa bulunamadı');
    }
    
    // Tüm verileri al
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Tarihe göre ara
    const dateIndex = headers.indexOf('Tarih');
    if (dateIndex === -1) {
      return createResponse(false, 'Tarih sütunu bulunamadı');
    }
    
    const results = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][dateIndex] === date) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = data[i][index];
        });
        results.push(row);
      }
    }
    
    return createResponse(true, results.length + ' kayıt bulundu', {
      data: results,
      count: results.length
    });
    
  } catch (error) {
    Logger.log('Get Error: ' + error.toString());
    return createResponse(false, 'Veri getirme hatası: ' + error.message);
  }
}

/**
 * Tüm günlük enerji verilerini listeler
 */
function listDailyEnergyData(params) {
  try {
    const limit = parseInt(params.limit) || 100;
    const offset = parseInt(params.offset) || 0;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return createResponse(false, 'Sayfa bulunamadı');
    }
    
    // Verileri al
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Sayfalama
    const startRow = Math.min(offset + 1, data.length);
    const endRow = Math.min(startRow + limit, data.length);
    
    const results = [];
    for (let i = startRow; i < endRow; i++) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = data[i][index];
      });
      results.push(row);
    }
    
    return createResponse(true, results.length + ' kayıt listelendi', {
      data: results,
      count: results.length,
      total: data.length - 1, // Header hariç
      offset: offset,
      limit: limit
    });
    
  } catch (error) {
    Logger.log('List Error: ' + error.toString());
    return createResponse(false, 'Listeleme hatası: ' + error.message);
  }
}

/**
 * Standart API yanıtı oluşturur
 */
function createResponse(success, message, data = null) {
  const response = {
    success: success,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  if (data) {
    response.data = data;
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test fonksiyonu - Geliştirme için
 */
function testDailyEnergyAPI() {
  const testData = {
    action: 'save',
    module: 'daily-energy',
    date: '2026-02-22',
    yagSeviyesi: '85.5',
    kuplaj: '2.5',
    gm1: '3.2',
    gm2: '3.1',
    gm3: '3.0',
    icIhtiyac: '0.8',
    redresor1: '1.2',
    redresor2: '1.1',
    kojenIcIhtiyac: '150',
    servisTrafo: '0.5',
    timestamp: new Date().toISOString(),
    kaydeden: 'Admin'
  };
  
  return handleDailyEnergy(testData, 'save');
}

/**
 * Sayfayı temizle ve yeniden oluştur
 */
function resetDailyEnergySheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (sheet) {
      ss.deleteSheet(sheet);
    }
    
    // Yeni sayfa oluştur
    const newSheet = ss.insertSheet(SHEET_NAME);
    newSheet.getRange(1, 1, 1, HEADER_ROW.length).setValues([HEADER_ROW]);
    newSheet.getRange("A1:R1").setFontWeight("bold").setBackground("#4285f4").setFontColor("white");
    
    return createResponse(true, 'Sayfa sıfırlandı ve yeniden oluşturuldu');
  } catch (error) {
    return createResponse(false, 'Sıfırlama hatası: ' + error.message);
  }
}

/**
 * Günlük enerji verisini günceller
 */
function updateDailyEnergyData(params) {
  try {
    // Gerekli alanları doğrula
    const requiredFields = ['date', 'editor', 'oldValues', 'newValues'];
    for (const field of requiredFields) {
      if (!params[field]) {
        return createResponse(false, 'Eksik alan: ' + field);
      }
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return createResponse(false, 'Sayfa bulunamadı');
    }
    
    // Tüm verileri al
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Tarih sütununun index'ini bul
    const dateIndex = headers.indexOf("Tarih");
    if (dateIndex === -1) {
      return createResponse(false, 'Tarih sütunu bulunamadı');
    }
    
    // Güncellenecek satırı bul
    let updatedRows = 0;
    for (let i = 1; i < data.length; i++) {
      const rowDate = data[i][dateIndex];
      
      // Tarih eşleşiyorsa güncelle
      if (rowDate && rowDate.toString() === params.date) {
        const row = data[i];
        
        // Değişen alanları bul
        const oldValues = JSON.parse(params.oldValues);
        const newValues = JSON.parse(params.newValues);
        const changedFields = [];
        
        for (const [key, newValue] of Object.entries(newValues)) {
          if (oldValues[key] !== newValue) {
            changedFields.push(`${key}: ${oldValues[key]} → ${newValue}`);
          }
        }
        
        // Sütun index'lerini bul
        const editorIndex = headers.indexOf("Düzenleyen");
        const editTimeIndex = headers.indexOf("Düzenleme Zamanı");
        const editedValueIndex = headers.indexOf("Düzenlenmiş Değer");
        
        // Değerleri güncelle
        row[editorIndex] = params.editor;
        row[editTimeIndex] = new Date().toISOString();
        row[editedValueIndex] = changedFields.join(", ");
        
        // Satırı güncelle
        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        updatedRows++;
      }
    }
    
    if (updatedRows === 0) {
      return createResponse(false, 'Güncellenecek kayıt bulunamadı');
    }
    
    return createResponse(true, `${updatedRows} kayıt başarıyla güncellendi`);
    
  } catch (error) {
    Logger.log('Update Error: ' + error.toString());
    return createResponse(false, 'Güncelleme hatası: ' + error.message);
  }
}
