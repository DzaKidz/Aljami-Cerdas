# aljamicerdas.id

Ruang guru TPQ untuk menyiapkan materi, meninjau soal, mengatur antrean santri, dan menjalankan kuis dengan gestur tangan. React, TypeScript, Zustand, Express, dan PostgreSQL tertanam melalui PGlite.

- `src/domain/schema.ts`: definisi entitas dan kontrak snapshot sesi.
- `database/schema.sql`: rancangan tabel PostgreSQL, primary key, foreign key, dan constraint dasar.
- `src/state/session-state.ts`: state fase kuis, timer, kamera, dan payload jawaban.
- `src/state/session-store.ts`: store Zustand, pemuatan snapshot, pengaturan antrean, dan selector leaderboard.
- `docs/architecture.md`: relasi, aturan transaksi, alur state, dan batas implementasi.

## Menjalankan aplikasi

Gunakan Node.js 22.12+ atau versi LTS yang lebih baru.

```sh
npm ci
npm run assets
npm run dev
```

Buka http://localhost:5173. Server menerima koneksi lokal. `npm run assets` menyiapkan WASM MediaPipe dan mengunduh model tangan resmi pada penggunaan pertama. Font, model, serta pemrosesan kamera selanjutnya dilayani lokal.

Untuk build produksi lokal, jalankan `npm run build`, lalu `npm start`. Hentikan server pengembangan lebih dahulu bila memakai port yang sama. Aplikasi membutuhkan server Node.js untuk API dan database; direktori `dist` saja tidak mencakup layanan penyimpanan.

## Alur penggunaan

1. Unggah PDF, PPTX, Markdown/TXT atau tulis materi. Batas dokumen 20 MB dan 150 halaman/slide. PDF hasil pindai memerlukan OCR terpisah.
2. Susun soal sendiri, gunakan contoh yang diberi label, atau buat draf melalui AI. Tinjau pertanyaan, kunci, dan pembahasan sebelum memberi persetujuan. Perubahan isi membatalkan centang persetujuan.
3. Atur santri melalui drag-and-drop atau tombol panah. Pilih jumlah ronde serta waktu per jawaban: 10 detik, 1, 2, 3, atau 5 menit.
4. Kalibrasi kamera, atau gunakan Mode latihan guru untuk mencoba alur dengan tombol.
5. Setiap santri mendapat satu giliran per ronde. Gestur stabil 550 ms memulai lock maksimal 3 detik. Menurunkan atau mengubah jari sebelum lock berakhir mengembalikan sisa waktu utama.
6. Ronde biasa memakai A/B/C dan final A/B/C/D. Benar mendapat 1 poin; salah atau kosong 0. Giliran berikutnya otomatis, pergantian ronde menunggu guru.
7. Lihat podium dan daftar peringkat, selesaikan kelas, lalu buka hasil atau unduh CSV.

## Konfigurasi AI dan data

Salin `.env.example` menjadi `.env`. Isi `AI_API_KEY`, `AI_MODEL`, dan bila perlu `AI_API_URL` sesuai penyedia endpoint Chat Completions yang kompatibel, lalu mulai ulang server. Kunci tetap di server. Materi dikirim ke penyedia AI hanya saat guru menekan tombol pembuatan soal. Tanpa konfigurasi, pembuatan manual dan contoh tetap tersedia.

`.data/` menyimpan seluruh database lokal. `DATA_DIR` dapat memilih lokasi lain. Cadangkan seluruh direktori saat server berhenti. Setiap sesi menyimpan salinan soal dan durasinya. Perubahan bank soal tidak mengubah sesi lama; retry jawaban tidak menggandakan poin.

Refresh memerlukan guru memulai kembali giliran yang belum selesai, dengan durasi sesi. Jawaban yang sudah tersimpan tetap ada. Kamera dan landmark tangan tidak disimpan ke database atau dikirim ke AI.

Versi ini memakai satu profil guru lokal. Autentikasi banyak guru, hosting publik, dan domain aljamicerdas.id belum dikonfigurasi. Kamera fisik perlu dikalibrasi dengan perangkat dan pencahayaan kelas sebenarnya.

## Pemeriksaan

```sh
npm run check
npm run build
```

`npm run format` merapikan kode; `npm run format:check` memeriksa konsistensi tanpa mengubah file. Lihat [catatan verifikasi](docs/verification.md) untuk bukti pengujian dan batas yang belum diuji.

Tes skema memakai PostgreSQL tertanam melalui PGlite dengan data uji di memori. Pemeriksaan ini tidak membutuhkan koneksi atau mengubah database pengguna. Tes state mencakup skor kumulatif/per ronde, retry snapshot, urutan peserta, penolakan callback lama, sinkronisasi, dan reset.

Store memakai [Zustand `createStore`](https://zustand.docs.pmnd.rs/reference/apis/create-store), sehingga fondasi ini dapat diuji tanpa memasang komponen React. Gunakan factory per request bila kelak menambahkan SSR.
