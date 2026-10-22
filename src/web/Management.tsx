import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Trash,
  ArrowUp,
  ArrowDown,
  DotsSixVertical,
  FloppyDisk,
  UsersThree,
  BookOpenText,
  ArrowRight,
  Camera,
  CheckCircle,
  WarningCircle,
  ChartBar,
  Trophy,
} from "@phosphor-icons/react";
import { useApp } from "./context.js";
import { Empty, ErrorNotice, PageTitle } from "./components.js";
import { dateLabel, errorMessage, put } from "../lib/api.js";

export function RosterEditor({
  names,
  onChange,
}: {
  names: string[];
  onChange: (names: string[]) => void;
}) {
  const [name, setName] = useState("");
  const [dragged, setDragged] = useState<number | null>(null);
  function add() {
    if (name.trim() && names.length < 40) {
      onChange([...names, name.trim()]);
      setName("");
    }
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= names.length) return;
    const next = [...names];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  }
  return (
    <>
      <form
        className="add-person"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          aria-label="Nama santri"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tuliskan nama santri…"
        />
        <button
          className="btn primary"
          type="submit"
          aria-label="Tambahkan santri"
          disabled={!name.trim() || names.length >= 40}
        >
          <Plus size={18} />
          <span>Tambahkan</span>
        </button>
      </form>
      <p className="field-hint">
        Urutkan sesuai posisi berdiri. Geser baris atau gunakan tombol panah.
      </p>
      <ol className="roster-list">
        {names.map((person, index) => (
          <li
            draggable
            key={`${index}-${person}`}
            onDragStart={() => setDragged(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragged !== null) move(dragged, index);
              setDragged(null);
            }}
            onDragEnd={() => setDragged(null)}
            className={dragged === index ? "dragging" : ""}
          >
            <span className="drag-handle" aria-hidden="true">
              <DotsSixVertical size={18} />
            </span>
            <span className="roster-number">{index + 1}</span>
            <span className="person-name">{person}</span>
            <div className="person-controls">
              <button
                className="icon-button"
                aria-label={`Naikkan ${person}`}
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                className="icon-button"
                aria-label={`Turunkan ${person}`}
                disabled={index === names.length - 1}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                className="icon-button danger"
                aria-label={`Hapus ${person} dari daftar`}
                onClick={() => onChange(names.filter((_, i) => i !== index))}
              >
                <Trash size={17} />
              </button>
            </div>
          </li>
        ))}
      </ol>
      {!names.length && (
        <div className="roster-empty">
          <UsersThree size={36} weight="duotone" />
          <h3>Siapa yang belajar hari ini?</h3>
          <p>Tambahkan nama santri satu per satu.</p>
        </div>
      )}
      <div className="roster-total">
        <span>Total santri</span>
        <strong>{names.length} / 40</strong>
      </div>
    </>
  );
}
export function Roster() {
  const { data, refresh, notify } = useApp();
  const [names, setNames] = useState(data.settings.roster);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await put("/settings", { ...data.settings, roster: names });
      await refresh();
      notify("Daftar santri berhasil disimpan.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Daftar santri"
        subtitle="Kenali setiap nama. Beri semua santri kesempatan yang sama."
        action={
          <button className="btn primary" disabled={busy} onClick={() => void save()}>
            <FloppyDisk size={18} />
            {busy ? "Menyimpan…" : "Simpan daftar"}
          </button>
        }
      />
      <ErrorNotice message={error} />
      <div className="roster-page">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>{data.settings.className}</h2>
              <p>Daftar ini akan tersedia saat Anda menyiapkan kelas.</p>
            </div>
            <UsersThree size={27} weight="duotone" />
          </div>
          <RosterEditor names={names} onChange={setNames} />
        </section>
        <aside className="guide-panel">
          <h2>
            Setiap santri
            <br />
            punya giliran.
          </h2>
          <p>Nama dan urutan dipakai untuk memanggil santri selama kuis.</p>
          <ul className="plain-tips">
            <li>Nama boleh sama. Setiap peserta tetap dicatat secara terpisah.</li>
            <li>Daftar dapat disesuaikan lagi sebelum kelas dimulai.</li>
            <li>Urutan dibekukan saat sesi berjalan agar giliran tetap adil.</li>
          </ul>
          <Link className="btn secondary" to="/kelas">
            Siapkan kelas <ArrowRight size={17} />
          </Link>
        </aside>
      </div>
    </>
  );
}
export function Settings() {
  const { data, refresh, notify } = useApp();
  const [teacherName, setTeacherName] = useState(data.settings.teacherName);
  const [className, setClassName] = useState(data.settings.className);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await put("/settings", { ...data.settings, teacherName, className });
      await refresh();
      notify("Pengaturan berhasil disimpan.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Pengaturan ruang guru"
        subtitle="Sesuaikan identitas kelas dan periksa kesiapan layanan."
      />
      <ErrorNotice message={error} />
      <div className="settings-grid">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="section-heading">
            <h2>Guru & kelas</h2>
            <UsersThree size={24} />
          </div>
          <label className="field">
            Nama panggilan guru
            <input
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              required
              maxLength={80}
            />
          </label>
          <label className="field">
            Nama kelas / TPQ
            <input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              required
              maxLength={100}
            />
          </label>
          <button className="btn primary" disabled={busy}>
            <FloppyDisk size={18} />
            {busy ? "Menyimpan…" : "Simpan pengaturan"}
          </button>
        </form>
        <div className="panel">
          <div className="section-heading">
            <h2>Kesiapan layanan</h2>
            <CheckCircle size={24} />
          </div>
          <div className="service-row">
            <span>
              <strong>Penyimpanan kelas</strong>
              <small>Materi dan hasil tersimpan di perangkat guru.</small>
            </span>
            <span className="status ready">Terhubung</span>
          </div>
          <div className="service-row">
            <span>
              <strong>Pembuatan soal AI</strong>
              <small>
                {data.aiConfigured
                  ? "Siap menyusun draf dari materi Anda."
                  : "Pengelola perlu menghubungkan layanan AI."}
              </small>
            </span>
            <span className={`status ${data.aiConfigured ? "ready" : "draft"}`}>
              {data.aiConfigured ? "Terhubung" : "Belum aktif"}
            </span>
          </div>
          <div className="service-row">
            <span>
              <strong>Kamera & gestur</strong>
              <small>Izin kamera diminta saat menyiapkan kelas.</small>
            </span>
            <Link className="subtle-link" to="/kelas">
              Cek kamera <ArrowRight size={16} />
            </Link>
          </div>
          <p className="field-hint">
            Saat ini ruang guru berjalan pada perangkat ini. Akses akun banyak guru belum
            diaktifkan.
          </p>
        </div>
      </div>
    </>
  );
}
export function Help() {
  return (
    <>
      <PageTitle
        title="Belajar bersama, selangkah demi selangkah"
        subtitle="Panduan singkat untuk menyiapkan kelas interaktif pertama Anda."
      />
      <div className="help-flow">
        {[
          [
            BookOpenText,
            "01",
            "Siapkan bahan belajar",
            "Unggah PDF, PowerPoint, atau Markdown. Teks hasil ekstraksi bisa diperbaiki. PDF berupa hasil pindai perlu diubah menjadi teks terlebih dahulu.",
          ],
          [
            CheckCircle,
            "02",
            "Tinjau setiap soal",
            "Susun soal sendiri atau gunakan AI ketika terhubung. Periksa pertanyaan, kunci, dan pembahasan. Beri persetujuan sebelum kuis digunakan.",
          ],
          [
            UsersThree,
            "03",
            "Atur santri dan kamera",
            "Tambahkan nama sesuai urutan berdiri. Nyalakan kamera, pastikan wajah dan tangan mendapat cahaya yang cukup, lalu pilih jumlah ronde.",
          ],
          [
            Camera,
            "04",
            "Mulai kuis gestur",
            "Santri yang dipanggil mengangkat 1, 2, atau 3 jari untuk A, B, atau C. Pada ronde final, 4 jari memilih D. Santri tidak perlu menyentuh perangkat.",
          ],
        ].map(([Icon, number, title, body]) => {
          const Illustration = Icon as typeof BookOpenText;
          return (
            <article className="panel help-step" key={number as string}>
              <div>
                <Illustration size={30} weight="duotone" />
                <span>{number as string}</span>
              </div>
              <h2>{title as string}</h2>
              <p>{body as string}</p>
            </article>
          );
        })}
      </div>
      <section className="panel faq">
        <h2>Yang perlu diketahui saat kelas</h2>
        {[
          [
            "Bagaimana waktu jawaban bekerja?",
            "Guru memilih waktu per jawaban saat menyiapkan kelas: 10 detik, 1, 2, 3, atau 5 menit. Gestur yang stabil memulai penguncian maksimal 3 detik. Turunkan tangan sebelum penguncian selesai untuk membatalkan; sisa waktu utama dipulihkan. Jika waktu tinggal kurang dari 3 detik, penguncian tidak memperpanjang waktu.",
          ],
          [
            "Bagaimana jika kamera tidak bisa digunakan?",
            "Periksa izin kamera di browser dan tutup aplikasi lain yang sedang memakai kamera. Mode latihan guru dapat dipakai untuk mencoba alur dengan tombol. Mode tersebut bukan sesi gestur santri.",
          ],
          [
            "Apakah final memberi poin tambahan?",
            "Tidak. Jawaban benar selalu 1 poin, salah atau tidak menjawab 0 poin. Final memiliki empat opsi dan soal lebih menantang. Skor seri tetap mendapat peringkat yang sama.",
          ],
          [
            "Apa yang terjadi jika halaman tertutup?",
            "Jawaban yang sudah tersimpan tetap ada. Buka sesi dari Hasil belajar. Giliran yang belum selesai dapat diulang dengan durasi yang dipilih untuk sesi tersebut; kamera harus disiapkan kembali.",
          ],
          [
            "Bagaimana menjaga pembacaan gestur tetap jelas?",
            "Hanya satu santri mengangkat satu tangan dalam area kamera. Hadapkan telapak ke kamera, buka jari dengan jelas, dan tahan posisi. Hindari cahaya kuat dari belakang. Periksa hasil deteksi saat kalibrasi.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <div className="help-cta">
        <h2>Siap untuk kelas pertama?</h2>
        <Link className="btn primary" to="/kelas">
          Siapkan kelas <ArrowRight size={18} />
        </Link>
      </div>
    </>
  );
}
export function Results() {
  const { data } = useApp();
  const [filter, setFilter] = useState("ALL");
  const sessions = data.sessions.filter(
    (s) =>
      filter === "ALL" || (filter === "DONE" ? s.status === "COMPLETED" : s.status !== "COMPLETED"),
  );
  return (
    <>
      <PageTitle
        title="Hasil belajar"
        subtitle="Lihat perjalanan kelas, rayakan setiap usaha santri."
      />
      <div className="filter-tabs standalone">
        {[
          ["ALL", "Semua sesi"],
          ["DONE", "Selesai"],
          ["ACTIVE", "Belum selesai"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={filter === key ? "active" : ""}
            onClick={() => setFilter(key!)}
          >
            {label}
          </button>
        ))}
      </div>
      {sessions.length ? (
        <div className="results-grid">
          {sessions.map((session) => (
            <Link key={session.id} to={`/sesi/${session.id}`} className="panel result-card">
              <div className="result-card-top">
                <div className="subject-icon tone-1">
                  <Trophy size={26} weight="duotone" />
                </div>
                <span className={`status ${session.status === "COMPLETED" ? "ready" : "draft"}`}>
                  {session.status === "COMPLETED" ? "Selesai" : "Belum selesai"}
                </span>
              </div>
              <h2>{session.title}</h2>
              <p>{dateLabel(session.createdAt)}</p>
              <div className="result-metrics">
                <span>
                  <strong>{session.participantCount}</strong>Santri
                </span>
                <span>
                  <strong>{session.totalRounds}</strong>Ronde
                </span>
                <span>
                  <strong>{session.answerCount}</strong>Jawaban
                </span>
              </div>
              <div className="result-link">
                {session.status === "COMPLETED" ? "Lihat hasil kelas" : "Buka kembali sesi"}
                <ArrowRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty
            title="Perjalanan kelas dimulai dari satu sesi"
            description="Hasil dan peringkat santri akan tersimpan di sini setelah kuis dimulai."
          >
            <Link className="btn primary" to="/kelas">
              Siapkan kelas <ArrowRight size={18} />
            </Link>
          </Empty>
        </div>
      )}
    </>
  );
}
