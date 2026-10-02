# 🎓 Akademik Asistan - Kişisel Üniversite Asistanı

Üniversite sürecinizde haftalık ders programınızı yönetmenizi sağlayan, ders ve hoca ilişkilerinden akıllı tahminler üreten, vize/final ve devamsızlıklarınızı takip eden modern mobil ve web uygulaması.

---

## 🌐 Canlı Uygulama (Hemen Kullanın)

Herhangi bir kurulum yapmadan tarayıcınızdan veya telefonunuzdan anında erişebilirsiniz:

👉 **[https://asklepios0.github.io/akademik-asistan/](https://asklepios0.github.io/akademik-asistan/)**

---

## 📱 Telefonda Mobil Uygulama Gibi Kullanma (Kurulumsuz & Ücretsiz)

Uygulama **Progressive Web App (PWA)** standartlarında geliştirilmiştir. App Store veya Google Play'e ihtiyaç duymadan telefonunuzun ana ekranına ekleyerek **tam ekran, bildirim çubuğuyla uyumlu, yerel bir mobil uygulama gibi** kullanabilirsiniz:

### 🍏 iPhone (iOS) Kullanıcıları İçin:
1. iPhone'unuzda **Safari** tarayıcısını açın ve siteye gidin:  
   👉 `https://asklepios0.github.io/akademik-asistan/`
2. Ekranın alt kısmında yer alan **Paylaş (Share)** simgesine dokunun *(kare içinden yukarı doğru ok çıkan buton)*.
3. Açılan menüde aşağı kaydırıp **"Ana Ekrana Ekle" (Add to Home Screen)** seçeneğine dokunun.
4. Sağ üstteki **"Ekle"** butonuna basarak onaylayın.

> ✨ **Sonuç:** Akademik Asistan, telefonunuzun ana ekranına özel logosu ve ismiyle bir iPhone uygulaması olarak eklenir. Açtığınızda Safari adres çubukları gizlenir, tam ekran yerel uygulama deneyimi sunar.

---

### 🤖 Android Kullanıcıları İçin:
1. **Google Chrome** tarayıcınızda siteye gidin:  
   👉 `https://asklepios0.github.io/akademik-asistan/`
2. Sağ üst köşedeki **üç nokta (⋮)** simgesine dokunun.
3. Menüden **"Uygulamayı Yükle"** veya **"Ana Ekrana Ekle"** seçeneğini seçin.
4. Çıkan onay penceresinde **"Yükle"** butonuna basın.

> ✨ **Sonuç:** Uygulama çekmecesine ve ana ekranınıza yerleşir, bağımsız bir Android uygulaması gibi çalışır.

---

## ✨ Öne Çıkan Özellikler

- 📅 **Haftalık Ders Programı**: Pazartesi - Pazar günleri arasında ders adı, saati, sınıfı (D7, D4, Amfi vb.) ve hocasını kolayca ekleme/düzenleme/silme.
- ⚡ **Günün Akışı & Canlı Geri Sayım**:
  - Aktif derste canlı ilerleme çubuğu (*"Bitmesine 25 dk kaldı"*).
  - Sıradaki derse kaç dakika kaldığını gösteren geri sayım sayacı.
- 💡 **Akıllı Tahmin & Öneri Sistemi (Predictive Autofill)**:
  - Bir hocanın adını yazdığınızda o hocanın daha önce verdiği dersleri ve girdiği sınıfları otomatik hatırlar.
  - *"✨ Tek Tıkla Otomatik Doldur"* butonu ile bilgileri saniyeler içinde tamamlar.
- 🖼️ **Kilit Ekranı Duvar Kağıdı Oluşturucu**:
  - Haftalık ders programınızı telefonunuzun ekran oranına özel yüksek çözünürlüklü şık bir kilit ekranı posterine dönüştürür.
- 📊 **Notlar, Sınavlar & Devamsızlık Modülü**:
  - Dönem Genel Not Ortalaması (GNO) hesaplayıcı.
  - Vize/Final sınav takvimi ve devamsızlık hakları takip sistemi.
- 🔒 **Güvenlik & Gizlilik**:
  - 4 haneli PIN kodu koruması ile kişisel ders notlarınızı kilitleme.
  - Tüm veriler cihazınızda yerel olarak (AsyncStorage / LocalStorage) saklanır; internete veri sızmaz.

---

## 🚀 Geliştiriciler & Alternatif Çalıştırma Seçenekleri

### 1. Android APK Olarak Derleme
Proje ana dizinindeki PowerShell derleme betiğini çalıştırarak yerel APK üretebilirsiniz:
```powershell
.\build_apk.ps1
```

### 2. Expo Go ile Geliştirici Modunda Çalıştırma
```bash
# Bağımlılıkları yükleyin
npm install

# Yerel geliştirme sunucusunu başlatın
npx expo start
```
Terminalde çıkan QR kodu telefonunuzdaki **Expo Go** uygulamasıyla taratarak geliştirme ortamında anlık test edebilirsiniz.

---

## 🛠️ Mimari & Dosya Yapısı

```
Akademik Asistan/
├── src/
│   ├── types/               # TypeScript tip tanımları ve arayüzler
│   ├── services/
│   │   ├── storage.ts       # Yerel veri tabanı (AsyncStorage/Web)
│   │   ├── suggestions.ts   # Akıllı tahmin & oto-tamamlama motoru
│   │   ├── notifications.ts # Yerel bildirim motoru
│   │   └── wallpaperService.ts # Kilit ekranı afişi üretim motoru
│   ├── components/          # Yeniden kullanılabilir UI bileşenleri
│   ├── screens/             # Uygulama ana ekranları (Bugün, Program, Notlar, Ayarlar)
│   └── utils/               # Tema, çoklu dil ve zaman yardımcıları
├── public/                  # PWA manifest, .nojekyll ve ikonlar
├── app.json                 # Expo yapılandırması
└── package.json             # Bağımlılıklar ve dağıtım scriptleri
```

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.
