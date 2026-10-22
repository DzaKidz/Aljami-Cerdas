import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useStore } from "zustand";
import { Play, Pause, ArrowRight, ArrowLeft, HandPalm, Crown, Trophy, CheckCircle, XCircle, DownloadSimple, ArrowsOut, SpeakerHigh, SpeakerSlash, Camera, Clock } from "@phosphor-icons/react";
import { quizSessionStore, selectLeaderboard } from "../state/session-store.js";
import type { Answer, AnswerKey, SessionSnapshot } from "../domain/schema.js";
import type { SessionResponse } from "../domain/contracts.js";
import { startTimer, stepTimer } from "../domain/timer.js";
import type { GestureTimer } from "../domain/timer.js";
import { api, errorMessage, post } from "../lib/api.js";
import { useApp } from "./context.js";
import { ErrorNotice, Loading } from "./components.js";
import { CameraFeed } from "./CameraFeed.js";

function exportScores(snapshot: SessionSnapshot) {
  const rows = selectLeaderboard(quizSessionStore.getState());
  const csvValue = (value: string) => `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
  const text = "\uFEFFPeringkat,Nama,Skor,Total ronde\r\n" + rows.map((row) => [row.rank, csvValue(row.displayName), row.score, snapshot.session.totalRounds].join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `hasil-kuis-${snapshot.session.id.slice(0, 8)}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PlaySession() {
  const { id } = useParams(); const [params] = useSearchParams(); const navigate = useNavigate(); const { refresh, notify } = useApp();
  const practice = params.get("practice") === "1"; const state = useStore(quizSessionStore);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null); const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"ready" | "playing" | "saving" | "feedback" | "results">("ready");
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(!practice); const [cameraReady, setCameraReady] = useState(false);
  const [manualCount, setManualCount] = useState(0); const [voice, setVoice] = useState(false);
  const [remaining, setRemaining] = useState(10000); const [timerView, setTimerView] = useState<GestureTimer | null>(null);
  const [feedback, setFeedback] = useState<Answer | null>(null); const [feedbackTurnId, setFeedbackTurnId] = useState<string | null>(null);
  const timer = useRef<GestureTimer | null>(null); const gesture = useRef({ count: 0, time: 0 }); const manual = useRef(0);
  const submitting = useRef(false); const mounted = useRef(true); const startedAt = useRef(0); const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishRef = useRef<(result: GestureTimer) => void>(() => {});
  const activeTurn = Object.values(state.turnsById).find((turn) => turn.status === "ACTIVE") ?? Object.values(state.turnsById).find((turn) => turn.status === "PENDING");
  const shownTurn = feedbackTurnId && (view === "feedback" || view === "saving") ? state.turnsById[feedbackTurnId] : activeTurn;
  const question = shownTurn ? state.questionsById[shownTurn.sessionQuestionId]?.content : undefined;
  const participant = shownTurn ? state.participantsById[shownTurn.participantId] : undefined;
  const round = shownTurn ? state.roundsById[shownTurn.roundId] : undefined;
  const finishedRounds = Object.values(state.roundsById).filter((r) => r.status === "COMPLETED").sort((a, b) => b.number - a.number);
  const resultRound = finishedRounds[0];
  const finalResult = snapshot?.session.status === "COMPLETED" || resultRound?.number === snapshot?.session.totalRounds;
  const standings = selectLeaderboard(state);
  const [lastPaused, setLastPaused] = useState(false);

  useEffect(() => {
    mounted.current = true; setLoading(true);
    void api<SessionResponse>(`/sessions/${id}`).then(({ snapshot: data }) => {
      if (!mounted.current) return; quizSessionStore.getState().loadSnapshot(data); setSnapshot(data);
      setView(data.session.status === "COMPLETED" || data.session.status === "ROUND_RESULTS" ? "results" : "ready");
    }).catch((e) => { if (mounted.current) setError(errorMessage(e)); }).finally(() => { if (mounted.current) setLoading(false); });
    return () => { mounted.current = false; if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current); window.speechSynthesis?.cancel(); };
  }, [id]);

  function pause(reason: "TEACHER" | "CAMERA" = "TEACHER") {
    if (view !== "playing") return;
    timer.current = null; setView("ready"); setLastPaused(true); setManualCount(0); manual.current = 0;
    quizSessionStore.getState().publishPlayback(id!, { phase: "PAUSED", reason });
  }
  useEffect(() => { if (view === "playing" && !practice && !cameraReady) pause("CAMERA"); }, [cameraReady, practice, view]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", hidden); return () => document.removeEventListener("visibilitychange", hidden);
  }, [view]);

  async function begin(continueRound = false) {
    setBusy(true); setError(null); submitting.current = false;
    try {
      const response = await post<SessionResponse>(`/sessions/${id}/activate`, { continueRound });
      if (!mounted.current) return;
      quizSessionStore.getState().loadSnapshot(response.snapshot, "SYNC"); setSnapshot(response.snapshot);
      const turn = response.snapshot.turns.find((t) => t.status === "ACTIVE")!;
      const now = performance.now(); startedAt.current = now; timer.current = startTimer(now);
      setTimerView(timer.current); setRemaining(10000); setManualCount(0); manual.current = 0; gesture.current = { count: 0, time: now };
      setFeedback(null); setFeedbackTurnId(null); setLastPaused(false);
      quizSessionStore.getState().publishPlayback(id!, { phase: "ANSWERING", turnId: turn.id, attemptId: turn.attemptId!, timer: { phase: "COUNTDOWN", deadlineMs: now + 10000, lastDetectedAnswer: null } });
      setView("playing");
      if (voice && "speechSynthesis" in window) {
        window.speechSynthesis.cancel(); const name = response.snapshot.participants.find((p) => p.id === turn.participantId)?.displayName;
        const speech = new SpeechSynthesisUtterance(`Giliran ${name ?? "santri berikutnya"}`); speech.lang = "id-ID"; speech.rate = 0.9; window.speechSynthesis.speak(speech);
      }
    } catch (e) { if (mounted.current) { setError(errorMessage(e)); setView("ready"); } } finally { if (mounted.current) setBusy(false); }
  }
  async function finish(result: GestureTimer) {
    if (submitting.current || !activeTurn || !id) return;
    submitting.current = true; setView("saving"); setFeedbackTurnId(activeTurn.id);
    const submission = { turnId: activeTurn.id, attemptId: activeTurn.attemptId!, selectedAnswer: result.answer, endedBy: result.endedBy, elapsedMs: Math.round(performance.now() - startedAt.current) };
    quizSessionStore.getState().publishPlayback(id, { phase: "SAVING", submission: { ...submission, sessionId: id } });
    try {
      const response = await post<SessionResponse>(`/sessions/${id}/answers`, submission);
      if (!mounted.current) return;
      quizSessionStore.getState().loadSnapshot(response.snapshot, "SYNC"); setSnapshot(response.snapshot);
      const answer = response.snapshot.answers.find((a) => a.turnId === submission.turnId)!; setFeedback(answer); setView("feedback");
      feedbackTimeout.current = setTimeout(() => {
        if (!mounted.current) return;
        if (response.snapshot.session.status === "ROUND_RESULTS") {
          setView("results"); const completed = response.snapshot.rounds.filter((r) => r.status === "COMPLETED").at(-1)!;
          quizSessionStore.getState().publishPlayback(id, { phase: "ROUND_RESULTS", roundId: completed.id });
        } else { void begin(); }
      }, 1800);
    } catch (e) {
      if (!mounted.current) return;
      setError(`${errorMessage(e)} Periksa kembali hasil tersimpan sebelum melanjutkan.`);
      try { const recovered = await api<SessionResponse>(`/sessions/${id}`); quizSessionStore.getState().loadSnapshot(recovered.snapshot, "SYNC"); setSnapshot(recovered.snapshot); setView(recovered.snapshot.session.status === "ROUND_RESULTS" ? "results" : "ready"); }
      catch { setView("ready"); }
    }
  }
  finishRef.current = (result) => { void finish(result); };
  useEffect(() => {
    if (view !== "playing") return;
    let frame = 0; let rendered = 0;
    const loop = (now: number) => {
      if (!timer.current) return;
      const count = practice ? manual.current : now - gesture.current.time < 500 ? gesture.current.count : 0;
      const answer = count >= 1 && count <= (question?.mode === "FINAL" ? 4 : 3) ? String.fromCharCode(64 + count) as AnswerKey : null;
      timer.current = stepTimer(timer.current, now, answer);
      if (now - rendered >= 45 || timer.current.phase === "DONE") { setRemaining(Math.max(0, timer.current.deadline - now)); setTimerView({ ...timer.current }); rendered = now; }
      if (timer.current.phase === "DONE") { finishRef.current(timer.current); return; }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop); return () => cancelAnimationFrame(frame);
  }, [view, practice, activeTurn?.attemptId, question?.mode]);
  async function complete() {
    setBusy(true); try { await post(`/sessions/${id}/complete`); await refresh(); notify("Hasil kelas tersimpan. Terima kasih sudah mendampingi santri."); navigate("/hasil"); }
    catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { notify("Layar penuh belum tersedia di browser ini."); } }
  if (loading) return <Loading text="Menyiapkan sesi kuis…" />;
  if (!snapshot) return <><ErrorNotice message={error} /><Link to="/hasil" className="btn secondary">Kembali ke hasil belajar</Link></>;
  const podium = standings.length === 1 ? [standings[0]!] : [standings[1]!, standings[0]!, standings[2]].filter((entry) => Boolean(entry));
  return <div className="session-view"><div className="session-top"><Link to="/hasil" className="back-link"><ArrowLeft size={17} />Ruang guru</Link><div className="session-controls">{practice && <span className="status gold">Latihan guru</span>}<button className="icon-button" aria-label={voice ? "Matikan panggilan suara" : "Aktifkan panggilan suara"} aria-pressed={voice} onClick={() => setVoice(!voice)}>{voice ? <SpeakerHigh size={22} /> : <SpeakerSlash size={22} />}</button><button className="icon-button" aria-label="Ubah layar penuh" onClick={() => void fullscreen()}><ArrowsOut size={22} /></button></div></div><ErrorNotice message={error} />
    {view === "results" ? <section className="leaderboard-screen"><div className="award-icon"><Trophy size={43} weight="duotone" /></div><span className="section-kicker">{finalResult ? "PERJALANAN HARI INI" : `RONDE ${resultRound?.number ?? 1} SELESAI`}</span><h1>{finalResult ? "Masyaallah, hebat semuanya!" : "Satu langkah lebih pandai."}</h1><p>{finalResult ? "Setiap usaha layak dirayakan. Inilah hasil belajar kelas hari ini." : "Lihat perolehan poin sementara sebelum melangkah ke ronde berikutnya."}</p><div className="podium">{podium.map((entry) => entry && <div className={`podium-person place-${standings.indexOf(entry) + 1}`} key={entry.participantId}><div className="podium-avatar">{standings.indexOf(entry) === 0 && <Crown size={32} weight="fill" />}{entry.displayName.slice(0, 1).toUpperCase()}</div><h3>{entry.displayName}</h3><p>{entry.score} <span>poin</span></p><div className="podium-block"><span>{entry.rank}</span><small>PERINGKAT</small></div></div>)}</div>
      {standings.length > 3 && <div className="ranking-list">{standings.slice(3).map((entry) => <div key={entry.participantId}><span>{entry.rank}</span><strong>{entry.displayName}</strong><span>{entry.score} poin</span></div>)}</div>}
      <div className="result-summary"><span><UsersIcon />{standings.length} santri</span><span><CheckCircle size={19} />{snapshot.answers.length} jawaban tersimpan</span><span><Crown size={19} />{resultRound?.number ?? snapshot.session.totalRounds} ronde selesai</span></div><div className="button-row centered"><button className="btn secondary" onClick={() => exportScores(snapshot)}><DownloadSimple size={18} />Unduh hasil CSV</button>{snapshot.session.status === "COMPLETED" ? <Link className="btn primary" to="/hasil">Kembali ke hasil belajar</Link> : finalResult ? <button className="btn primary" disabled={busy} onClick={() => void complete()}><CheckCircle size={19} />Selesaikan kelas</button> : <button className="btn primary" disabled={busy || (!practice && !cameraReady)} onClick={() => void begin(true)}>Lanjut ronde {Number(resultRound?.number ?? 0) + 1}<ArrowRight size={19} /></button>}</div>
    </section> : <><div className="quiz-progress-heading"><div><span className={`status ${round?.mode === "FINAL" ? "gold" : "ready"}`}>{round?.mode === "FINAL" && <Crown size={16} />}{round?.mode === "FINAL" ? "Ronde final" : `Ronde ${round?.number ?? 1}`}</span><span>dari {snapshot.session.totalRounds} ronde</span></div><p>Giliran {participant ? participant.queuePosition + 1 : 1} dari {snapshot.participants.length} santri</p></div><div className="quiz-workspace"><section className="quiz-stage"><div className="called-student"><span>SEKARANG GILIRAN</span><h1>{participant?.displayName ?? "Santri berikutnya"}</h1></div>
      {view === "ready" ? <div className="turn-ready"><div className="ready-hand"><HandPalm size={58} weight="duotone" /></div><h2>{lastPaused ? "Kita lanjutkan saat sudah siap." : "Sudah siap untuk belajar?"}</h2><p>{lastPaused ? "Giliran yang belum dijawab akan diulang dengan waktu 10 detik." : "Hadapkan telapak ke kamera. Angkat jari sesuai pilihan jawaban."}</p><button className="btn primary large" disabled={busy || (!practice && !cameraReady)} onClick={() => void begin()}><Play size={19} weight="fill" />{busy ? "Memulai…" : "Mulai giliran"}</button>{!practice && !cameraReady && <small>Tunggu sampai kamera siap, lalu mulai giliran.</small>}</div> : <><div className={`quiz-timer ${timerView?.phase === "LOCK" ? "locked" : ""}`}><div className="timer-track"><span style={{ width: `${Math.min(100, remaining / (timerView?.phase === "LOCK" ? 3000 : 10000) * 100)}%` }} /></div><span><Clock size={19} /><strong>{Math.ceil(remaining / 1000)}</strong> detik</span></div><div className="question-onstage"><span>PERTANYAAN</span><h2>{question?.prompt}</h2></div><div className={`answer-grid ${question?.mode === "FINAL" ? "final-options" : ""}`}>{question && Object.entries(question.options).map(([key, value], index) => {
        const selected = timerView?.candidate === key || (practice && manualCount === index + 1);
        const correct = view === "feedback" && key === question.correctAnswer;
        return <button className={`answer-option ${selected ? "selected" : ""} ${correct ? "is-correct" : ""}`} key={key} disabled={!practice || view !== "playing"} onClick={() => { const next = manualCount === index + 1 ? 0 : index + 1; setManualCount(next); manual.current = next; }}><span className="answer-key">{key}</span><strong>{value}</strong><small><HandPalm size={15} />{index + 1} jari</small></button>;
      })}</div><div className={`quiz-feedback ${feedback ? feedback.points ? "success" : "incorrect" : ""}`} role="status">{view === "saving" ? <><Clock size={22} />Menyimpan jawaban…</> : view === "feedback" && feedback ? <>{feedback.points ? <CheckCircle size={27} weight="fill" /> : <XCircle size={27} weight="fill" />}<span><strong>{feedback.points ? "Benar! Satu poin untukmu." : feedback.selectedAnswer ? "Belum tepat. Tetap semangat!" : "Waktu habis. Yuk, coba lagi di ronde berikutnya."}</strong><small>{question?.explanation}</small></span></> : timerView?.phase === "LOCK" ? <><CheckCircle size={23} />Pilihan {timerView.candidate} terbaca. Tahan tangan untuk mengunci.</> : <><HandPalm size={23} />{practice ? "Klik pilihan untuk simulasi gestur. Klik lagi untuk membatalkan." : "Angkat jari dan tahan dengan tenang."}</>}</div></>}
    </section><aside className="quiz-side"><section className="panel turn-details"><div className="section-heading"><h3>{practice ? "Latihan guru" : "Kamera santri"}</h3><HandPalm size={20} /></div>{practice ? <div className="practice-info"><HandPalm size={45} weight="duotone" /><p>Mode simulasi aktif</p><small>Guru memilih jawaban melalui tombol. Sesi gestur asli memakai kamera.</small></div> : <CameraFeed enabled={cameraEnabled} compact onCount={(count) => { gesture.current = { count, time: performance.now() }; }} onReady={setCameraReady} />}
      {!practice && <button className="text-button camera-retry" onClick={() => setCameraEnabled(!cameraEnabled)}><Camera size={16} />{cameraEnabled ? "Matikan kamera" : "Aktifkan kamera"}</button>}
      {view === "playing" && <button className="btn secondary full-width" onClick={() => pause()}><Pause size={19} />Jeda kuis</button>}<p className="small-muted">Guru mengendalikan sesi. Santri cukup mengangkat tangan.</p></section><section className="panel mini-queue"><h3>Urutan kelas</h3>{snapshot.participants.map((p) => <div key={p.id} className={p.id === participant?.id ? "current" : ""}><span>{p.queuePosition + 1}</span><strong>{p.displayName}</strong>{p.id === participant?.id && <Play size={13} weight="fill" />}</div>)}</section></aside></div></>}
    {view === "results" && snapshot.session.status !== "COMPLETED" && !practice && <div className="between-round-camera"><CameraFeed enabled={cameraEnabled} compact onCount={(count) => { gesture.current = { count, time: performance.now() }; }} onReady={setCameraReady} /><button className="btn secondary" onClick={() => setCameraEnabled(!cameraEnabled)}><Camera size={18} />{cameraEnabled ? "Matikan kamera" : "Aktifkan kamera"}</button></div>}
  </div>;
}
function UsersIcon() { return <HandPalm size={19} />; }
