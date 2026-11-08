# ARCHITECTURE.md — Arsitektur Teknis (React Native TS + Node.js)

## 1. Struktur Direktori Proyek
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
│   │   │   └── storageService.ts   # Database Lokal (SQLite / AsyncStorage)
│   │   ├── store/
│   │   │   └── useMusicStore.ts    # Global State (Zustand) agar UI langsung update
│   │   └── screens/                # LicenseScreen, SearchScreen, LibraryScreen
├── license-server/             # Backend Node.js + TypeScript (Deploy ke Vercel)
│   ├── api/
│   │   ├── verify.ts               # Validasi Kode Lisensi + Max 2 Device ID
│   │   └── admin-generate.ts       # Endpoint Pembuat Kode Lisensi Baru