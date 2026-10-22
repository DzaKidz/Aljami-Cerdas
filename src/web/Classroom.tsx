import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Camera, CheckCircle, HandPalm, Play, Crown, UsersThree, ArrowRight } from "@phosphor-icons/react";
import { useApp } from "./context.js";
import { Empty, ErrorNotice, PageTitle, Stepper } from "./components.js";
import { CameraFeed } from "./CameraFeed.js";
import { RosterEditor } from "./Management.js";
import { errorMessage, post } from "../lib/api.js";
import type { SessionResponse } from "../domain/contracts.js";

export function Classroom() {
  const { data, refresh } = useApp(); const [params] = useSearchParams(); const navigate = useNavigate();
  const ready = data.quizzes.filter((q) => q.status === "READY");
  const [quizId, setQuizId] = useState(params.get("quiz") ?? ready[0]?.id ?? "");
  const [names, setNames] = useState([...data.settings.roster]); const [rounds, setRounds] = useState(3);
  const [camera, setCamera] = useState(false); const [cameraReady, setCameraReady] = useState(false); const [count, setCount] = useState(0);
  const [practice, setPractice] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const selected = ready.find((q) => q.id === quizId); const eligible = selected && selected.finalCount > 0 && (rounds === 1 || selected.regularCount > 0);
  async function start() {
    setBusy(true); setError(null);
    try { const response = await post<SessionResponse>("/sessions", { quizId, names, totalRounds: rounds }); await refresh(); navigate(`/sesi/${response.snapshot.session.id}${practice ? "?practice=1" : ""}`); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <><PageTitle title="Siapkan kelas hari ini" subtitle="Cek kamera, atur urutan, lalu biarkan santri mengambil peran." /><Stepper active={2} /><ErrorNotice message={error} />{!ready.length ? <div className="panel"><Empty title="Siapkan satu kuis terlebih dahulu" description="Kuis perlu ditinjau dan disetujui agar dapat digunakan di kelas."><Link className="btn primary" to="/materi">Buka materi & kuis <ArrowRight size={18} /></Link></Empty></div> : <>
    <div className="class-config panel"><label className="field">Kuis yang digunakan<select value={quizId} onChange={(e) => setQuizId(e.target.value)}>{ready.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title} · {quiz.questionCount} soal</option>)}</select></label><label className="field round-field">Jumlah ronde<input type="number" min={1} max={20} value={rounds} onChange={(e) => setRounds(Math.max(1, Math.min(20, Number(e.target.value))))} /></label><div className="round-note"><Crown size={23} weight="duotone" /><span>Ronde terakhir adalah <strong>ronde final</strong><small>4 pilihan jawaban, 1 poin untuk jawaban benar.</small></span></div></div>
    <div className="classroom-grid"><section className="panel camera-panel"><div className="section-heading"><div><h2>Cek kamera & gestur</h2><p>Posisikan santri dengan cahaya dari depan.</p></div><span className={`status ${cameraReady ? "ready" : "neutral"}`}>{cameraReady ? "Siap" : "Belum aktif"}</span></div><CameraFeed enabled={camera} onCount={setCount} onReady={setCameraReady} /><div className="camera-toolbar"><button className={`btn ${camera ? "secondary" : "primary"}`} onClick={() => setCamera(!camera)}><Camera size={20} />{camera ? "Matikan kamera" : "Aktifkan kamera"}</button><span>{cameraReady ? <><CheckCircle size={19} />{count > 0 && count <= 4 ? `${count} jari terbaca` : "Kamera siap digunakan"}</> : "Kamera digunakan hanya selama sesi."}</span></div><div className="gesture-guide">{[1, 2, 3, 4].map((n) => <div key={n} className={count === n ? "detected" : ""}><span className="finger-count">{n}<HandPalm size={22} /></span><strong>{String.fromCharCode(64 + n)}</strong><small>{n === 4 ? "Khusus final" : `${n} jari`}</small></div>)}</div><label className="practice-toggle"><input type="checkbox" checked={practice} onChange={(e) => setPractice(e.target.checked)} /><span>Mode latihan guru<small>Coba alur kuis dengan tombol, tanpa kamera.</small></span></label></section>
    <section className="panel queue-panel"><div className="section-heading"><div><h2>Urutan santri</h2><p>Satu nama, satu giliran setiap ronde.</p></div><UsersThree size={25} weight="duotone" /></div><RosterEditor names={names} onChange={setNames} /></section></div>
    <div className="start-class-panel"><div><h2>{names.length ? `${names.length} santri, ${rounds} ronde. Mari belajar!` : "Tambahkan santri untuk memulai"}</h2><p>{!eligible ? "Tambahkan soal final dan soal biasa yang sesuai di editor kuis." : practice ? "Mode latihan guru aktif. Jawaban dipilih melalui tombol simulasi." : !cameraReady ? "Aktifkan kamera dan pastikan gestur terbaca sebelum memulai." : "Semua siap. Guru dapat menjeda sesi kapan saja."}</p></div><button className="btn primary large" disabled={!names.length || !eligible || (!practice && !cameraReady) || busy} onClick={() => void start()}><Play size={20} weight="fill" />{busy ? "Menyiapkan sesi…" : practice ? "Mulai latihan" : "Mulai kelas"}</button></div>
    </>}</>;
}
