# aljamicerdas.id

Fondasi tugas pertama: skema penyimpanan kuis dan skor, serta struktur state sesi dengan TypeScript dan Zustand. Belum ada UI, pemanggilan AI, parser dokumen, API penyimpanan, timer yang berjalan, atau detektor MediaPipe.

- `src/domain/schema.ts`: definisi entitas dan kontrak snapshot sesi.
- `database/schema.sql`: rancangan tabel PostgreSQL, primary key, foreign key, dan constraint dasar.
- `src/state/session-state.ts`: state fase kuis, timer, kamera, dan payload jawaban.
- `src/state/session-store.ts`: store Zustand, pemuatan snapshot, pengaturan antrean, dan selector leaderboard.
- `docs/architecture.md`: relasi, aturan transaksi, alur state, dan batas implementasi.

Jalankan pemeriksaan:

```sh
npm ci
npm run check
```

SQL merupakan skema awal untuk database kosong, belum diterapkan ke database pengguna. ID UUID dibuat oleh lapisan aplikasi. Pemetaan kolom `snake_case` ke properti TypeScript `camelCase` dilakukan repository/API yang akan dibangun berikutnya.

Tes skema memakai PostgreSQL tertanam melalui PGlite dengan data uji di memori. Pemeriksaan ini tidak membutuhkan koneksi atau mengubah database pengguna. Tes state mencakup skor kumulatif/per ronde, retry snapshot, urutan peserta, penolakan callback lama, sinkronisasi, dan reset.

Store memakai [Zustand `createStore`](https://zustand.docs.pmnd.rs/reference/apis/create-store), sehingga fondasi ini dapat diuji tanpa memasang komponen React. Gunakan factory per request bila kelak menambahkan SSR.
