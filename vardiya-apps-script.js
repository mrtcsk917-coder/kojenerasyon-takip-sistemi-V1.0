/**
 * VARDIYA TAKIBI ICIN GOOGLE SHEETS APP SCRIPT
 * Tam entegrasyonlu versiyon
 * 
 * Kurulum:
 * 1. Bu kodu Apps Script'e yapıştır
 * 2. Deploy -> New Deployment
 * 3. Web App olarak yayınla
 * 4. URL'yi config.js'e ekle
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
      vardiya: 'VardiyaTakibi'
    };
    
    const sheetName = sheetNames[module] || 'Veriler';
    
    // ✅ Spreadsheet kontrolü - yoksa oluştur
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      ss = SpreadsheetApp.create('Kojenerasyon Vardiya Takibi');
    }
    
    let sheet = ss.getSheetByName(sheetName);
    
    // Sheet yoksa oluştur ve header'ları ekle
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      
      // Vardiya takibi için header'ları oluştur
      if (module === 'vardiya') {
        // Manuel olarak header'ları ekle
        sheet.getRange("A1").setValue("ID");
        sheet.getRange("B1").setValue("Tarih");
        sheet.getRange("C1").setValue("Vardiya Tipi");
        sheet.getRange("D1").setValue("Vardiya Personeli");
        sheet.getRange("E1").setValue("Yardımcı Personel");
        sheet.getRange("F1").setValue("Yapılan İşler");
        sheet.getRange("G1").setValue("Notlar");
        sheet.getRange("H1").setValue("Kayıt Zamanı");
        sheet.getRange("I1").setValue("Güncelleme Zamanı");
        sheet.getRange("J1").setValue("Güncelleyen");
        sheet.getRange("K1").setValue("Orijinal Kayıt Zamanı");
        sheet.getRange("L1").setValue("Orijinal Personel");
        sheet.getRange("M1").setValue("Değiştirilen Değerler");
        
        // Formatla
        sheet.getRange("A1:M1").setFontWeight("bold");
        for (let i = 1; i <= 13; i++) {
          sheet.autoResizeColumn(i);
        }
      }
    }
    
    let result;
    
    switch (action) {
      case 'save':
        result = saveVardiyaRecord(sheet, payload);
        break;
        
      case 'save_bulk':
        result = saveBulkVardiyaRecords(sheet, payload);
        break;
        
      case 'get':
        result = getVardiyaRecords(sheet, payload.filters || {});
        break;
        
      case 'update':
        if (!payload.id) {
          result = { success: false, error: 'Update için ID gerekli' };
        } else {
          result = updateVardiyaRecord(sheet, payload.id, payload);
        }
        break;
        
      case 'delete':
        result = deleteVardiyaRecord(sheet, payload.id);
        break;
        
      case 'test':
        result = { success: true, message: 'Vardiya takibi bağlantısı başarılı', timestamp: new Date().toISOString() };
        break;
        
      default:
        result = { success: false, error: 'Bilinmeyen işlem: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Vardiya takibi hatası: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Vardiya tek kayıt kaydet
 */
