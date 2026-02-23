/**
 * ============================================
 * KULLANICI YÖNETİMİ - GOOGLE SHEETS APP SCRIPT
 * ============================================
 * 
 * Kurulum:
 * 1. Google Sheets oluşturun -> "Kojenerasyon_Kullanicilar" adı verin
 * 2. Uzantılar > Apps Script
 * 3. Bu kodu yapıştırın
 * 4. Dağıt > Yeni dağıtım
 * 5. Web uygulaması olarak yayınla (Herkes erişebilir)
 * 6. URL'yi config.js'e ekleyin
 * 
 * Sheet yapısı otomatik oluşturulur:
 * - ID, KullaniciAdi, Sifre, AdSoyad, Rol, Durum, OlusturmaTarihi, GuncellemeTarihi
 */

/**
 * POST isteklerini işle
 */
function doPost(e) {
  try {
    const action = e.parameter.action;
    const userData = JSON.parse(e.parameter.data || '{}');
    
    // Sheet hazırla
    const sheet = getOrCreateSheet();
    
    let result;
    
    switch(action) {
      case 'getAllUsers':
        result = getAllUsers(sheet);
        break;
        
      case 'getUserByUsername':
        result = getUserByUsername(sheet, userData.username);
        break;
        
      case 'saveUser':
        result = saveUser(sheet, userData);
        break;
        
      case 'updateUser':
        result = updateUser(sheet, userData);
        break;
        
        case 'deleteUser':
        result = deleteUser(sheet, userData.username);
        break;
        
      case 'syncUsers':
        result = syncUsers(sheet, userData.users);
        break;
        
      case 'validateLogin':
        result = validateLogin(sheet, userData.username, userData.password);
        break;
        
      case 'test':
        result = { success: true, message: 'Kullanici API calisiyor', timestamp: new Date().toISOString() };
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
    message: 'Kullanici Yonetimi API calisiyor',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    actions: ['getAllUsers', 'getUserByUsername', 'saveUser', 'updateUser', 'deleteUser', 'syncUsers', 'validateLogin']
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Sheet'i al veya oluştur
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Kullanicilar');
  
  if (!sheet) {
    sheet = ss.insertSheet('Kullanicilar');
    
    // Header'ları oluştur
    const headers = ['ID', 'KullaniciAdi', 'Sifre', 'AdSoyad', 'Rol', 'Durum', 'OlusturmaTarihi', 'GuncellemeTarihi'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Header formatı
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('white');
    
    // Kolon genişlikleri
    sheet.setColumnWidth(1, 80);   // ID
    sheet.setColumnWidth(2, 120);  // KullaniciAdi
    sheet.setColumnWidth(3, 100);  // Sifre
    sheet.setColumnWidth(4, 150);  // AdSoyad
    sheet.setColumnWidth(5, 100);  // Rol
    sheet.setColumnWidth(6, 80);   // Durum
    sheet.setColumnWidth(7, 150);  // OlusturmaTarihi
    sheet.setColumnWidth(8, 150);  // GuncellemeTarihi
    
    // Varsayılan admin kullanıcısı ekle
    const defaultUser = {
      id: Utilities.getUuid(),
      username: 'admin',
      password: 'admin123',
      name: 'Admin',
      role: 'admin',
      status: 'active'
    };
    saveUser(sheet, defaultUser);
    
    Logger.log('Kullanicilar sheeti olusturuldu ve varsayilan admin eklendi');
  }
  
  return sheet;
}

/**
 * Tüm kullanıcıları getir
 */
function getAllUsers(sheet) {
  try {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const users = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const user = {};
      
      headers.forEach((header, index) => {
        user[header] = row[index] || '';
      });
      
      // Eski yonetici rolunu admin olarak degistir
      if (user['Rol'] === 'yonetici') {
        user['Rol'] = 'admin';
      }
      
      users.push(user);
    }
    
    return {
      success: true,
      users: users,
      count: users.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Kullanıcı adına göre kullanıcı getir
 */
function getUserByUsername(sheet, username) {
  try {
    if (!username) {
      return { success: false, error: 'Kullanici adi gerekli' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const usernameIndex = headers.indexOf('KullaniciAdi');
    
    if (usernameIndex === -1) {
      return { success: false, error: 'KullaniciAdi kolonu bulunamadi' };
    }
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][usernameIndex] === username) {
        const user = {};
        headers.forEach((header, index) => {
          user[header] = data[i][index] || '';
        });
        
        return { success: true, user: user };
      }
    }
    
    return { success: false, error: 'Kullanici bulunamadi: ' + username };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Yeni kullanıcı kaydet
 */
function saveUser(sheet, userData) {
  try {
    // Zorunlu alan kontrolü
    if (!userData.username || !userData.password) {
      return { success: false, error: 'Kullanici adi ve sifre zorunlu' };
    }
    
    // Aynı kullanıcı adı var mı kontrol et
    const existingUser = getUserByUsername(sheet, userData.username);
    if (existingUser.success) {
      return { success: false, error: 'Bu kullanici adi zaten kayitli: ' + userData.username };
    }
    
    const now = new Date().toLocaleString('tr-TR');
    const id = userData.id || Utilities.getUuid();
    
    const newRow = [
      id,
      userData.username,
      userData.password,
      userData.name || userData.username,
      userData.role || 'user',
      userData.status || 'active',
      userData.createdAt || now,
      now
    ];
    
    sheet.appendRow(newRow);
    
    Logger.log('Yeni kullanici eklendi: ' + userData.username);
    
    return {
      success: true,
      message: 'Kullanici basariyla eklendi',
      userId: id,
      username: userData.username,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Kullanıcı güncelle
 */
function updateUser(sheet, userData) {
  try {
    if (!userData.username) {
      return { success: false, error: 'Guncellenecek kullanici adi gerekli' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const usernameIndex = headers.indexOf('KullaniciAdi');
    
    // Kullanıcıyı bul
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][usernameIndex] === userData.username) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Guncellenecek kullanici bulunamadi: ' + userData.username };
    }
    
    // Güncelleme yap
    const now = new Date().toLocaleString('tr-TR');
    
    if (userData.password) {
      const passwordIndex = headers.indexOf('Sifre');
      sheet.getRange(rowIndex, passwordIndex + 1).setValue(userData.password);
    }
    
    if (userData.name) {
      const nameIndex = headers.indexOf('AdSoyad');
      sheet.getRange(rowIndex, nameIndex + 1).setValue(userData.name);
    }
    
    if (userData.role) {
      const roleIndex = headers.indexOf('Rol');
      sheet.getRange(rowIndex, roleIndex + 1).setValue(userData.role);
    }
    
    if (userData.status) {
      const statusIndex = headers.indexOf('Durum');
      sheet.getRange(rowIndex, statusIndex + 1).setValue(userData.status);
    }
    
    // Guncelleme tarihini güncelle
    const updateIndex = headers.indexOf('GuncellemeTarihi');
    sheet.getRange(rowIndex, updateIndex + 1).setValue(now);
    
    Logger.log('Kullanici guncellendi: ' + userData.username);
    
    return {
      success: true,
      message: 'Kullanici basariyla guncellendi',
      username: userData.username,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Kullanıcı sil
 */
function deleteUser(sheet, username) {
  try {
    if (!username) {
      return { success: false, error: 'Silinecek kullanici adi gerekli' };
    }
    
    // Admin silinemez
    if (username === 'admin') {
      return { success: false, error: 'Admin kullanicisi silinemez' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const usernameIndex = headers.indexOf('KullaniciAdi');
    
    // Kullanıcıyı bul
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][usernameIndex] === username) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, error: 'Silinecek kullanici bulunamadi: ' + username };
    }
    
    // Sil
    sheet.deleteRow(rowIndex);
    
    Logger.log('Kullanici silindi: ' + username);
    
    return {
      success: true,
      message: 'Kullanici basariyla silindi',
      username: username,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Toplu kullanıcı senkronizasyonu
 * LocalStorage'daki kullanıcıları Google Sheets'e aktarır
 */
function syncUsers(sheet, users) {
  try {
    if (!Array.isArray(users)) {
      return { success: false, error: 'Kullanici listesi array olmali' };
    }
    
    const results = {
      added: 0,
      updated: 0,
      failed: 0,
      errors: []
    };
    
    users.forEach(user => {
      // Kullanıcı var mı kontrol et
      const existing = getUserByUsername(sheet, user.username);
      
      if (existing.success) {
        // Güncelle
        const updateResult = updateUser(sheet, user);
        if (updateResult.success) {
          results.updated++;
        } else {
          results.failed++;
          results.errors.push({ user: user.username, error: updateResult.error });
        }
      } else {
        // Yeni ekle
        const saveResult = saveUser(sheet, user);
        if (saveResult.success) {
          results.added++;
        } else {
          results.failed++;
          results.errors.push({ user: user.username, error: saveResult.error });
        }
      }
    });
    
    Logger.log('Senkronizasyon tamamlandi: ' + JSON.stringify(results));
    
    return {
      success: true,
      message: 'Senkronizasyon tamamlandi',
      results: results,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Login doğrulama
 */
function validateLogin(sheet, username, password) {
  try {
    if (!username || !password) {
      return { success: false, error: 'Kullanici adi ve sifre gerekli' };
    }
    
    const userResult = getUserByUsername(sheet, username);
    
    if (!userResult.success) {
      return { success: false, error: 'Kullanici bulunamadi' };
    }
    
    const user = userResult.user;
    
    // Şifre kontrolü
    if (user.Sifre !== password) {
      return { success: false, error: 'Sifre hatali' };
    }
    
    // Durum kontrolü
    if (user.Durum !== 'active') {
      return { success: false, error: 'Kullanici hesabi aktif degil' };
    }
    
    return {
      success: true,
      message: 'Giris basarili',
      user: {
        id: user.ID,
        username: user.KullaniciAdi,
        name: user.AdSoyad,
        role: user.Rol,
        status: user.Durum
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
