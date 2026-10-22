import assert from "node:assert/strict";
import { test } from "node:test";
import type { SessionSnapshot } from "../src/domain/schema.js";
import { createQuizSessionStore, selectLeaderboard } from "../src/state/session-store.js";

function fixture(): SessionSnapshot {
  const timestamp = "2026-10-22T00:00:00.000Z";
  return {
    session: {
      id: "session-1", teacherId: "teacher-1", quizId: "quiz-1", quizRevision: 1,
      totalRounds: 2, status: "RUNNING", revision: 1, createdAt: timestamp,
      startedAt: timestamp, completedAt: null,
    },
    participants: [
      { id: "p1", sessionId: "session-1", displayName: "Santri uji 1", registrationOrder: 0, queuePosition: 0 },
      { id: "p2", sessionId: "session-1", displayName: "Santri uji 2", registrationOrder: 1, queuePosition: 1 },
      { id: "p3", sessionId: "session-1", displayName: "Santri uji 3", registrationOrder: 2, queuePosition: 2 },
    ],
    questions: [
      { id: "q1", sessionId: "session-1", sourceQuestionId: null,
        content: { mode: "REGULAR", difficulty: "EASY", prompt: "Soal uji", explanation: "Pembahasan uji",
          options: { A: "Opsi A", B: "Opsi B", C: "Opsi C" }, correctAnswer: "A" } },
      { id: "q2", sessionId: "session-1", sourceQuestionId: null,
        content: { mode: "FINAL", difficulty: "HARD", prompt: "Soal final uji", explanation: "Pembahasan uji",
          options: { A: "Opsi A", B: "Opsi B", C: "Opsi C", D: "Opsi D" }, correctAnswer: "D" } },
    ],
    rounds: [
      { id: "r1", sessionId: "session-1", number: 1, mode: "REGULAR", status: "COMPLETED" },
      { id: "r2", sessionId: "session-1", number: 2, mode: "FINAL", status: "RUNNING" },
    ],
    turns: [
      { id: "t1", sessionId: "session-1", roundId: "r1", participantId: "p1", sessionQuestionId: "q1",
        status: "COMPLETED", attemptId: "attempt-1", startedAt: timestamp },
      { id: "t2", sessionId: "session-1", roundId: "r1", participantId: "p2", sessionQuestionId: "q1",
        status: "COMPLETED", attemptId: "attempt-2", startedAt: timestamp },
      { id: "t3", sessionId: "session-1", roundId: "r2", participantId: "p1", sessionQuestionId: "q2",
        status: "ACTIVE", attemptId: "attempt-3", startedAt: timestamp },
      { id: "t4", sessionId: "session-1", roundId: "r1", participantId: "p3", sessionQuestionId: "q1",
        status: "COMPLETED", attemptId: "attempt-4", startedAt: timestamp },
      { id: "t5", sessionId: "session-1", roundId: "r2", participantId: "p2", sessionQuestionId: "q2",
        status: "PENDING", attemptId: null, startedAt: null },
      { id: "t6", sessionId: "session-1", roundId: "r2", participantId: "p3", sessionQuestionId: "q2",
        status: "PENDING", attemptId: null, startedAt: null },
    ],
    answers: [
      { turnId: "t1", selectedAnswer: "A", points: 1, endedBy: "LOCK_TIMER", elapsedMs: 5000, answeredAt: timestamp },
      { turnId: "t2", selectedAnswer: "A", points: 1, endedBy: "LOCK_TIMER", elapsedMs: 6000, answeredAt: timestamp },
      { turnId: "t4", selectedAnswer: null, points: 0, endedBy: "MAIN_TIMER", elapsedMs: 10000, answeredAt: timestamp },
    ],
  };
}

test("store kosong tidak berbagi data dengan store lain", () => {
  const first = createQuizSessionStore();
  const second = createQuizSessionStore();
  first.getState().loadSnapshot(fixture());
  assert.equal(second.getState().session, null);
  assert.deepEqual(selectLeaderboard(second.getState()), []);
});