function saveVardiyaRecord(sheet, data) {
  try {
    // ✅ Çoklu API çağrısını engelle
    const globalLockKey = 'vardiya_global_save_lock';
    const globalLock = CacheService.getPublicCache().get(globalLockKey);
    
    if (globalLock !== null) {
      return {
        success: false,
        error: 'Lütfen bekleyin... Başka bir kayıt işlemi devam ediyor.',
        lockActive: true
      };
    }
    
    // Global kilidi oluştur
    CacheService.getPublicCache().put(globalLockKey, 'locked', 60); // 60 saniye
    
    // Concurrency kontrolü
    const lockKey = sheet.getName() + '_save_lock';
    const lock = CacheService.getPublicCache().get(lockKey);
    
    if (lock !== null) {
      // Global kilidi serbest bırak
      CacheService.getPublicCache().remove(globalLockKey);
      return {
        success: false,
        error: 'Lütfen bekleyin... Başka bir kayıt işlemi devam ediyor.',
        lockActive: true
      };
    }
    
    // Kilit oluştur
    CacheService.getPublicCache().put(lockKey, 'locked', 60); // 60 saniye
    
    // Headers'ı kontrol et
    const headers = getVardiyaHeaders(sheet);
    
    // ✅ DÜZELTİLMİŞ: Aynı tarih ve vardiya tipinde veri kontrolü
    if (data.tarih && data.vardiya_tipi) {
      const existingData = sheet.getDataRange().getValues();
      const dateColumnIndex = headers.indexOf('Tarih');
      const vardiyaTipiColumnIndex = headers.indexOf('Vardiya Tipi');
      
      // Gelen vardiya tipini tam metin formatına çevir
      const vardiyaTipMap = {
        'gece': 'Gece Vardiyası',
        'gunduz': 'Gündüz Vardiyası',
        'aksam': 'Akşam Vardiyası'
      };
      const normalizedVardiyaTipi = vardiyaTipMap[data.vardiya_tipi] || data.vardiya_tipi;
      
      console.log('🔍 Kontrol ediliyor:', { 
        arananTarih: data.tarih, 
        arananVardiya: normalizedVardiyaTipi 
      });
      
      if (existingData.length > 1) {
        // Header hariç diğer satırları kontrol et
        for (let i = 1; i < existingData.length; i++) {
          const existingDate = existingData[i][dateColumnIndex];
          const existingVardiyaTipi = existingData[i][vardiyaTipiColumnIndex];
          
          let normalizedExisting = '';
          if (existingDate instanceof Date) {
            // Date objesini YYYY-MM-DD formatına çevir
            const year = existingDate.getFullYear();
            const month = String(existingDate.getMonth() + 1).padStart(2, '0');
            const day = String(existingDate.getDate()).padStart(2, '0');
            normalizedExisting = `${year}-${month}-${day}`;
          } else {
            // String ise, tüm ayraçları standardize et
            normalizedExisting = existingDate ? existingDate.toString()
              .replace(/\./g, '-')
              .replace(/\//g, '-')
              .trim() : '';
          }
          
          // Gelen tarihi standardize et
          const normalizedNew = data.tarih.toString()
            .replace(/\./g, '-')
            .replace(/\//g, '-')
            .trim();
          
          console.log('📊 Karşılaştırma:', {
            satir: i,
            existingDate: existingDate,
            normalizedExisting: normalizedExisting,
            normalizedNew: normalizedNew,
            existingVardiyaTipi: existingVardiyaTipi,
            normalizedVardiyaTipi: normalizedVardiyaTipi,
            tarihEslesiyor: normalizedExisting === normalizedNew,
            vardiyaEslesiyor: existingVardiyaTipi === normalizedVardiyaTipi
          });
          
          // Tarih VE vardiya tipi eşleşiyorsa
          if (normalizedExisting && normalizedExisting === normalizedNew && 
              existingVardiyaTipi === normalizedVardiyaTipi) {
            
            console.log('⚠️ ÇAKIŞMA BULUNDU!');
            // Kilidi serbest bırak
            CacheService.getPublicCache().remove(lockKey);
            
            return {
              success: false,
              error: `Bu tarihte (${data.tarih}) ${normalizedVardiyaTipi} kaydı zaten mevcut!`,
              duplicateFound: true,
              existingRecord: {
                tarih: normalizedExisting,
                vardiyaTipi: existingVardiyaTipi,
                satir: i + 1
              }
            };
          }
        }
      }
      
      console.log('✅ Çakışma bulunamadı, kayıt yapılabilir');
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
          value = data.tarih || '';
          break;
        case 'Vardiya Tipi':
          // Vardiya tipini tam metin formatına çevir
          const vardiyaTipMap = {
            'gece': 'Gece Vardiyası',
            'gunduz': 'Gündüz Vardiyası',
            'aksam': 'Akşam Vardiyası'
          };
          value = vardiyaTipMap[data.vardiya_tipi] || data.vardiya_tipi || '';
          break;
        case 'Vardiya Personeli':
          value = data.vardiya_personeli || '';
          break;
        case 'Yardımcı Personel':
          value = data.yardimci_personel || '';
          break;
        case 'Yapılan İşler':
          value = data.isler ? (Array.isArray(data.isler) ? data.isler.join(', ') : data.isler) : '';
          break;
        case 'Notlar':
          value = data.notlar || '';
          break;
        case 'Kayıt Zamanı':
          value = data.kayitZamani || new Date().toLocaleString('tr-TR', {
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
        case 'Orijinal Personel':
          value = data.originalPersonel || '';
          break;
        case 'Değiştirilen Değerler':
          value = data.changes || '';
          break;
        default:
          value = data[header] || '';
      }
      
      newRow.push(value);
    });
    
    sheet.appendRow(newRow);
    console.log('✅ Yeni kayıt eklendi:', newRow);
    
    // Kilidi serbest bırak
    CacheService.getPublicCache().remove(lockKey);
    CacheService.getPublicCache().remove('vardiya_global_save_lock');
    
    return {
      success: true,
      message: 'Vardiya kaydı başarıyla kaydedildi',
      recordId: data.id,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Hata:', error.toString());
    // Hata durumunda kilidi serbest bırak
    CacheService.getPublicCache().remove(lockKey);
    CacheService.getPublicCache().remove('vardiya_global_save_lock');
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Vardiya çoklu kayıt kaydet
 */
function saveBulkVardiyaRecords(sheet, data) {
  try {
    const records = data.records || [];
    let successCount = 0;
    let errorCount = 0;
    let errors = [];
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const result = saveVardiyaRecord(sheet, record);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        errors.push(`${record.tarih}: ${result.error}`);
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
 * Vardiya kayıtları getir
 */
function getVardiyaRecords(sheet, filters = {}) {
  try {
    const headers = getVardiyaHeaders(sheet);
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
    if (filters.tarih) {
      records = records.filter(record => {
        const recordDate = record['Tarih'] ? record['Tarih'].toString() : '';
        const filterDate = filters.tarih.toString();
        return recordDate === filterDate;
      });
    }
    
    if (filters.vardiya_tipi) {
      records = records.filter(record => {
        // Gelen vardiya tipini normalize et
        const vardiyaTipMap = {
          'gece': 'Gece Vardiyası',
          'gunduz': 'Gündüz Vardiyası',
          'aksam': 'Akşam Vardiyası'
        };
        const normalizedFilter = vardiyaTipMap[filters.vardiya_tipi] || filters.vardiya_tipi;
        return record['Vardiya Tipi'] === normalizedFilter;
      });
    }
    
    if (filters.vardiya_personeli) {
      records = records.filter(record => {
        return record['Vardiya Personeli'] === filters.vardiya_personeli;
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
    Logger.log('getVardiyaRecords hatası: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Vardiya kayıt güncelle
 */
function updateVardiyaRecord(sheet, recordId, data) {
  try {
    const headers = getVardiyaHeaders(sheet);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Alan map'i - frontend ↔ apps script uyumlu
    const fieldMap = {
      id: 'ID',
      tarih: 'Tarih',
      vardiya_tipi: 'Vardiya Tipi',
      vardiya_personeli: 'Vardiya Personeli',
      yardimci_personel: 'Yardımcı Personel',
      isler: 'Yapılan İşler',
      notlar: 'Notlar',
      kayitZamani: 'Kayıt Zamanı',
      updatedAt: 'Güncelleme Zamanı',
      editedBy: 'Güncelleyen',
      originalTimestamp: 'Orijinal Kayıt Zamanı',
      originalPersonel: 'Orijinal Personel',
      changes: 'Değiştirilen Değerler'
    };
    
    // Kaydı bul
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) { // Header satırını atla
      const rowId = String(values[i][headers.indexOf('ID')] || '');
      
      if (rowId === String(recordId)) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Kayıt bulunamadı' };
    }
    
    // Map'li güncelle
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
      message: 'Vardiya kaydı başarıyla güncellendi',
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
 * Vardiya kayıt sil
 */
function deleteVardiyaRecord(sheet, recordId) {
  try {
    const headers = getVardiyaHeaders(sheet);
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
      message: 'Vardiya kaydı başarıyla silindi',
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
 * Vardiya sheet headers'ını getir
 */
function getVardiyaHeaders(sheet) {
  try {
    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    return headerRow.map(header => header.toString().trim());
  } catch (error) {
    // Eğer sheet boşsa, manuel header'ları dön
    if (sheet.getName() === 'VardiyaTakibi') {
      return ['ID', 'Tarih', 'Vardiya Tipi', 'Vardiya Personeli', 'Yardımcı Personel', 'Yapılan İşler', 'Notlar', 'Kayıt Zamanı', 'Güncelleme Zamanı', 'Güncelleyen', 'Orijinal Kayıt Zamanı', 'Orijinal Personel', 'Değiştirilen Değerler'];
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
    message: 'Vardiya Takibi Google Sheets App Script çalışıyor',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    module: 'vardiya-takibi'
  })).setMimeType(ContentService.MimeType.JSON);
}
