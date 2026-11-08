# PRD (Product Requirements Document) — Offline Music Player & YouTube Extractor

## 1. Visi Produk & Model Bisnis
Aplikasi mobile berbasis React Native (TypeScript) untuk mencari, memutar, dan mengunduh musik dari katalog YouTube/YouTube Music agar dapat didengarkan 100% secara offline.
- **Model Monetisasi:** Sekali bayar Rp50.000 (Lifetime Access).
- **Sistem Keamanan:** Lisensi terkunci pada maksimal 2 perangkat (Device ID Hardware Binding) untuk mencegah pembagian kode lisensi secara gratis ke orang lain.

## 2. Fitur Utama (Core Features)
### A. Gerbang Aktivasi Lisensi (Anti-Sharing)
- Layar login meminta `License Key` (contoh: `PULL-XXXX-XXXX`).
- Mengambil `Device ID` unik dari hardware HP (`react-native-device-info` / `expo-application`).
- Memvalidasi ke server Node.js. Jika valid dan kuota perangkat <= 2, simpan token JWT di `SecureStore` / `AsyncStorage`.
- Jika sudah teraktivasi, aplikasi bisa dibuka langsung meskipun HP sedang tidak ada internet (Offline Mode).

### B. Pencarian & Scraping YouTube On-Device (100% Up-to-Date)
- Mencari lagu langsung ke endpoint internal YouTube (`youtubei/v1/search`) dari HP pengguna.
- Menampilkan daftar lagu terbaru (Indonesia, Barat, Remix, Cover) lengkap dengan `videoId`, judul, channel/artis, durasi, dan thumbnail resolusi tinggi.

### C. Download Fisik ke Memori Lokal HP
- Mengekstrak direct stream audio format `.m4a` (`itag: 140`, `audio/mp4`) langsung di perangkat pengguna.
- Mengunduh file biner audio ke penyimpanan lokal aplikasi (`FileSystem.documentDirectory + 'tracks/' + videoId + '.m4a'`) lengkap dengan indikator persentase progress (0% - 100%).
- Menyimpan metadata lagu beserta path file lokal (`file:///...`) ke database lokal HP (`SQLite` / `MMKV`).
- Begitu unduhan 100%, lagu otomatis langsung tampil di tab **Offline Library** tanpa perlu refresh manual.

### D. Pemutar Musik Offline & Background Play Native
- Saat memutar lagu dari tab Offline Library, player memutar langsung dari path file lokal (`file:///...`) sehingga berjalan 100% tanpa koneksi data/WiFi.
- Mendukung pemutaran di latar belakang (Background Play) saat layar HP mati atau pengguna membuka aplikasi lain.
- Menampilkan kontrol musik lengkap (Play, Pause, Next, Prev, Seekbar, Cover Art) di Lockscreen dan Notification Bar HP.

## 3. Kriteria Keberhasilan (Acceptance Criteria)
1. Tidak ada error HTTP 500 atau 402 saat mencari maupun mengunduh lagu.
2. Saat WiFi dan Data Seluler dimatikan (Mode Pesawat), aplikasi tetap bisa dibuka dan memutar semua lagu yang sudah diunduh tanpa error.
3. Musik tidak mati ketika layar HP dikunci selama berjam-jam.
4. Percobaan login di perangkat ke-3 dengan kode lisensi yang sama otomatis ditolak dan mengirim peringatan ke Telegram Developer.