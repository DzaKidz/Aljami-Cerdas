import type { LeaderboardEntry } from "../state/session-store.js";

export function scoresCsv(rows: LeaderboardEntry[], totalRounds: number): string {
  const quote = (value: string) =>
    `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
  return (
    "\uFEFFPeringkat,Nama,Skor,Total ronde\r\n" +
    rows
      .map((row) => [row.rank, quote(row.displayName), row.score, totalRounds].join(","))
      .join("\r\n")
  );
}

export function downloadScores(rows: LeaderboardEntry[], totalRounds: number, sessionId: string) {
  const url = URL.createObjectURL(
    new Blob([scoresCsv(rows, totalRounds)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `hasil-kuis-${sessionId.slice(0, 8)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