test("snapshot ulang tidak menggandakan poin; peserta nol dan seri tetap muncul", () => {
  const store = createQuizSessionStore();
  store.getState().loadSnapshot(fixture());
  store.getState().loadSnapshot(fixture());
  assert.deepEqual(selectLeaderboard(store.getState()).map(({ score, rank }) => ({ score, rank })),
    [{ score: 1, rank: 1 }, { score: 1, rank: 1 }, { score: 0, rank: 3 }]);
});

test("skor ronde terpisah dari skor kumulatif, final tetap satu poin", () => {
  const data = fixture();
  data.answers.push({ turnId: "t3", selectedAnswer: "D", points: 1,
    endedBy: "LOCK_TIMER", elapsedMs: 4000, answeredAt: "2026-10-22T00:01:00.000Z" });
  data.turns.find((turn) => turn.id === "t3")!.status = "COMPLETED";
  const store = createQuizSessionStore();
  store.getState().loadSnapshot(data);
  assert.equal(selectLeaderboard(store.getState())[0]?.score, 2);
  assert.deepEqual(selectLeaderboard(store.getState(), "r2").map((row) => row.score), [1, 0, 0]);
});

test("jawaban kosong dan salah tetap bernilai nol", () => {
  const data = fixture();
  data.answers = [
    { turnId: "t1", selectedAnswer: null, points: 0, endedBy: "MAIN_TIMER", elapsedMs: 10000,
      answeredAt: "2026-10-22T00:00:10.000Z" },
    { turnId: "t2", selectedAnswer: "B", points: 0, endedBy: "LOCK_TIMER", elapsedMs: 5000,
      answeredAt: "2026-10-22T00:00:05.000Z" },
  ];
  const store = createQuizSessionStore();
  store.getState().loadSnapshot(data);
  assert.deepEqual(selectLeaderboard(store.getState()).map((row) => row.score), [0, 0, 0]);
});

test("reorder tidak menghapus santri, tidak mengubah skor dan tidak memutasi snapshot", () => {
  const store = createQuizSessionStore();
  const data = fixture();
  data.session.status = "SETUP";
  data.session.startedAt = null;
  data.questions = [];
  data.rounds = [];
  data.turns = [];
  data.answers = [];
  store.getState().loadSnapshot(data);
  const reordered = ["p3", "p1", "p2"];
  store.getState().reorderQueue(reordered);
  reordered.reverse();
  assert.deepEqual(store.getState().queue, ["p3", "p1", "p2"]);
  assert.equal(store.getState().queueDirty, true);
  assert.equal(store.getState().participantsById.p1?.queuePosition, 0);
  assert.equal(selectLeaderboard(store.getState())[0]?.participantId, "p1");
  assert.throws(() => store.getState().reorderQueue(["p1", "p1", "p2"]));
  assert.throws(() => store.getState().reorderQueue(["p1", "p2"]));
  assert.throws(() => store.getState().reorderQueue(["p1", "p2", "asing"]));
  data.participants[0]!.displayName = "Diubah di luar store";
  assert.equal(store.getState().participantsById.p1?.displayName, "Santri uji 1");
});

test("memuat sesi aktif memerlukan pemulihan dan melarang reorder", () => {
  const data = fixture();
  data.session.status = "RUNNING";
  const store = createQuizSessionStore();
  store.getState().loadSnapshot(data);
  assert.deepEqual(store.getState().playback, { phase: "PAUSED", reason: "RELOAD" });
  assert.deepEqual(store.getState().camera, { status: "OFF" });
  assert.throws(() => store.getState().reorderQueue(["p2", "p1", "p3"]));
});

