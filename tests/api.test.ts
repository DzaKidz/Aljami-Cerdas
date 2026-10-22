 import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { openDatabase } from "../server/repository.js";
import { createApi } from "../server/app.js";
import { exampleQuiz } from "../src/domain/example.js";
import type { SessionResponse } from "../src/domain/contracts.js";

test("layanan kuis: tinjauan, transaksi giliran, retry, final, dan hasil", async (t) => {
  const db = await openDatabase(); const server = createApi(db).listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Server uji gagal.");
  const base = `http://127.0.0.1:${address.port}`;
  const request = (path: string, body?: unknown, method = "POST") => fetch(base + path, { method: body === undefined ? "GET" : method, headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  try {
    const draft = await (await request("/quizzes", exampleQuiz)).json() as { id: string };
    await t.test("draf belum boleh dipakai sebagai sesi", async () => {
      const response = await request("/sessions", { quizId: draft.id, names: ["Santri uji"], totalRounds: 2 }); assert.equal(response.status, 400);
    });
    await t.test("opsi D pada ronde biasa ditolak validator", async () => {
      const broken = structuredClone(exampleQuiz); Object.assign(broken.questions[0]!.options, { D: "Tidak valid" });
      assert.equal((await request("/quizzes", broken)).status, 400);
    });
    await request(`/quizzes/${draft.id}`, { ...exampleQuiz, ready: true }, "PUT");
    let data = await (await request("/sessions", { quizId: draft.id, names: ["Santri uji 1", "Santri uji 2"], totalRounds: 2 })).json() as SessionResponse;
    const sessionId = data.snapshot.session.id;
    assert.equal(data.snapshot.turns.length, 4); assert.equal(data.snapshot.rounds[1]?.mode, "FINAL");
    await t.test("salinan soal tetap sama setelah bank soal diubah", async () => {
      const edited = structuredClone(exampleQuiz); edited.questions[0]!.prompt = "Pertanyaan yang baru diubah";
      await request(`/quizzes/${draft.id}`, { ...edited, ready: true }, "PUT");
      const saved = await (await request(`/sessions/${sessionId}`)).json() as SessionResponse;
      assert.equal(saved.snapshot.questions[0]?.content.prompt, exampleQuiz.questions[0]?.prompt);
    });
    let submitted = 0;
    for (let round = 0; round < 2; round++) {
      for (let person = 0; person < 2; person++) {
        data = await (await request(`/sessions/${sessionId}/activate`, { continueRound: round === 1 })).json() as SessionResponse;
        const turn = data.snapshot.turns.find((value) => value.status === "ACTIVE")!;
        const content = data.snapshot.questions.find((q) => q.id === turn.sessionQuestionId)!.content;
        const answer = { turnId: turn.id, attemptId: turn.attemptId, selectedAnswer: person === 0 ? content.correctAnswer : null, endedBy: person === 0 ? "LOCK_TIMER" : "MAIN_TIMER", elapsedMs: 10000, points: 999 };
        if (!submitted) await t.test("callback dengan token lama tidak diterima", async () => {
          const response = await request(`/sessions/${sessionId}/answers`, { ...answer, attemptId: "99999999-9999-4999-8999-999999999999" }); assert.equal(response.status, 400);
        });
        const response = await request(`/sessions/${sessionId}/answers`, answer); assert.equal(response.status, 200); data = await response.json() as SessionResponse; submitted++;
        const retry = await (await request(`/sessions/${sessionId}/answers`, answer)).json() as SessionResponse;
        assert.equal(retry.snapshot.answers.length, submitted);
        assert.equal(retry.snapshot.answers.find((a) => a.turnId === turn.id)?.points, person === 0 ? 1 : 0);
      }
      assert.equal(data.snapshot.session.status, "ROUND_RESULTS");
    }
    await t.test("hasil tersimpan benar, final tetap satu poin dan sesi selesai", async () => {
      const completed = await (await request(`/sessions/${sessionId}/complete`, {})).json() as SessionResponse;
      assert.equal(completed.snapshot.session.status, "COMPLETED");
      assert.equal(completed.snapshot.answers.reduce((sum, a) => sum + a.points, 0), 2);
      assert.equal((await request(`/sessions/${sessionId}/activate`, {})).status, 400);
    });
    await t.test("permintaan dari origin lain ditolak", async () => {
      const response = await fetch(base + "/settings", { method: "PUT", headers: { Origin: "https://example.invalid", "Content-Type": "application/json" }, body: "{}" }); assert.equal(response.status, 403);
    });
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); await db.close(); }
});
