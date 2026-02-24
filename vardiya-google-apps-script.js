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
 * - ID, Tarih, VardiyaTipi, VaridiyaPersonel, YardimciPersonel, YapilanIsler, Notlar, KayitTarihi, Durum
 */

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
        
      case 'getVardiyaById':
        result = getVardiyaById(sheet, vardiyaData.id);
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
        
      case 'filterVardiyalar':
        result = filterVardiyalar(sheet, vardiyaData);
        break;
        
      case 'test':
        result = { success: true, message: 'Vardiya API calisiyor', timestamp: new Date().toISOString() };
        break;
        
      default:
        result = { success: false, error: 'Bilinmeyen islem: ' + action };
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
    message: 'Vardiya Takibi API calisiyor',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    actions: ['getAllVardiyalar', 'getVardiyaById', 'saveVardiya', 'updateVardiya', 'deleteVardiya', 'filterVardiyalar']
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Sheet'i al veya oluştur
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Vardiyalar');
  
  if (!sheet) {
    sheet = ss.insertSheet('Vardiyalar');
    
    // Header'ları oluştur
    const headers = ['ID', 'Tarih', 'VardiyaTipi', 'VardiyaPersonel', 'YardimciPersonel', 'YapilanIsler', 'Notlar', 'KayitTarihi', 'Durum'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Header formatı
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#2563eb')
      .setFontColor('white');
    
    // Kolon genişlikleri
    sheet.setColumnWidth(1, 80);   // ID
    sheet.setColumnWidth(2, 120);  // Tarih
    sheet.setColumnWidth(3, 100);  // VardiyaTipi
    sheet.setColumnWidth(4, 150);  // VardiyaPersonel
    sheet.setColumnWidth(5, 150);  // YardimciPersonel
    sheet.setColumnWidth(6, 200);  // YapilanIsler
    sheet.setColumnWidth(7, 300);  // Notlar
    sheet.setColumnWidth(8, 150);  // KayitTarihi
    sheet.setColumnWidth(9, 80);   // Durum
    
    Logger.log('Vardiyalar sheeti olusturuldu');
  }
  
  return sheet;
}

/**
 * Tüm vardiya kayıtlarını getir
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
      
      vardiyalar.push(vardiya);
    }
    
    // En yeni kayıtlar üstte olacak şekilde sırala
    vardiyalar.reverse();
    
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
 * ID'ye göre vardiya getir
 */
