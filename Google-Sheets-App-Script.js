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
    // CORS header'ları ekle
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const module = data.module;
    const payload = data.data;
    
    // Sheet isimlerini belirle
    const sheetNames = {
      buhar: 'BuharVerileri',
      kojen_motor: 'KojenMotorVerileri',
      kojen_enerji: 'KojenEnerjiVerileri',
      saatlik: 'SaatlikVeriler',
      gunluk_enerji: 'GunlukEnerjiVerileri',
      vardiya: 'VardiyaVerileri',
      bakim: 'BakimVerileri',
      ariza: 'ArizaVerileri'
    };
    
    const sheetName = sheetNames[module] || 'Veriler';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    
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
    
    output.setContent(JSON.stringify(result));
    return output;
      
  } catch (error) {
    Logger.log('Hata: ' + error.toString());
    
    const errorOutput = ContentService.createTextOutput();
    errorOutput.setMimeType(ContentService.MimeType.JSON);
    errorOutput.setContent(JSON.stringify({
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    }));
    return errorOutput;
  }
}

/**
 * Tek kayıt kaydet
 */
function saveRecord(sheet, data) {
  try {
    // Headers'ı kontrol et
    const headers = getHeaders(sheet);
    
    // Yeni satır olarak ekle
    const newRow = [];
    headers.forEach(header => {
      newRow.push(data[header] || '');
    });
    
    sheet.appendRow(newRow);
    
    return {
      success: true,
      message: 'Kayıt başarıyla eklendi',
      recordId: data.id,
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
      
      headers.forEach((header, index) => {
        record[header] = row[index] || '';
      });
      
      records.push(record);
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
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Toplu kayıt
 */
function saveBulkRecords(sheet, dataList) {
  try {
    const headers = getHeaders(sheet);
    
    dataList.forEach(data => {
      const newRow = [];
      headers.forEach(header => {
        newRow.push(data[header] || '');
      });
      sheet.appendRow(newRow);
    });
    
    return {
      success: true,
      message: dataList.length + ' kayıt başarıyla eklendi',
      count: dataList.length,
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
 * Sheet headers'ını getir
 */
function getHeaders(sheet) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headerRow.map(header => header.toString().trim());
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
