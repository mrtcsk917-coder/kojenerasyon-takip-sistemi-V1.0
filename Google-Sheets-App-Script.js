/**
 * GOOGLE SHEETS APP SCRIPT
 * API Key olmadan veri kaydetme/çekme sistemi
 * 
 * Kurulum:
 * 1. Google Sheets oluştur
 * 2. Apps Script -> New Project
 * 3. Bu kodu yapıştır
 * 4. Deploy -> New Deployment
 * 5. Web App olarak yayınla
 * 6. URL'yi config.js'e ekle
 */

function doPost(e) {
  try {
    // FormData'dan verileri al
    const action = e.parameter.action;
    const module = e.parameter.module;
    const timestamp = e.parameter.timestamp;
    
    // Veri objesini oluştur (action, module, timestamp hariç)
    const payload = {};
    Object.keys(e.parameter).forEach(key => {
      if (!['action', 'module', 'timestamp'].includes(key)) {
        payload[key] = e.parameter[key];
      }
    });
    
    // Sheet isimlerini belirle
    const sheetNames = {
      buhar: 'BuharVerileri'
    };
    
    const sheetName = sheetNames[module] || 'Veriler';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    // Sheet yoksa oluştur ve header'ları ekle
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      
      // Buhar verileri için header'ları oluştur
      if (module === 'buhar') {
        // Manuel olarak header'ları ekle
        sheet.getRange("A1").setValue("ID");
        sheet.getRange("B1").setValue("Tarih");
        sheet.getRange("C1").setValue("Saat");
        sheet.getRange("D1").setValue("Buhar Miktarı (ton)");
        sheet.getRange("E1").setValue("Notlar");
        sheet.getRange("F1").setValue("Kaydeden");
        sheet.getRange("G1").setValue("Kayıt Zamanı");
        
        // Formatla
        sheet.getRange("A1:G1").setFontWeight("bold");
        sheet.autoResizeColumn(1);
        sheet.autoResizeColumn(2);
        sheet.autoResizeColumn(3);
        sheet.autoResizeColumn(4);
        sheet.autoResizeColumn(5);
        sheet.autoResizeColumn(6);
        sheet.autoResizeColumn(7);
      }
    }
    
    let result;
    
    switch (action) {
      case 'save':
        result = saveRecord(sheet, payload);
        break;
        
      case 'update':
        result = updateRecord(sheet, payload.id, payload);
        break;
        
      case 'delete':
        result = deleteRecord(sheet, payload.id);
        break;
        
      case 'get':
        result = getRecords(sheet, payload.filters || {});
        break;
        
      case 'bulk_save':
        result = saveBulkRecords(sheet, payload);
        break;
        
      case 'test':
        result = { success: true, message: 'Bağlantı başarılı', timestamp: new Date().toISOString() };
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
 * Tek kayıt kaydet
 */
function saveRecord(sheet, data) {
  try {
    // Concurrency kontrolü - aynı anda sadece bir işlem
    const lockKey = sheet.getName() + '_save_lock';
    const lock = CacheService.getPublicCache().get(lockKey);
    
    if (lock !== null) {
      return {
        success: false,
        error: 'Lütfen bekleyin... Başka bir kayıt işlemi devam ediyor.',
        lockActive: true
      };
    }
    
    // Kilit oluştur
    CacheService.getPublicCache().put(lockKey, 'locked', 60); // 60 saniye
    
    // Headers'ı kontrol et
    const headers = getHeaders(sheet);
    
    // Aynı tarihli veri kontrolü
    if (data.date) {
      const existingData = sheet.getDataRange().getValues();
      const dateColumnIndex = headers.indexOf('Tarih');
      
      if (dateColumnIndex !== -1 && existingData.length > 1) {
        // Header hariç diğer satırları kontrol et
        for (let i = 1; i < existingData.length; i++) {
          const existingDate = existingData[i][dateColumnIndex];
          // Tarih formatlarını normalize et (her iki formatı da kontrol et)
          const normalizedExisting = existingDate ? existingDate.toString().replace(/\./g, '/').replace(/-/g, '/') : '';
          const normalizedNew = data.date.replace(/\./g, '/').replace(/-/g, '/');
          
          if (existingDate && normalizedExisting === normalizedNew) {
            // Kilidi serbest bırak
            CacheService.getPublicCache().remove(lockKey);
            
            return {
              success: false,
              error: 'Bu tarihte zaten kayıt mevcut: ' + data.date + '. Aynı tarihte birden fazla kayıt yapılamaz.',
              existingDate: existingDate.toString(),
              duplicateFound: true
            };
          }
        }
      }
    }
    
    // Yeni satır olarak ekle (header ve data eşleşmesi)
    const newRow = [];
    headers.forEach(header => {
      let value = '';
      
      // Header ve data eşleşmesi
      switch(header) {
        case 'Tarih':
          value = data.date || '';
          break;
        case 'Saat':
          value = data.time || '';
          break;
        case 'Buhar Miktarı (ton)':
          value = data.production || data.amount || '';
          break;
        case 'Notlar':
          value = data.notes || '';
          break;
        case 'Kaydeden':
          value = data.recordedBy || 'admin';
          break;
        case 'Kayıt Zamanı':
          value = data.timestamp || new Date().toLocaleString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          break;
        case 'ID':  // Yeni eklenen sütun
          value = data.id || Date.now().toString();
          break;
        default:
          value = data[header] || '';
      }
      
      newRow.push(value);
    });
    
    sheet.appendRow(newRow);
    
    // Kilidi serbest bırak
    CacheService.getPublicCache().remove(lockKey);
    
    return {
      success: true,
      message: 'Kayıt başarıyla eklendi',
      recordId: data.id,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Hata durumunda kilidi serbest bırak
    CacheService.getPublicCache().remove(lockKey);
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Kayıt güncelle
 */
function updateRecord(sheet, recordId, data) {
  try {
    const headers = getHeaders(sheet);
    const idColumnIndex = headers.indexOf('id');
    
    if (idColumnIndex === -1) {
      return { success: false, error: 'ID kolonu bulunamadı' };
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Kaydı bul
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) { // Header satırını atla
      if (values[i][idColumnIndex] === recordId) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Kayıt bulunamadı' };
    }
    
    // Güncelle
    headers.forEach((header, index) => {
      if (data[header] !== undefined) {
        sheet.getRange(rowIndex, index + 1).setValue(data[header]);
      }
    });
    
    return {
      success: true,
      message: 'Kayıt başarıyla güncellendi',
      recordId: recordId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Kayıt sil
 */
function deleteRecord(sheet, recordId) {
  try {
    const headers = getHeaders(sheet);
    const idColumnIndex = headers.indexOf('id');
    
    if (idColumnIndex === -1) {
      return { success: false, error: 'ID kolonu bulunamadı' };
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Kaydı bul
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) { // Header satırını atla
      if (values[i][idColumnIndex] === recordId) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Kayıt bulunamadı' };
    }
    
    // Sil
    sheet.deleteRow(rowIndex);
    
    return {
      success: true,
      message: 'Kayıt başarıyla silindi',
      recordId: recordId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Kayıtları getir
 */
/**
 * Kayıtları getir
 */
function getRecords(sheet, filters = {}) {
  try {
    const headers = getHeaders(sheet);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    let records = [];
    
    // Verileri işle (header satırını atla)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const record = {};
      
      // Tarih ve saat için değişkenler
      let dateValue = '';
      let timeValue = '';
      
      // Her header için doğru index'i kullan
      headers.forEach((header, headerIndex) => {
        let cellValue = row[headerIndex];

        if (cellValue instanceof Date) {
          // Eğer sadece saat ise - STRING olarak formatla
          if (header === 'Saat') {
            cellValue = Utilities.formatDate(
              cellValue,
              'Europe/Istanbul',
              'HH:mm'
            );
            timeValue = cellValue; // Saati sakla (string)
          } 
          // Tarih ise
          else if (header === 'Tarih') {
            cellValue = Utilities.formatDate(
              cellValue,
              'Europe/Istanbul',
              'yyyy-MM-dd'
            );
            dateValue = cellValue; // Tarihi sakla
          }
        }

        record[header] = cellValue || '';
      });
      
      // Sıralama için standart tarih formatı ekle
      if (dateValue && timeValue) {
        record.sortDate = dateValue + 'T' + timeValue + ':00'; // ISO format: yyyy-MM-ddTHH:mm:ss
      } else if (dateValue) {
        record.sortDate = dateValue + 'T00:00:00'; // Saat yoksa 00:00
      } else {
        record.sortDate = '1970-01-01T00:00:00'; // Hatalı tarih için en eski tarih
      }
      
      records.push(record);
    }
    
    // Debug için log ekle
    Logger.log('Çekilen kayıt sayısı: ' + records.length);
    if (records.length > 0) {
      Logger.log('İlk kayıt: ' + JSON.stringify(records[0]));
    }
    
    // Filtreleme
    if (filters.type === 'date_range') {
      records = records.filter(record => {
        const recordDate = new Date(record.date);
        const startDate = new Date(filters.start_date);
        const endDate = new Date(filters.end_date);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }
    
    if (filters.type === 'recent') {
      const limit = filters.limit || 10;
      records = records.slice(-limit).reverse();
    }
    
    // Sadece bugünün verilerini getir
    if (filters.type === 'today') {
      const today = new Date();
      const todayString = Utilities.formatDate(today, 'Europe/Istanbul', 'yyyy-MM-dd');
      
      records = records.filter(record => {
        return record.date === todayString;
      }).reverse();
    }
    
    if (filters.type === 'statistics') {
      const stats = calculateStatistics(records);
      return {
        success: true,
        data: stats,
        count: records.length,
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      success: true,
      data: records,
      count: records.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    Logger.log('getRecords hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Sheet headers'ını getir
 */
function getHeaders(sheet) {
  try {
    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    return headerRow.map(header => header.toString().trim());
  } catch (error) {
    // Eğer sheet boşsa, manuel header'ları dön
    if (sheet.getName() === 'BuharVerileri') {
      return ['ID', 'Tarih', 'Saat', 'Buhar Miktarı (ton)', 'Notlar', 'Kaydeden', 'Kayıt Zamanı'];
    }
    return [];
  }
}

/**
 * İstatistik hesapla
 */
function calculateStatistics(records) {
  const stats = {
    totalRecords: records.length,
    lastUpdated: new Date().toISOString()
  };
  
  // Modüle göre özel istatistikler
  if (records.length > 0) {
    const firstRecord = records[0];
    
    if (firstRecord.amount !== undefined) {
      // Buhar verileri için
      stats.totalAmount = records.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      stats.avgAmount = stats.totalAmount / records.length;
    }
    
    if (firstRecord.pressure !== undefined) {
      // Kojen motor verileri için
      stats.avgPressure = records.reduce((sum, r) => sum + (parseFloat(r.pressure) || 0), 0) / records.length;
    }
  }
  
  return stats;
}

/**
 * doGet - Test için
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Google Sheets App Script çalışıyor',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })).setMimeType(ContentService.MimeType.JSON);
}
