/**
 * SAATLIK ENERJI VERILERI ICIN GOOGLE SHEETS APP SCRIPT
 * Sadece saatlik enerji verileri için özel kod
 * 
 * Kurulum:
 * 1. Yeni Google Sheets oluştur
 * 2. Apps Script -> New Project  
 * 3. Bu kodu yapıştır
 * 4. Deploy -> New Deployment
 * 5. Web App olarak yayınla
 * 6. URL'yi config.js'e saatlik olarak ekle
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
      saatlik: 'SaatlikEnerjiVerileri'
    };
    
    const sheetName = sheetNames[module] || 'Veriler';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    // Sheet yoksa oluştur ve header'ları ekle
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      
      // Saatlik enerji verileri için header'ları oluştur
      if (module === 'saatlik') {
        // Manuel olarak header'ları ekle
        sheet.getRange("A1").setValue("ID");
        sheet.getRange("B1").setValue("Tarih");
        sheet.getRange("C1").setValue("Vardiya");
        sheet.getRange("D1").setValue("Saat");
        sheet.getRange("E1").setValue("Aktif Enerji (MWh)");
        sheet.getRange("F1").setValue("Reaktif Enerji (kVArh)");
        sheet.getRange("G1").setValue("Aydem Aktif");
        sheet.getRange("H1").setValue("Aydem Reaktif");
        sheet.getRange("I1").setValue("Operator");
        sheet.getRange("J1").setValue("Kayıt Zamanı");
        sheet.getRange("K1").setValue("Güncelleme Zamanı");
        sheet.getRange("L1").setValue("Güncelleyen");
        sheet.getRange("M1").setValue("Orijinal Kayıt Zamanı");
        sheet.getRange("N1").setValue("Orijinal Operator");
        
        // Formatla
        sheet.getRange("A1:N1").setFontWeight("bold");
        for (let i = 1; i <= 14; i++) {
          sheet.autoResizeColumn(i);
        }
      }
    }
    
    let result;
    
    switch (action) {
      case 'save':
        result = saveHourlyRecord(sheet, payload);
        break;
        
      case 'save_bulk':
        result = saveBulkHourlyRecords(sheet, payload);
        break;
        
      case 'get':
        result = getHourlyRecords(sheet, payload.filters || {});
        break;
        
      case 'update':
        // ✅ ID kontrolü yap
        if (!payload.id) {
          result = { success: false, error: 'Update için ID gerekli' };
        } else {
          result = updateHourlyRecord(sheet, payload.id, payload);
        }
        break;
        
      case 'delete':
        result = deleteHourlyRecord(sheet, payload.id);
        break;
        
      case 'test':
        result = { success: true, message: 'Saatlik enerji bağlantısı başarılı', timestamp: new Date().toISOString() };
        break;
        
      default:
        result = { success: false, error: 'Bilinmeyen işlem: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Saatlik enerji hatası: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Saatlik tek kayıt kaydet
 */
