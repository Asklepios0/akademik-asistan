# 🎓 Akademik Asistan - Kişisel Üniversite Asistanı

Üniversite sürecinizde haftalık ders programınızı yönetmenizi sağlayan, ders ve hoca ilişkilerinden akıllı tahminler üreten ve dersleriniz başlamadan önce telefonunuza bildirim gönderen modern mobil uygulama.

---

## ✨ Özellikler

- 📅 **Haftalık Ders Programı**: Pazartesi - Pazar günleri arasında ders adı, saati, sınıfı (D7, D4, Amfi vb.) ve hocasını kolayca ekleme/düzenleme/silme.
- ⚡ **Günün Akışı & Canlı Geri Sayım**:
  - Aktif derste canlı ilerleme çubuğu (*"Bitmesine 25 dk kaldı"*).
  - Sıradaki derse kaç dakika kaldığını gösteren sayaç.
- 💡 **Akıllı Tahmin & Öneri Sistemi (Predictive Autofill)**:
  - Bir hocanın adını yazdığınızda o hocanın daha önce verdiği dersleri ve girdiği sınıfları otomatik tahmin eder.
  - *"✨ Tek Tıkla Otomatik Doldur"* butonu ile tüm bilgileri saniyeler içinde tamamlar.
- 🔔 **Ders Öncesi Yerel Bildirimler**:
  - Belirlediğiniz süre önce (*10 dk, 15 dk, 30 dk, 1 saat*) telefonunuza bildirim gönderir.
  - İnternet bağlantısı gerektirmez.
- 📊 **Notlar, Sınavlar & Devamsızlık Modülü**:
  - Dönem Genel Not Ortalaması (GNO) hesaplayıcı.
  - Vize/Final sınav takvimi ve devamsızlık takip arayüzü (ilerideki geliştirmeler için hazır).
- ⚙️ **Yedekleme & Test**:
  - Anında 2 saniyelik test bildirimi atarak bildirim motorunu test etme.
  - Tüm dersleri yedekleme ve geri yükleme.

---

## 🚀 Telefonunuzda Nasıl Çalıştırırsınız?

### Seçenek 1: APK Olarak Yükleme (Doğrudan Telefona Kurulum)
1. Proje ana dizinindeki `build_apk.ps1` scriptini çalıştırın:
   ```powershell
   .\build_apk.ps1
   ```
2. Üretilen `AkademikAsistan.apk` dosyasını USB kablosu, WhatsApp, Google Drive veya Bluetooth ile telefonunuza gönderin.
3. Telefonda dosyaya tıklayıp **Yükle** seçeneğini seçin.

### Seçenek 2: Expo Go ile Kablosuz ve Anında Test
1. Telefonunuza Google Play Store'dan **Expo Go** uygulamasını yükleyin.
2. Bilgisayarınızda terminalden şu komutu çalıştırın:
   ```bash
   npx expo start
   ```
3. Terminalde beliren **QR Kodu** telefonunuzdaki Expo Go uygulamasıyla taratın. Uygulama saniyeler içinde telefonunuzda açılacaktır.

---

## 🛠️ Mimari & Dosya Yapısı

```
Akademik Asistan/
├── src/
│   ├── types/               # TypeScript tip tanımları ve sabitler
│   ├── services/
│   │   ├── storage.ts       # AsyncStorage yerel veri tabanı servisi
│   │   ├── suggestions.ts   # Akıllı tahmin & oto-tamamlama motoru
│   │   └── notifications.ts # Expo yerel bildirim motoru
│   ├── components/
│   │   ├── Header.tsx       # Üst başlık ve tarih çubuğu
│   │   ├── CourseCard.tsx   # Ders kartı (rozetler, süre sayacı, silme/düzenleme)
│   │   ├── AddCourseModal.tsx # Akıllı tahminli ders ekleme penceresi
│   │   ├── TimePickerModal.tsx # Saat ve dakika seçici
│   │   └── BottomNav.tsx    # Alt sekme gezinme menüsü
│   ├── screens/
│   │   ├── ScheduleScreen.tsx # Haftalık program ekranı ve arama
│   │   ├── TodayScreen.tsx    # Bugünün ders akışı ve aktif ders sayacı
│   │   ├── NotesExamsScreen.tsx # GNO hesaplayıcı, sınavlar ve devamsızlık
│   │   └── SettingsScreen.tsx   # Bildirim testleri, ayarlar ve veri sıfırlama
│   └── utils/
│       ├── time.ts          # Zaman hesaplamaları ve formatlama
│       └── theme.ts         # Renk ve tema stilleri
├── App.tsx                  # Ana uygulama bileşeni
├── app.json                 # Mobil izinler ve paket yapılandırması
└── build_apk.ps1            # Tek tıkla APK derleme aracı
```