test("respons revisi lama tidak menimpa sesi terbaru", () => {
  const store = createQuizSessionStore();
  const newer = fixture();
  newer.session.revision = 2;
  store.getState().loadSnapshot(newer);
  const older = fixture();
  older.answers = [];
  store.getState().loadSnapshot(older);
  assert.equal(store.getState().session?.revision, 2);
  assert.equal(selectLeaderboard(store.getState())[0]?.score, 1);
});

test("snapshot dengan relasi silang ditolak tanpa mengubah state", () => {
  const store = createQuizSessionStore();
  const wrongSession = fixture();
  wrongSession.participants[0]!.sessionId = "session-lain";
  assert.throws(() => store.getState().loadSnapshot(wrongSession));
  const missingTurn = fixture();
  missingTurn.answers[0]!.turnId = "hilang";
  assert.throws(() => store.getState().loadSnapshot(missingTurn));
  const missingParticipant = fixture();
  missingParticipant.turns[0]!.participantId = "hilang";
  assert.throws(() => store.getState().loadSnapshot(missingParticipant));
  assert.equal(store.getState().session, null);
});

test("callback sesi atau percobaan lama diabaikan", () => {
  const store = createQuizSessionStore();
  store.getState().loadSnapshot(fixture());
  store.getState().publishPlayback("sesi-lama", { phase: "FINISHED" });
  store.getState().publishPlayback("session-1", {
    phase: "ANSWERING", turnId: "t3", attemptId: "attempt-lama",
    timer: { phase: "COUNTDOWN", deadlineMs: 10000, lastDetectedAnswer: null },
  });
  store.getState().publishPlayback("session-1", {
    phase: "ANSWERING", turnId: "t1", attemptId: "attempt-1",
    timer: { phase: "COUNTDOWN", deadlineMs: 10000, lastDetectedAnswer: null },
  });
  store.getState().publishPlayback("session-1", {
    phase: "SAVING", submission: {
      sessionId: "session-1", turnId: "t1", attemptId: "attempt-1",
      selectedAnswer: "A", endedBy: "LOCK_TIMER", elapsedMs: 5000,
    },
  });
  assert.deepEqual(store.getState().playback, { phase: "PAUSED", reason: "RELOAD" });
  store.getState().publishPlayback("session-1", {
    phase: "ANSWERING", turnId: "t3", attemptId: "attempt-3",
    timer: { phase: "LOCK", deadlineMs: 6000, candidate: "D", suspendedMainRemainingMs: 7000 },
  });
  assert.equal(store.getState().playback.phase, "ANSWERING");
  assert.throws(() => store.getState().publishPlayback("session-1", { phase: "CALLING", turnId: "hilang" }));
});

test("reset menghapus skor, kamera, dan timer tetapi mempertahankan action", () => {
  const store = createQuizSessionStore();
  store.getState().loadSnapshot(fixture());
  store.getState().setCamera({ status: "READY" });
  store.getState().reset();
  assert.equal(store.getState().session, null);
  assert.deepEqual(store.getState().answersByTurnId, {});
  assert.deepEqual(store.getState().camera, { status: "OFF" });
  assert.deepEqual(store.getState().playback, { phase: "SETUP" });
  assert.equal(typeof store.getState().loadSnapshot, "function");
});

test("sinkronisasi hasil menjaga kamera dan menolak respons sesi lain", () => {
  const store = createQuizSessionStore();
  store.getState().loadSnapshot(fixture());
  store.getState().setCamera({ status: "READY" });
  store.getState().publishPlayback("session-1", { phase: "CALLING", turnId: "t3" });
  const fresh = fixture();
  fresh.session.revision = 2;
  store.getState().loadSnapshot(fresh, "SYNC");
  assert.deepEqual(store.getState().camera, { status: "READY" });
  assert.deepEqual(store.getState().playback, { phase: "CALLING", turnId: "t3" });
  const foreign = fixture();
  foreign.session.id = "session-lain";
  store.getState().loadSnapshot(foreign, "SYNC");
  assert.equal(store.getState().session?.id, "session-1");
});
