# Musik Klona (Offline Music Player & YouTube Extractor)

Aplikasi mobile berbasis **React Native (TypeScript)** untuk mencari, memutar, dan mengunduh musik dari katalog YouTube langsung di perangkat (On-Device) agar dapat didengarkan 100% secara offline tanpa kuota internet, dilengkapi dengan sistem proteksi lisensi Anti-Sharing (maksimal 2 perangkat terikat hardware).

---

## 🏗️ Arsitektur Proyek

```text
/
├── mobile-app/                 # Proyek React Native (TypeScript)
│   ├── src/
│   │   ├── api/
│   │   │   ├── youtubeScraper.ts   # On-Device YouTube InnerTube Scraper (TS Murni)
│   │   │   └── licenseApi.ts       # Koneksi ke Backend Lisensi Node.js
│   │   ├── services/
│   │   │   ├── playerService.ts    # Background Audio & Lockscreen Handler
│   │   │   ├── downloadManager.ts  # Pengunduh .m4a ke FileSystem Lokal HP
│   │   │   └── storageService.ts   # Database Lokal (AsyncStorage)
│   │   ├── store/
│   │   │   └── useMusicStore.ts    # Global State (Zustand) agar UI reaktif
│   │   ├── screens/
│   │   │   ├── LicenseScreen.tsx   # Layar Aktivasi Lisensi & Hardware Binding
│   │   │   ├── SearchScreen.tsx    # Layar Pencarian & Unduh (Debounce 500ms)
│   │   │   └── LibraryScreen.tsx   # Layar Koleksi Offline & Putar Semua
│   │   ├── components/
│   │   │   ├── PlayerBar.tsx       # Mini Player Mengambang di atas Tab Bar
│   │   │   ├── FullPlayerModal.tsx # Full Screen Player dengan Slider Durasi
│   │   │   ├── TrackItem.tsx       # Item Lagu (Thumbnail 56x56, Download Progress, Centang Hijau)
│   │   │   ├── NetworkBanner.tsx   # Indikator Mode Offline / Pesawat
│   │   │   └── BottomTabBar.tsx    # Navigasi Tab Bawah
│   │   └── constants/
│   │       └── theme.ts            # Dark Industrial Theme Tokens
│   ├── App.tsx                     # Entry Point & Router
│   ├── app.json
│   └── package.json
│
├── license-server/             # Backend Lisensi Node.js + TypeScript
│   ├── api/
│   │   ├── verify.ts               # Validasi Lisensi + Batas Maks. 2 Perangkat
│   │   └── admin-generate.ts       # Generator Lisensi Baru (PULL-XXXX-XXXX)
│   ├── src/
│   │   ├── server.ts               # Express Runner Lokal
│   │   ├── db.ts                   # Store Persisten Lisensi
│   │   ├── telegram.ts             # Alert Telegram saat kuota 2 HP dilanggar
│   │   └── utils.ts                # Generator Kunci & JWT Token
│   ├── test/
│   │   └── verify-test.ts          # Automated Test Suite (100% Pass)
│   ├── package.json
│   └── vercel.json                 # Konfigurasi Deploy Vercel Serverless
```

---

## ⚡ Fitur Utama & Kepatuhan Spesifikasi

### 1. Sistem Lisensi Anti-Sharing (Hardware Binding Maks. 2 HP)
- **Model Lisensi:** Sekali bayar Rp50.000 (Akses Lifetime).
- **Format Kunci:** `PULL-XXXX-XXXX`.
- **Penguncian Perangkat:** Mengikat `Device ID` unik hardware HP pengguna (`expo-application` / `Application.getAndroidId()`).
- **Deteksi Pelanggaran:** Jika perangkat ke-3 mencoba login dengan kode lisensi yang sama, server otomatis menolak (`403 DEVICE_LIMIT_EXCEEDED`) dan mengirim notifikasi peringatan keamanan langsung ke Telegram Developer!

### 2. On-Device YouTube InnerTube Scraper (100% TypeScript Murni)
- **Tanpa Python & Tanpa Proxy:** Scraping langsung dari aplikasi HP pengguna menggunakan protokol **YouTube InnerTube API**.
- **Ekstraksi Direct Stream Audio:** Mengambil format `.m4a` (`itag: 140`, `audio/mp4`) langsung dari GoogleVideo CDN tanpa signature cipher, menghindari blokir IP Data Center.

### 3. Download Fisik ke Memori Lokal HP & IndexedDB (Web)
- **Pada HP Native (Android/iOS):** Mengunduh file biner `.m4a` ke penyimpanan lokal aplikasi:
  `${FileSystem.documentDirectory}tracks/${videoId}.m4a`.
- **Pada Mode Web Browser:** Mengunduh biner utuh secara bertahap (512 KB sliding-window) dan menyimpannya secara persisten ke **IndexedDB** browser pengguna, memungkinkan pemutaran 100% offline saat WiFi & koneksi data dimatikan.
- Indikator progres unduhan lingkaran (`0% - 100%`) yang berubah menjadi centang hijau `✓` setelah selesai.
- Lagu langsung muncul di **Koleksi Offline** secara real-time tanpa refresh.

### 4. Pemutaran Offline & Background Play Native
- Pemutaran langsung dari path lokal `file:///...` atau `blob:` IndexedDB sehingga berfungsi 100% pada **Mode Pesawat (Offline Tanpa Internet)**.
- Audio tetap menyala di latar belakang saat layar HP dimatikan atau pengguna membuka aplikasi lain (`staysActiveInBackground: true`).

---

## 🚀 Cara Menjalankan Proyek

### Skrip Root Monorepo (Paling Mudah)
Dari folder utama (root):
```bash
# 1. Jalankan semua pemeriksaan tipe TypeScript & pengujian otomatis
npm run check-all

# 2. Jalankan License Server di background
npm run start:server

# 3. Jalankan Web Preview di browser
npm run start:web
```

### 1. Menjalankan License Server (Backend Secara Terpisah)
```bash
cd license-server
npm install
npm run dev
```
- Server berjalan di `http://localhost:3000`.
- Uji otomatis seluruh skenario (Aktivasi HP 1, HP 2, Penolakan HP 3, dan Alert Telegram):
  ```bash
  npm test
  ```

### 2. Menjalankan Mobile App (React Native)
```bash
cd mobile-app
npm install
npm start
```
- Jalankan di emulator Android (`npm run android`) atau iOS (`npm run ios`).
- Atau jalankan di browser Web (`npm run web`).
- Masukkan kode lisensi demo: `PULL-DEMO-2026` untuk masuk.