function getVardiyaById(sheet, id) {
  try {
    if (!id) {
      return { success: false, error: 'Vardiya ID gerekli' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('ID');
    
    if (idIndex === -1) {
      return { success: false, error: 'ID kolonu bulunamadi' };
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === id) {
        const vardiya = {};
        headers.forEach((header, index) => {
          vardiya[header] = data[i][index] || '';
        });
        
        return { success: true, vardiya: vardiya };
      }
    }
    
    return { success: false, error: 'Vardiya bulunamadi: ' + id };
    
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
    if (!vardiyaData.tarih || !vardiyaData.vardiyaPersonel) {
      return { success: false, error: 'Tarih ve vardiya personel zorunlu' };
    }
    
    const now = new Date().toLocaleString('tr-TR');
    const id = vardiyaData.id || Utilities.getUuid();
    
    // Yapılan işleri array'den string'e çevir
    const yapilanIsler = Array.isArray(vardiyaData.yapilanIsler) 
      ? vardiyaData.yapilanIsler.join(', ') 
      : vardiyaData.yapilanIsler || '';
    
    const newRow = [
      id,
      vardiyaData.tarih,
      vardiyaData.vardiyaTipi || 'gunduz',
      vardiyaData.vardiyaPersonel,
      vardiyaData.yardimciPersonel || '',
      yapilanIsler,
      vardiyaData.notlar || '',
      now,
      'active'
    ];
    
    sheet.appendRow(newRow);
    
    Logger.log('Yeni vardiya eklendi: ' + vardiyaData.vardiyaPersonel);
    
    return {
      success: true,
      message: 'Vardiya basariyla kaydedildi',
      vardiyaId: id,
      vardiyaPersonel: vardiyaData.vardiyaPersonel,
      timestamp: new Date().toISOString()
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
      return { success: false, error: 'Guncellenecek vardiya ID gerekli' };
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
      return { success: false, error: 'Guncellenecek vardiya bulunamadi: ' + vardiyaData.id };
    }
    
    // Güncelleme yap
    const now = new Date().toLocaleString('tr-TR');
    
    if (vardiyaData.tarih) {
      const tarihIndex = headers.indexOf('Tarih');
      sheet.getRange(rowIndex, tarihIndex + 1).setValue(vardiyaData.tarih);
    }
    
    if (vardiyaData.vardiyaTipi) {
      const tipIndex = headers.indexOf('VardiyaTipi');
      sheet.getRange(rowIndex, tipIndex + 1).setValue(vardiyaData.vardiyaTipi);
    }
    
    if (vardiyaData.vardiyaPersonel) {
      const vardiyaIndex = headers.indexOf('VardiyaPersonel');
      sheet.getRange(rowIndex, vardiyaIndex + 1).setValue(vardiyaData.vardiyaPersonel);
    }
    
    if (vardiyaData.yardimciPersonel !== undefined) {
      const yardimciIndex = headers.indexOf('YardimciPersonel');
      sheet.getRange(rowIndex, yardimciIndex + 1).setValue(vardiyaData.yardimciPersonel);
    }
    
    if (vardiyaData.yapilanIsler !== undefined) {
      const islerIndex = headers.indexOf('YapilanIsler');
      const yapilanIsler = Array.isArray(vardiyaData.yapilanIsler) 
        ? vardiyaData.yapilanIsler.join(', ') 
        : vardiyaData.yapilanIsler;
      sheet.getRange(rowIndex, islerIndex + 1).setValue(yapilanIsler);
    }
    
    if (vardiyaData.notlar !== undefined) {
      const notlarIndex = headers.indexOf('Notlar');
      sheet.getRange(rowIndex, notlarIndex + 1).setValue(vardiyaData.notlar);
    }
    
    if (vardiyaData.durum) {
      const durumIndex = headers.indexOf('Durum');
      sheet.getRange(rowIndex, durumIndex + 1).setValue(vardiyaData.durum);
    }
    
    // Kayıt tarihini güncelle
    const kayitIndex = headers.indexOf('KayitTarihi');
    sheet.getRange(rowIndex, kayitIndex + 1).setValue(now);
    
    Logger.log('Vardiya guncellendi: ' + vardiyaData.id);
    
    return {
      success: true,
      message: 'Vardiya basariyla guncellendi',
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
      return { success: false, error: 'Silinecek vardiya bulunamadi: ' + id };
    }
    
    // Sil
    sheet.deleteRow(rowIndex);
    
    Logger.log('Vardiya silindi: ' + id);
    
    return {
      success: true,
      message: 'Vardiya basariyla silindi',
      vardiyaId: id,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Vardiya filtreleme
 */
function filterVardiyalar(sheet, filters) {
  try {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const filteredVardiyalar = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const vardiya = {};
      
      headers.forEach((header, index) => {
        vardiya[header] = row[index] || '';
      });
      
      // Filtreleri uygula
      let include = true;
      
      if (filters.personel) {
        const personelLower = filters.personel.toLowerCase();
        const vardiyaLower = vardiya.vardiyaPersonel.toLowerCase();
        const yardimciLower = vardiya.YardimciPersonel.toLowerCase();
        
        if (!vardiyaLower.includes(personelLower) && 
            !yardimciLower.includes(personelLower)) {
          include = false;
        }
      }
      
      if (filters.vardiyaTipi && vardiya.VardiyaTipi !== filters.vardiyaTipi) {
        include = false;
      }
      
      if (filters.tarihBaslangic && vardiya.Tarih < filters.tarihBaslangic) {
        include = false;
      }
      
      if (filters.tarihBitis && vardiya.Tarih > filters.tarihBitis) {
        include = false;
      }
      
      if (filters.durum && vardiya.Durum !== filters.durum) {
        include = false;
      }
      
      if (include) {
        filteredVardiyalar.push(vardiya);
      }
    }
    
    // En yeni kayıtlar üstte olacak şekilde sırala
    filteredVardiyalar.reverse();
    
    return {
      success: true,
      vardiyalar: filteredVardiyalar,
      count: filteredVardiyalar.length,
      filters: filters,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
