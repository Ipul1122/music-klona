# CLAUDE.md — Aturan Mutlak Agen AI (Antigravity IDE)

## 1. ATURAN GIT (DILARANG KERAS DILANGGAR)
- **DILARANG KERAS** menjalankan perintah `git add`, `git commit`, `git push`, `git reset`, `git revert`, `git checkout`, atau `git branch` di terminal dalam kondisi apa pun.
- Kamu hanya diizinkan menjalankan `git status` atau `git diff` (read-only).
- Seluruh proses commit dan push dilakukan 100% secara manual oleh developer (User).

## 2. ATURAN TECH STACK & ARSITEKTUR
- **Bahasa Pemrograman:** 100% TypeScript (`.ts` / `.tsx`) dengan `strict: true`.
- **DILARANG MENGGUNAKAN PYTHON:** Tidak boleh ada kode Python (`.py`), `yt-dlp`, atau `ffmpeg` eksternal.
- **Mobile Framework:** React Native (Expo Prebuild / Bare Workflow agar mendukung modul native audio).
- **Backend Lisensi:** Node.js + TypeScript (Serverless / Express) khusus untuk autentikasi Lisensi & Device Binding.
- **Prinsip Scraping YouTube:**
  - Ekstraksi pencarian dan URL audio YouTube WAJIB dilakukan **On-Device (Client-Side)** langsung dari aplikasi React Native menggunakan protokol **YouTube InnerTube API** (menyamar sebagai klien `ANDROID` / `IOS` resmi YouTube Music) atau library murni JS/TS (`youtubei.js`).
  - **DILARANG** mem-proxy stream file audio melalui server Node.js/Vercel untuk menghindari blokir IP Data Center dan limitasi payload 4.5MB.

## 3. ATURAN PENGERJAAN KODE (INCREMENTAL WORKFLOW)
- Jangan pernah merombak banyak modul sekaligus jika tidak diminta.
- Hanya edit file yang berkaitan langsung dengan instruksi prompt saat ini.
- Dilarang memasang package/library berbayar atau API pihak ketiga yang memerlukan kartu kredit/RapidAPI (Anti Error 402).
- Selalu pastikan tipe data TypeScript valid sebelum menyelesaikan tugas.