import type { ReactNode } from "react";
import { Crown, Trophy, UsersThree, CheckCircle } from "@phosphor-icons/react";
import type { LeaderboardEntry } from "../state/session-store.js";

interface LeaderboardProps {
  standings: LeaderboardEntry[];
  final: boolean;
  roundNumber: number;
  answerCount: number;
  children: ReactNode;
}

export function Leaderboard({
  standings,
  final,
  roundNumber,
  answerCount,
  children,
}: LeaderboardProps) {
  const podiumOrder = standings.length === 1 ? [0] : [1, 0, 2];
  return (
    <section className="leaderboard-screen">
      <div className="award-icon">
        <Trophy size={43} weight="duotone" />
      </div>
      <span className="section-kicker">
        {final ? "PERJALANAN HARI INI" : `RONDE ${roundNumber} SELESAI`}
      </span>
      <h1>{final ? "Masyaallah, hebat semuanya!" : "Satu langkah lebih pandai."}</h1>
      <p>
        {final
          ? "Setiap usaha layak dirayakan. Inilah hasil belajar kelas hari ini."
          : "Lihat perolehan poin sementara sebelum melangkah ke ronde berikutnya."}
      </p>
      <div className="podium">
        {podiumOrder.map((position) => {
          const entry = standings[position];
          if (!entry) return null;
          return (
            <div className={`podium-person place-${position + 1}`} key={entry.participantId}>
              <div className="podium-avatar">
                {position === 0 && <Crown size={32} weight="fill" />}
                {entry.displayName.slice(0, 1).toUpperCase()}
              </div>
              <h3>{entry.displayName}</h3>
              <p>
                {entry.score} <span>poin</span>
              </p>
              <div className="podium-block">
                <span>{entry.rank}</span>
                <small>PERINGKAT</small>
              </div>
            </div>
          );
        })}
      </div>
      {standings.length > 3 && (
        <div className="ranking-list">
          {standings.slice(3).map((entry) => (
            <div key={entry.participantId}>
              <span>{entry.rank}</span>
              <strong>{entry.displayName}</strong>
              <span>{entry.score} poin</span>
            </div>
          ))}
        </div>
      )}
      <div className="result-summary">
        <span>
          <UsersThree size={19} />
          {standings.length} santri
        </span>
        <span>
          <CheckCircle size={19} />
          {answerCount} jawaban tersimpan
        </span>
        <span>
          <Crown size={19} />
          {roundNumber} ronde selesai
        </span>
      </div>
      <div className="button-row centered">{children}</div>
    </section>
  );
}
