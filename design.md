# DESIGN.md — Spesifikasi UI/UX & Sistem Desain

## 1. Tema & Palet Warna (Dark Industrial / Modern Music App)
- **Background Primary:** `#09090B` (Rich Black)
- **Background Secondary / Card:** `#18181B` (Zinc Dark)
- **Accent Primary:** `#10B981` (Emerald Green — untuk indikator Offline Ready & tombol aktif)
- **Text Primary:** `#FAFAFA` (Putih Bersih)
- **Text Secondary:** `#A1A1AA` (Abu-abu Muted untuk nama artis & durasi)
- **Danger / Error:** `#EF4444` (Merah untuk status gagal/peringatan lisensi)

## 2. Struktur Layar Utama (4 Komponen Inti)
1. **Layar Aktivasi Lisensi (`LicenseScreen.tsx`):**
   - Tampil hanya jika pengguna belum memiliki token lisensi aktif.
   - Input kolom kode lisensi, tombol "Aktivasi Perangkat", dan tombol "Beli Kode Akses (Rp50.000)" yang mengarah ke WhatsApp Admin.
2. **Tab 1: Cari & Unduh (`SearchScreen.tsx`):**
   - Search bar di bagian atas dengan *debounce* 500ms.
   - Daftar hasil lagu YouTube: Thumbnail kotak (`56x56`), Judul Lagu (maksimal 1 baris), Nama Artis & Durasi, tombol **Play Stream**, dan tombol **Download Offline** (berubah menjadi lingkaran *progress bar* saat mengunduh, dan berubah menjadi ikon Centang Hijau `✓` saat sudah tersimpan di HP).
3. **Tab 2: Koleksi Offline (`LibraryScreen.tsx`):**
   - Banner status jaringan di atas (contoh: *"Mode Offline Aktif — Memutar dari Memori Internal"*).
   - Daftar lagu yang sudah diunduh ke HP, tombol Putar Semua (*Play All*), dan tombol Hapus File untuk menghemat memori HP.
4. **Global Mini Player & Full Player Modal (`PlayerBar.tsx`):**
   - Melayang di atas Bottom Tab Bar di semua layar.
   - Menampilkan cover lagu yang sedang berputar, judul, tombol Play/Pause, dan tombol Next.
   - Jika diklik, membuka tampilan Full Screen Player dengan *slider* durasi lagu.