import type { ReactNode } from "react";
import { ArrowLeft, BookOpenText, WarningCircle, SpinnerGap } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export function PageTitle({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  back?: string;
}) {
  return (
    <div className="page-heading">
      <div>
        {back && (
          <Link to={back} className="back-link">
            <ArrowLeft size={16} /> Kembali
          </Link>
        )}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
export function ErrorNotice({ message }: { message: string | null }) {
  return message ? (
    <div className="notice error" role="alert">
      <WarningCircle size={21} />
      <span>{message}</span>
    </div>
  ) : null;
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <BookOpenText size={32} weight="duotone" />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Loading({ text = "Menyiapkan ruang belajar…" }: { text?: string }) {
  return (
    <div className="loading" role="status">
      <SpinnerGap className="spin" size={28} />
      <span>{text}</span>
    </div>
  );
}
export function Status({ ready }: { ready: boolean }) {
  return (
    <span className={`status ${ready ? "ready" : "draft"}`}>
      {ready ? "Siap digunakan" : "Perlu ditinjau"}
    </span>
  );
}
export function Stepper({ active }: { active: number }) {
  return (
    <ol className="stepper" aria-label="Tahap persiapan kuis">
      {["Masukkan materi", "Tinjau soal", "Siapkan kelas"].map((label, index) => (
        <li key={label} className={active === index ? "active" : active > index ? "complete" : ""}>
          <span>{index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}
export function BookArt() {
  return (
    <div className="book-art" aria-hidden="true">
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <div className="art-arch">
        <div className="art-sun" />
        <div className="art-book">
          <BookOpenText weight="duotone" size={132} />
        </div>
        <div className="book-rest" />
      </div>
      <span className="art-letter letter-one">ب</span>
      <span className="art-letter letter-two">ا</span>
      <span className="art-letter letter-three">ت</span>
      <div className="art-leaf leaf-one" />
      <div className="art-leaf leaf-two" />
    </div>
  );
}
