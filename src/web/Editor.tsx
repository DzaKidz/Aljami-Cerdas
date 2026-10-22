import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  UploadSimple,
  FilePdf,
  FilePpt,
  FileText,
  Plus,
  Trash,
  CheckCircle,
  ArrowRight,
  FloppyDisk,
  PencilLine,
  SpinnerGap,
  BookOpenText,
  Crown,
} from "@phosphor-icons/react";
import { useApp } from "./context.js";
import { ErrorNotice, PageTitle, Stepper, Loading } from "./components.js";
import { api, errorMessage, post, put } from "../lib/api.js";
import { extractMaterial } from "../lib/parsers.js";
import type { QuestionContent } from "../domain/schema.js";
import type { QuizDetail } from "../domain/contracts.js";
import { exampleQuiz } from "../domain/example.js";
import { quizInputSchema } from "../domain/validation.js";

const newQuestion = (final: boolean): QuestionContent =>
  final
    ? {
        mode: "FINAL",
        difficulty: "HARD",
        prompt: "",
        options: { A: "", B: "", C: "", D: "" },
        correctAnswer: "A",
        explanation: "",
      }
    : {
        mode: "REGULAR",
        difficulty: "EASY",
        prompt: "",
        options: { A: "", B: "", C: "" },
        correctAnswer: "A",
        explanation: "",
      };

