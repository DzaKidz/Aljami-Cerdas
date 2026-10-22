import { useEffect, useState, useCallback } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { BookOpenText, SquaresFour, Stack, UsersThree, VideoCamera, ChartBar, GearSix, Question, MagnifyingGlass, List, X, CalendarBlank, CaretRight, CheckCircle } from "@phosphor-icons/react";
import type { Bootstrap } from "../domain/contracts.js";
import { api, errorMessage } from "../lib/api.js";
import { AppContext } from "./context.js";
import { Loading, ErrorNotice } from "./components.js";
import { Dashboard, Library } from "./Dashboard.js";
import { Editor } from "./Editor.js";
import { Roster, Settings, Help, Results } from "./Management.js";
import { Classroom } from "./Classroom.js";
import { PlaySession } from "./PlaySession.js";

const navigation = [
  { to: "/", label: "Ringkasan", icon: SquaresFour },
  { to: "/materi", label: "Materi & kuis", icon: Stack },
  { to: "/santri", label: "Daftar santri", icon: UsersThree },
  { to: "/kelas", label: "Kelas interaktif", icon: VideoCamera },
  { to: "/hasil", label: "Hasil belajar", icon: ChartBar },
];
export function App() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation(); const navigate = useNavigate();
  const refresh = useCallback(async () => { const result = await api<Bootstrap>("/bootstrap"); setData(result); setError(null); }, []);
  useEffect(() => { void refresh().catch((e) => setError(errorMessage(e))); }, [refresh]);
  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(""), 4500); return () => clearTimeout(id); } }, [toast]);
  useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);
  const activeLabel = navigation.find((nav) => nav.to !== "/" && location.pathname.startsWith(nav.to))?.label ?? "Ringkasan";
  const immersive = location.pathname.startsWith("/sesi/");
  return <div className={`app-shell ${immersive ? "immersive" : ""}`}>
    <a className="skip-link" href="#main-content">Lewati ke konten</a>
    {menu && <button className="menu-overlay" aria-label="Tutup menu" onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? "open" : ""}`}>
      <Link to="/" className="brand" aria-label="Aljami Cerdas, ringkasan"><span className="brand-mark"><BookOpenText size={27} weight="duotone" /></span><span><strong>aljami<span>cerdas</span></strong><small>Ruang belajar, tumbuh bersama.</small></span></Link>
      <div className="sidebar-label">RUANG GURU</div>
      <nav aria-label="Navigasi utama">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `nav-item ${isActive ? "selected" : ""}`}><Icon size={22} weight="duotone" /><span>{label}</span>{to === "/kelas" && <span className="nav-new">Live</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><BookOpenText size={23} weight="duotone" /><strong>Setiap langkah kecil,<br />berarti untuk mereka.</strong><p>Temani santri belajar dengan<br />sabar dan menyenangkan.</p></div><NavLink className="nav-item" to="/panduan"><Question size={21} />Panduan penggunaan</NavLink><NavLink className="nav-item" to="/pengaturan"><GearSix size={21} />Pengaturan</NavLink><div className="local-label"><span />Ruang guru lokal</div></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label={menu ? "Tutup menu" : "Buka menu"} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X size={22} /> : <List size={22} />}</button><span>Ruang guru</span><CaretRight size={13} /><strong>{immersive ? "Sesi kuis" : activeLabel}</strong></div>
      <div className="top-actions"><form className="global-search" onSubmit={(e) => { e.preventDefault(); navigate(`/materi?q=${encodeURIComponent(search)}`); }}><MagnifyingGlass size={19} /><input aria-label="Cari materi atau kuis" placeholder="Cari materi atau kuis…" value={search} onChange={(e) => setSearch(e.target.value)} /></form><Link to="/pengaturan" className="teacher-avatar" aria-label="Pengaturan guru">{data?.settings.teacherName.slice(0, 1).toUpperCase() ?? "G"}</Link></div>
    </header>
    <main id="main-content" className="main-content" tabIndex={-1}>
      {!data ? <><ErrorNotice message={error} />{error ? <button className="btn primary" onClick={() => void refresh().catch((e) => setError(errorMessage(e)))}>Coba kembali</button> : <Loading />}</> : <AppContext.Provider value={{ data, refresh, notify: setToast }}><Routes>
        <Route path="/" element={<Dashboard />} /><Route path="/materi" element={<Library />} /><Route path="/materi/baru" element={<Editor />} /><Route path="/materi/:id" element={<Editor />} />
        <Route path="/santri" element={<Roster />} /><Route path="/kelas" element={<Classroom />} /><Route path="/sesi/:id" element={<PlaySession />} /><Route path="/hasil" element={<Results />} />
        <Route path="/pengaturan" element={<Settings />} /><Route path="/panduan" element={<Help />} /><Route path="*" element={<div className="empty"><h1>Halaman tidak ditemukan</h1><Link className="btn primary" to="/">Kembali ke ringkasan</Link></div>} />
      </Routes></AppContext.Provider>}
    </main><footer className="page-footer"><span>Aljami Cerdas <span className="footer-divider">/</span> Belajar dengan hati.</span><span><CalendarBlank size={15} />{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date())}</span></footer></div>
    {toast && <div className="toast" role="status"><CheckCircle size={23} weight="fill" />{toast}<button className="icon-button" aria-label="Tutup pemberitahuan" onClick={() => setToast("")}><X size={18} /></button></div>}
  </div>;
}