function saveHourlyRecord(sheet, data) {
  try {
    // Concurrency kontrolü
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
    const headers = getHourlyHeaders(sheet);
    
    // Aynı tarih, vardiya ve saatte veri kontrolü
    if (data.date && data.shift && data.hour) {
      const existingData = sheet.getDataRange().getValues();
      const dateColumnIndex = headers.indexOf('Tarih');
      const shiftColumnIndex = headers.indexOf('Vardiya');
      const hourColumnIndex = headers.indexOf('Saat');
      
      if (existingData.length > 1) {
        // Header hariç diğer satırları kontrol et
        for (let i = 1; i < existingData.length; i++) {
          const existingDate = existingData[i][dateColumnIndex];
          const existingShift = existingData[i][shiftColumnIndex];
          const existingHour = existingData[i][hourColumnIndex];
          
          // Tarih formatlarını normalize et
          const normalizedExisting = existingDate ? existingDate.toString().replace(/\./g, '/').replace(/-/g, '/') : '';
          const normalizedNew = data.date.replace(/\./g, '/').replace(/-/g, '/');
          
          if (existingDate && normalizedExisting === normalizedNew && 
              existingShift === data.shift && 
              existingHour === data.hour) {
            // Kilidi serbest bırak
            CacheService.getPublicCache().remove(lockKey);
            
            return {
              success: false,
              error: `Bu tarih, vardiya ve saatte zaten kayıt mevcut: ${data.date} ${data.shift} ${data.hour}`,
              duplicateFound: true
            };
          }
        }
      }
    }
    
    // Yeni satır olarak ekle
    const newRow = [];
    headers.forEach(header => {
      let value = '';
      
      // Header ve data eşleşmesi
      switch(header) {
        case 'ID':
          value = data.id || Date.now().toString();
          break;
        case 'Tarih':
          value = data.date || '';
          break;
        case 'Vardiya':
          value = data.shift || '';
          break;
        case 'Saat':
          value = data.hour || '';
          break;
        case 'Aktif Enerji (MWh)':
          value = data.aktif || '';
          break;
        case 'Reaktif Enerji (kVArh)':
          value = data.reaktif || '';
          break;
        case 'Aydem Aktif':
          value = data.aydemAktif || '';
          break;
        case 'Aydem Reaktif':
          value = data.aydemReaktif || '';
          break;
        case 'Operator':
          value = data.operator || 'Bilinmeyen';
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
        case 'Güncelleme Zamanı':
          value = data.updatedAt || '';
          break;
        case 'Güncelleyen':
          value = data.editedBy || '';
          break;
        case 'Orijinal Kayıt Zamanı':
          value = data.originalTimestamp || '';
          break;
        case 'Orijinal Operator':
          value = data.originalOperator || '';
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
      message: 'Saatlik enerji verisi başarıyla kaydedildi',
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
 * Saatlik çoklu kayıt kaydet
 */
function saveBulkHourlyRecords(sheet, data) {
  try {
    const records = data.records || [];
    let successCount = 0;
    let errorCount = 0;
    let errors = [];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const result = saveHourlyRecord(sheet, record);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        errors.push(`${record.hour}: ${result.error}`);
      }
    }
    
    return {
      success: true,
      message: `${successCount} kayıt başarıyla kaydedildi, ${errorCount} kayıt hatalı`,
      successCount: successCount,
      errorCount: errorCount,
      errors: errors,
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
 * Saatlik kayıtları getir
 */
function getHourlyRecords(sheet, filters = {}) {
  try {
    const headers = getHourlyHeaders(sheet);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    let records = [];
    
    // Verileri işle (header satırını atla)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const record = {};
      
      // Her header için doğru index'i kullan
      headers.forEach((header, headerIndex) => {
        let cellValue = row[headerIndex];

        if (cellValue instanceof Date) {
          // Tarih ve saat formatlama
          if (header === 'Kayıt Zamanı') {
            cellValue = Utilities.formatDate(
              cellValue,
              'Europe/Istanbul',
              'dd.MM.yyyy HH:mm:ss'
            );
          } else if (header === 'Tarih') {
            cellValue = Utilities.formatDate(
              cellValue,
              'Europe/Istanbul',
              'yyyy-MM-dd'
            );
          }
        }

        record[header] = cellValue || '';
      });
      
      records.push(record);
    }
    
    // Filtreleme
    if (filters.date) {
      records = records.filter(record => {
        return record['Tarih'] === filters.date;
      });
    }
    
    if (filters.shift) {
      records = records.filter(record => {
        return record['Vardiya'] === filters.shift;
      });
    }
    
    if (filters.hour) {
      records = records.filter(record => {
        return record['Saat'] === filters.hour;
      });
    }
    
    // Tarih aralığı filtreleme
    if (filters.start_date && filters.end_date) {
      records = records.filter(record => {
        const recordDate = new Date(record['Tarih']);
        const startDate = new Date(filters.start_date);
        const endDate = new Date(filters.end_date);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }
    
    // Son kayıtları getir
    if (filters.recent && filters.limit) {
      records = records.slice(-filters.limit).reverse();
    }
    
    return {
      success: true,
      data: records,
      count: records.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    Logger.log('getHourlyRecords hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Saatlik kayıt güncelle
 */
function updateHourlyRecord(sheet, recordId, data) {
  try {
    const headers = getHourlyHeaders(sheet);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // ✅ Alan map'i - frontend ↔ apps script uyumlu
    const fieldMap = {
      id: 'ID',
      date: 'Tarih',
      shift: 'Vardiya',
      hour: 'Saat',
      aktif: 'Aktif Enerji (MWh)',
      reaktif: 'Reaktif Enerji (kVArh)',
      aydemAktif: 'Aydem Aktif',
      aydemReaktif: 'Aydem Reaktif',
      operator: 'Operator',
      timestamp: 'Kayıt Zamanı',
      updatedAt: 'Güncelleme Zamanı',
      editedBy: 'Güncelleyen',
      originalTimestamp: 'Orijinal Kayıt Zamanı',
      originalOperator: 'Orijinal Operator'
    };
    
    // Kaydı bul - TARIH + VARDİYA + SAATE göre bul
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) { // Header satırını atla
      const rowDate = String(values[i][headers.indexOf('Tarih')] || '');
      const rowShift = String(values[i][headers.indexOf('Vardiya')] || '');
      const rowHour = String(values[i][headers.indexOf('Saat')] || '');
      const rowId = String(values[i][headers.indexOf('ID')] || '');
      
      // ✅ String karşılaştırma - tip uyumsuzluğu önle
      if ((rowDate === String(data.date) && rowShift === String(data.shift) && rowHour === String(data.hour)) || rowId === String(recordId)) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Kayıt bulunamadı' };
    }
    
    // ✅ Map'li güncelle - frontend alan adları ile sheet header'ları eşleşir
    Object.keys(fieldMap).forEach(key => {
      if (data[key] !== undefined) {
        const headerName = fieldMap[key];
        const colIndex = headers.indexOf(headerName);
        
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data[key]);
        } else {
          Logger.log(`Column not found: ${headerName} for key: ${key}`);
        }
      }
    });
    
    return {
      success: true,
      message: 'Saatlik kayıt başarıyla güncellendi',
      recordId: recordId,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    Logger.log('Update error: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Saatlik kayıt sil
 */
function deleteHourlyRecord(sheet, recordId) {
  try {
    const headers = getHourlyHeaders(sheet);
    const idColumnIndex = headers.indexOf('ID');
    
    if (idColumnIndex === -1) {
      return { success: false, error: 'ID kolonu bulunamadı' };
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Kaydı bul
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
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
      message: 'Saatlik kayıt başarıyla silindi',
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
 * Saatlik sheet headers'ını getir
 */
function getHourlyHeaders(sheet) {
  try {
    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    return headerRow.map(header => header.toString().trim());
  } catch (error) {
    // Eğer sheet boşsa, manuel header'ları dön
    if (sheet.getName() === 'SaatlikEnerjiVerileri') {
      return ['ID', 'Tarih', 'Vardiya', 'Saat', 'Aktif Enerji (MWh)', 'Reaktif Enerji (kVArh)', 'Aydem Aktif', 'Aydem Reaktif', 'Operator', 'Kayıt Zamanı', 'Güncelleme Zamanı', 'Güncelleyen', 'Orijinal Kayıt Zamanı', 'Orijinal Operator'];
    }
    return [];
  }
}

/**
 * doGet - Test için
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'Saatlik Enerji Google Sheets App Script çalışıyor',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    module: 'saatlik-enerji'
  })).setMimeType(ContentService.MimeType.JSON);
}