export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, refresh, notify } = useApp();
  const [title, setTitle] = useState("");
  const [material, setMaterial] = useState("");
  const [sourceType, setSourceType] = useState<"PDF" | "PPTX" | "MARKDOWN">("MARKDOWN");
  const [filename, setFilename] = useState<string | null>(null);
  const [tab, setTab] = useState("file");
  const [questions, setQuestions] = useState<QuestionContent[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [count, setCount] = useState(6);
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [savedReady, setSavedReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const questionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    void api<QuizDetail>(`/quizzes/${id}`)
      .then((quiz) => {
        if (!live) return;
        setTitle(quiz.title);
        setMaterial(quiz.materialText);
        setSourceType(quiz.sourceType);
        setFilename(quiz.originalFilename);
        setQuestions(quiz.questions);
        setSavedReady(quiz.status === "READY");
        setReviewed(quiz.status === "READY");
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [id]);
  function dirty() {
    setReviewed(false);
    setSavedReady(false);
  }
  function editQuestion(index: number, updated: QuestionContent) {
    setQuestions((old) => old.map((q, i) => (i === index ? updated : q)));
    dirty();
  }
  async function readFile(file?: File) {
    if (!file) return;
    setBusy("file");
    setError(null);
    try {
      const result = await extractMaterial(file);
      setMaterial(result.text);
      setSourceType(result.sourceType);
      setFilename(file.name);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
      dirty();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  function useExample() {
    setTitle(exampleQuiz.title);
    setMaterial(exampleQuiz.materialText);
    setSourceType("MARKDOWN");
    setFilename(null);
    setQuestions(structuredClone(exampleQuiz.questions));
    setTab("text");
    dirty();
  }
  async function generate() {
    setBusy("generate");
    setError(null);
    try {
      const result = await post<{ questions: QuestionContent[] }>("/generate", {
        title,
        text: material,
        count,
      });
      setQuestions(result.questions);
      dirty();
      setTimeout(() => questionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function save(ready: boolean) {
    setError(null);
    setBusy("save");
    try {
      const parsed = quizInputSchema.safeParse({
        title,
        materialText: material,
        sourceType,
        originalFilename: filename,
        questions,
        ready,
      });
      if (!parsed.success)
        throw new Error(parsed.error.issues[0]?.message ?? "Lengkapi materi dan soal.");
      const result = id
        ? await put<{ id: string }>(`/quizzes/${id}`, parsed.data)
        : await post<{ id: string }>("/quizzes", parsed.data);
      await refresh();
      notify(ready ? "Kuis disetujui dan siap digunakan." : "Draf kuis berhasil disimpan.");
      if (ready) navigate(`/kelas?quiz=${result.id}`);
      else navigate("/materi");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  if (loading) return <Loading text="Memuat materi dan soal…" />;
  return (
    <>
      <PageTitle
        title={id ? "Tinjau materi & kuis" : "Siapkan kuis baru"}
        subtitle="Mulai dari materi Anda. Guru tetap memegang kendali atas setiap soal."
        back="/materi"
      />
      <Stepper active={questions.length ? 1 : 0} />
      <ErrorNotice message={error} />
      <div className="editor-layout">
        <section className="panel editor-main">
          <div className="section-heading">
            <div>
              <span className="section-kicker">01 / MATERI BELAJAR</span>
              <h2>Apa yang dipelajari hari ini?</h2>
            </div>
            <BookOpenText size={26} weight="duotone" />
          </div>
          <label className="field">
            Judul materi
            <input
              value={title}
              maxLength={150}
              placeholder="Contoh: Adab sehari-hari"
              onChange={(e) => {
                setTitle(e.target.value);
                dirty();
              }}
            />
          </label>
          <div className="input-tabs" role="tablist" aria-label="Metode input materi">
            <button
              role="tab"
              aria-selected={tab === "file"}
              className={tab === "file" ? "active" : ""}
              onClick={() => setTab("file")}
            >
              <UploadSimple size={19} />
              Unggah dokumen
            </button>
            <button
              role="tab"
              aria-selected={tab === "text"}
              className={tab === "text" ? "active" : ""}
              onClick={() => setTab("text")}
            >
              <PencilLine size={19} />
              Tulis materi
            </button>
          </div>
          {tab === "file" && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.pptx,.md,.txt"
                className="sr-only"
                aria-label="Pilih dokumen materi"
                onChange={(e) => void readFile(e.target.files?.[0])}
              />
              <button
                className={`upload-zone ${drag ? "dragging" : ""}`}
                disabled={Boolean(busy)}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  void readFile(e.dataTransfer.files[0]);
                }}
              >
                <span className="upload-icon">
                  {busy === "file" ? (
                    <SpinnerGap className="spin" size={29} />
                  ) : (
                    <UploadSimple size={29} />
                  )}
                </span>
                <strong>
                  {busy === "file" ? "Membaca isi dokumen…" : (filename ?? "Tarik dokumen ke sini")}
                </strong>
                <span>
                  atau <b>pilih dari perangkat</b>
                </span>
                <small>PDF, PPTX, MD, atau TXT · Maksimal 20 MB</small>
              </button>
              <div className="file-types">
                <span>
                  <FilePdf size={18} />
                  PDF
                </span>
                <span>
                  <FilePpt size={18} />
                  PowerPoint
                </span>
                <span>
                  <FileText size={18} />
                  Markdown
                </span>
              </div>
            </>
          )}
          {(tab === "text" || material) && (
            <label className="field material-field">
              {tab === "text" ? "Isi materi (Markdown)" : "Teks hasil ekstraksi"}
              <textarea
                rows={10}
                value={material}
                maxLength={120000}
                placeholder={"# Judul pelajaran\n\nTuliskan materi yang ingin dipelajari santri…"}
                onChange={(e) => {
                  setMaterial(e.target.value);
                  dirty();
                }}
              />
              <span className="field-hint">
                {material.length.toLocaleString("id-ID")} karakter · Pastikan teks sudah sesuai
                sebelum membuat soal.
              </span>
            </label>
          )}
        </section>
        <aside className="editor-aside">
          <section className="panel generate-panel">
            <div className="small-icon">
              <PencilLine size={26} weight="duotone" />
            </div>
            <h2>Dari materi menjadi soal</h2>
            <p>AI membantu menyusun draf. Anda yang memeriksa dan menyetujuinya.</p>
            <label className="field">
              Jumlah soal
              <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[4, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} soal
                  </option>
                ))}
              </select>
            </label>
            <div className="generation-breakdown">
              <span>
                Ronde biasa <strong>{count - 2} soal · 3 opsi</strong>
              </span>
              <span>
                <Crown size={16} />
                Ronde final <strong>2 soal · 4 opsi</strong>
              </span>
            </div>
            <button
              className="btn primary full-width"
              disabled={
                Boolean(busy) ||
                material.trim().length < 30 ||
                title.trim().length < 3 ||
                !data.aiConfigured
              }
              onClick={() => void generate()}
            >
              {busy === "generate" ? (
                <>
                  <SpinnerGap className="spin" size={18} />
                  Menyusun soal…
                </>
              ) : (
                <>
                  Buat soal dari materi <ArrowRight size={18} />
                </>
              )}
            </button>
            {!data.aiConfigured && (
              <p className="connection-note">
                AI belum terhubung. Anda tetap bisa menyusun soal sendiri atau mencoba contoh di
                bawah.
              </p>
            )}
          </section>
          <button className="example-card" onClick={useExample} disabled={Boolean(busy)}>
            <FileText size={24} weight="duotone" />
            <span>
              <strong>Coba materi contoh</strong>
              <small>Adab sehari-hari · 6 soal</small>
            </span>
            <ArrowRight size={18} />
          </button>
          <div className="teacher-note">
            <CheckCircle size={22} />
            <p>Hanya soal yang Anda setujui yang dapat dipakai saat kelas dimulai.</p>
          </div>
        </aside>
      </div>
      <section className="question-section" ref={questionRef}>
        <div className="section-heading">
          <div>
            <span className="section-kicker">02 / TINJAU SOAL</span>
            <h2>Pastikan setiap soal tepat</h2>
            <p>Edit pertanyaan, pilihan, dan kunci jawaban sebelum menyimpan.</p>
          </div>
          <span className="count-label">{questions.length} soal</span>
        </div>
        {!questions.length && (
          <div className="question-empty">
            <PencilLine size={30} />
            <p>Soal akan muncul di sini. Anda juga bisa menulisnya sendiri.</p>
          </div>
        )}
        {questions.map((question, index) => (
          <details className="question-editor" key={index} open={questions.length < 4 || undefined}>
            <summary>
              <span className="question-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="question-summary">{question.prompt || "Tulis pertanyaan baru"}</span>
              <span className={`status ${question.mode === "FINAL" ? "gold" : "neutral"}`}>
                {question.mode === "FINAL" ? "Final · 4 opsi" : "Biasa · 3 opsi"}
              </span>
            </summary>
            <div className="question-editor-body">
              <label className="field">
                Pertanyaan
                <textarea
                  rows={2}
                  value={question.prompt}
                  onChange={(e) => editQuestion(index, { ...question, prompt: e.target.value })}
                />
              </label>
              <div className="edit-options">
                {Object.entries(question.options).map(([key, value]) => (
                  <div
                    className={`edit-option ${question.correctAnswer === key ? "correct" : ""}`}
                    key={key}
                  >
                    <label className="answer-radio" title={`Jadikan ${key} jawaban benar`}>
                      <input
                        type="radio"
                        name={`correct-${index}`}
                        checked={question.correctAnswer === key}
                        onChange={() =>
                          editQuestion(index, {
                            ...question,
                            correctAnswer: key,
                          } as QuestionContent)
                        }
                      />
                      <span>{key}</span>
                    </label>
                    <input
                      aria-label={`Soal ${index + 1}, opsi ${key}`}
                      value={value}
                      placeholder={`Teks pilihan ${key}`}
                      onChange={(e) =>
                        editQuestion(index, {
                          ...question,
                          options: { ...question.options, [key]: e.target.value },
                        } as QuestionContent)
                      }
                    />
                    {question.correctAnswer === key && <CheckCircle size={20} weight="fill" />}
                  </div>
                ))}
              </div>
              <p className="field-hint">
                Pilih huruf di sebelah kiri untuk menetapkan satu jawaban benar.
              </p>
              <label className="field">
                Pembahasan
                <textarea
                  rows={2}
                  value={question.explanation}
                  onChange={(e) =>
                    editQuestion(index, { ...question, explanation: e.target.value })
                  }
                />
              </label>
              <div className="question-bottom">
                <label className="inline-field">
                  Kesulitan
                  <select
                    value={question.difficulty}
                    disabled={question.mode === "FINAL"}
                    onChange={(e) =>
                      editQuestion(index, {
                        ...question,
                        difficulty: e.target.value,
                      } as QuestionContent)
                    }
                  >
                    {question.mode === "FINAL" ? (
                      <option value="HARD">Menantang</option>
                    ) : (
                      <>
                        <option value="EASY">Dasar</option>
                        <option value="MEDIUM">Menengah</option>
                      </>
                    )}
                  </select>
                </label>
                <button
                  className="text-button danger"
                  onClick={() => {
                    setQuestions((old) => old.filter((_, i) => i !== index));
                    dirty();
                  }}
                >
                  <Trash size={17} />
                  Hapus soal
                </button>
              </div>
            </div>
          </details>
        ))}
        <div className="button-row add-questions">
          <button
            className="btn secondary"
            onClick={() => {
              setQuestions([...questions, newQuestion(false)]);
              dirty();
            }}
          >
            <Plus size={18} />
            Tambah soal biasa
          </button>
          <button
            className="btn secondary gold-outline"
            onClick={() => {
              setQuestions([...questions, newQuestion(true)]);
              dirty();
            }}
          >
            <Crown size={18} />
            Tambah soal final
          </button>
        </div>
      </section>
      <div className="save-panel">
        <label className="review-checkbox">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />
          <span>Saya sudah memeriksa materi, soal, dan kunci jawaban.</span>
        </label>
        <div className="button-row">
          <button
            className="btn secondary"
            disabled={Boolean(busy)}
            onClick={() => void save(false)}
          >
            <FloppyDisk size={18} />
            Simpan draf
          </button>
          {id && savedReady ? (
            <Link className="btn primary" to={`/kelas?quiz=${id}`}>
              Siapkan kelas <ArrowRight size={18} />
            </Link>
          ) : (
            <button
              className="btn primary"
              disabled={!reviewed || !questions.length || Boolean(busy)}
              onClick={() => void save(true)}
            >
              {busy === "save" ? "Menyimpan…" : "Setujui & siapkan kelas"}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
