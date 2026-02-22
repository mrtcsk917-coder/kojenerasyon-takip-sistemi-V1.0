# Google Sheets Entegrasyonu Kurulum

## 📋 Adım 1: Google Sheets Hazırlığı

1. **Yeni Google Sheets oluştur**
   - [Google Sheets](https://sheets.google.com) açın
   - Yeni boş çalışma sayfası oluşturun
   - "Günlük Enerji" olarak adlandırın

2. **Apps Script Düzenleyiciyi Aç**
   - Menü: `Uzantılar` > `Apps Script`
   - Yeni script projesi açılacak

## 📋 Adım 2: Apps Script Kodunu Ekle

1. **Kodu Yapıştır**
   - `gunluk-enerji-apps-script.js` dosyasının içeriğini kopyalayın
   - Apps Script düzenleyicideki mevcut kodu silin
   - Kopyalanan kodu yapıştırın

2. **Kaydet ve Dağıt**
   - `Ctrl + S` ile projeyi kaydedin
   - `Dağıt` > `Yeni dağıtım` seçin
   - Aşağıdaki ayarları yapın:
     - **Dağıtım türü**: Web uygulaması
     - **Yürütme olarak**: Kendi hesabınız
     - **Erişimi sahip olan**: Herkes
     - **Geliştirme modunda dağıt**

3. **Web App URL'ini Kopyala**
   - Dağıtım sonrası açılan URL'i kopyalayın
   - Bu URL şuna benzer: `https://script.google.com/macros/s/.../exec`

## 📋 Adım 3: Frontend Yapılandırması

1. **Config Dosyasını Güncelle**
   - `js/config.js` dosyasını açın
   - `BURAYA_GOOGLE_SHEETS_WEB_APP_URL_GELECEK` yazan yere
   - Kopyaladığınız Web App URL'ini yapıştırın

```javascript
googleAppsScript: {
    dailyEnergyUrl: 'https://script.google.com/macros/s/AKfycb.../exec'
}
```

2. **URL'leri Güncelle**
   - Aynı dosyada `GOOGLE_SHEETS_WEB_APP_URLS` bölümünde de
   - `gunluk_enerji` alanını güncelleyin

```javascript
gunluk_enerji: 'https://script.google.com/macros/s/AKfycb.../exec'
```

## 📋 Adım 4: Test Etme

1. **Sayfayı Aç**
   - `gunluk-enerji.html` sayfasını tarayıcıda açın
   - Formu doldurun ve kaydedin

2. **Kontrol Et**
   - Google Sheets sayfasını kontrol edin
   - Verilerin geldiğini doğrulayın

3. **Debug**
   - Tarayıcı konsolunu açın (F12)
   - API mesajlarını kontrol edin

## 📋 Adım 5: İzinler

1. **İzin Ver**
   - İlk kullanımda Google izin isteyebilir
   - Hesabınızı seçin ve "İzin ver" deyin
   - "Güvenli olmayan uygulama" uyarısı çıkarsa:
     - `Gelişmiş` > `Uygulamaya git (güvensiz)` seçin

## 🔧 Özellikler

### ✅ **Yapılandırılmış API**
- API Key gerekmez
- Google Apps Script Web App kullanır
- Otomatik veri doğrulama

### ✅ **Çevrimdışı Destek**
- İnternet yoksa veriler localStorage'a kaydedilir
- Bağlantı gelince otomatik senkronizasyon

### ✅ **Hata Yönetimi**
- Detaylı hata mesajları
- Otomatik yeniden deneme
- Log tutma

### ✅ **Veri Formatı**
- Standartlaştırılmış veri yapısı
- Tarih/saat formatı
- Kullanıcı takibi

## 📊 Google Sheets Yapısı

Otomatik oluşturulan sütunlar:

| Sütun | Açıklama |
|------|----------|
| Tarih | Kayıt tarihi |
| Yağ Seviyesi (%) | Yağ seviyesi yüzdesi |
| Kuplaj (MW) | Kuplaj gücü |
| GM-1 (MW) | 1. Motor gücü |
| GM-2 (MW) | 2. Motor gücü |
| GM-3 (MW) | 3. Motor gücü |
| İç İhtiyaç (MW) | İç ihtiyaç |
| 1. Redresör (MW) | 1. Redresör |
| 2. Redresör (MW) | 2. Redresör |
| Kojen İç İhtiyaç (kW) | Kojen iç ihtiyaç |
| Servis Trafosu (MW) | Servis trafosu |
| Kayıt Zamanı | Tam zaman damgası |
| Kaydeden | Veriyi giren kullanıcı |

## 🚀 Ek Fonksiyonlar

### **Veri Çekme**
```javascript
// Belirli bir tarihteki verileri çek
DailyEnergyAPI.getDailyEnergy('2026-02-22')
    .then(data => console.log(data))
    .catch(error => console.error(error));
```

### **Veri Listeleme**
```javascript
// Son 100 kaydı listele
DailyEnergyAPI.listDailyEnergy(100, 0)
    .then(data => console.log(data))
    .catch(error => console.error(error));
```

### **API Durumu**
```javascript
// API istatistiklerini al
const stats = DailyEnergyAPI.getStats();
console.log(stats);
```

### **Çevrimdışı Senkronizasyon**
```javascript
// Çevrimdışı verileri senkronize et
DailyEnergyAPI.syncOfflineData()
    .then(result => console.log(result))
    .catch(error => console.error(error));
```

## 🔒 Güvenlik

- **API Key gerekmez** - Google Apps Script kullanır
- **Otomatik izin** - Google hesap kimliği ile yetkilendirme
- **Veri doğrulama** - Sunucu tarafında veri kontrolü
- **Rate limiting** - API aşırı yüklemeyi önler

## 📝 Notlar

- İlk kurulumda Google izinleri gerekebilir
- URL'ler herkese açık olmalı (herkes erişebilmeli)
- Veriler Google Sheets'te otomatik formatlanır
- Çevrimdışı mod desteklenir
