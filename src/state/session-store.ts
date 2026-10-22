import { createStore } from "zustand/vanilla";
import type { Id, SessionSnapshot } from "../domain/schema.js";
import { emptySessionState } from "./session-state.js";
import type { CameraState, PlaybackState, SessionState } from "./session-state.js";

export interface SessionActions {
  loadSnapshot(snapshot: SessionSnapshot, mode?: "RESTORE" | "SYNC"): void;
  reorderQueue(participantIds: Id[]): void;
  setCamera(camera: CameraState): void;
  publishPlayback(sessionId: Id, playback: PlaybackState): void;
  reset(): void;
}

export type SessionStore = SessionState & SessionActions;

function indexById<T extends { id: Id }>(rows: T[]): Record<Id, T> {
  return Object.fromEntries(rows.map((row) => [row.id, row]));
}

export function createQuizSessionStore() {
  return createStore<SessionStore>()((set, get) => ({
    ...emptySessionState(),

    // Snapshot berasal dari API yang telah memvalidasi kontrak domain.
    loadSnapshot(snapshot, mode = "RESTORE") {
      const state = get();
      const current = state.session;
      if (mode === "SYNC" && (current?.id !== snapshot.session.id || current.revision >= snapshot.session.revision)) {
        return;
      }
      if (current?.id === snapshot.session.id && current.revision > snapshot.session.revision) {
        return;
      }
      const data = structuredClone(snapshot);
      const participantsById = indexById(data.participants);
      const questionsById = indexById(data.questions);
      const roundsById = indexById(data.rounds);
      const turnsById = indexById(data.turns);
      for (const row of [...data.participants, ...data.questions, ...data.rounds, ...data.turns]) {
        if (row.sessionId !== data.session.id) throw new Error("Data berasal dari sesi lain.");
      }
      for (const turn of data.turns) {
        if (!participantsById[turn.participantId] || !questionsById[turn.sessionQuestionId] || !roundsById[turn.roundId]) {
          throw new Error("Relasi giliran tidak lengkap.");
        }
      }
      for (const answer of data.answers) {
        if (!turnsById[answer.turnId]) throw new Error("Jawaban tidak memiliki giliran.");
      }
      const playback: PlaybackState = data.session.status === "SETUP"
        ? { phase: "SETUP" }
        : data.session.status === "COMPLETED"
          ? { phase: "FINISHED" }
          : { phase: "PAUSED", reason: "RELOAD" };
      set({
        ...emptySessionState(),
        session: data.session,
        participantsById,
        questionsById,
        roundsById,
        turnsById,
        answersByTurnId: Object.fromEntries(data.answers.map((answer) => [answer.turnId, answer])),
        queue: data.participants.sort((a, b) => a.queuePosition - b.queuePosition).map((p) => p.id),
        playback: mode === "SYNC" ? state.playback : playback,
        camera: mode === "SYNC" ? state.camera : { status: "OFF" },
      });
    },

    reorderQueue(participantIds) {
      const state = get();
      if (state.session?.status !== "SETUP") throw new Error("Antrean hanya dapat diubah saat persiapan.");
      if (participantIds.length !== state.queue.length || new Set(participantIds).size !== state.queue.length ||
          participantIds.some((id) => !Object.hasOwn(state.participantsById, id))) {
        throw new Error("Antrean harus memuat setiap santri tepat satu kali.");
      }
      set({ queue: [...participantIds], queueDirty: true });
    },

    setCamera(camera) {
      set({ camera: structuredClone(camera) });
    },

    // Controller fase berikutnya menerbitkan state; store tidak menjalankan timer/sensor.
    publishPlayback(sessionId, playback) {
      const state = get();
      if (state.session?.id !== sessionId) return;
      if ("turnId" in playback && !Object.hasOwn(state.turnsById, playback.turnId)) {
        throw new Error("Giliran tidak ditemukan dalam sesi.");
      }
      if (playback.phase === "CALLING" && state.turnsById[playback.turnId]?.status === "COMPLETED") return;
      if (playback.phase === "ANSWERING") {
        const turn = state.turnsById[playback.turnId];
        if (turn?.status !== "ACTIVE" || turn.attemptId !== playback.attemptId) return;
      }
      if (playback.phase === "SAVING") {
        const request = playback.submission;
        const turn = state.turnsById[request.turnId];
        if (request.sessionId !== sessionId || turn?.status !== "ACTIVE" ||
            turn.attemptId !== request.attemptId) return;
      }
      if (playback.phase === "ROUND_RESULTS" && !Object.hasOwn(state.roundsById, playback.roundId)) {
        throw new Error("Ronde tidak ditemukan dalam sesi.");
      }
      set({ playback: structuredClone(playback) });
    },

    reset() {
      set(emptySessionState());
    },
  }));
}

// Buat melalui factory per request bila nanti memakai server-side rendering.
export const quizSessionStore = createQuizSessionStore();

export interface LeaderboardEntry {
  participantId: Id;
  displayName: string;
  score: number;
  rank: number;
}

export function selectLeaderboard(state: SessionState, roundId?: Id): LeaderboardEntry[] {
  const scores = new Map(state.queue.map((id) => [id, 0]));
  for (const answer of Object.values(state.answersByTurnId)) {
    const turn = state.turnsById[answer.turnId];
    if (!turn || (roundId !== undefined && turn.roundId !== roundId)) continue;
    scores.set(turn.participantId, (scores.get(turn.participantId) ?? 0) + answer.points);
  }
  const entries = Object.values(state.participantsById)
    .map((p) => ({ participantId: p.id, displayName: p.displayName, score: scores.get(p.id) ?? 0,
      registrationOrder: p.registrationOrder }))
    .sort((a, b) => b.score - a.score || a.registrationOrder - b.registrationOrder ||
      a.participantId.localeCompare(b.participantId));
  let rank = 0;
  return entries.map((entry, index) => {
    if (index === 0 || entry.score !== entries[index - 1]?.score) rank = index + 1;
    return { participantId: entry.participantId, displayName: entry.displayName, score: entry.score, rank };
  });
}
