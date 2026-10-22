import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const id = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;

test("skema PostgreSQL menjaga relasi sesi, antrean dan satu hasil per giliran", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL("../database/schema.sql", import.meta.url), "utf8"));
    await db.query(
      "INSERT INTO teachers (id, auth_subject, display_name) VALUES ($1, 'guru-uji', 'Guru uji')",
      [id(1)],
    );
    await db.query(
      "INSERT INTO materials (id, teacher_id, title, source_type, extracted_text) VALUES ($1, $2, 'Materi uji', 'MARKDOWN', 'Teks uji')",
      [id(2), id(1)],
    );
    await db.query(
      "INSERT INTO quizzes (id, teacher_id, material_id, title) VALUES ($1, $2, $3, 'Kuis uji')",
      [id(3), id(1), id(2)],
    );
    const content = JSON.stringify({
      mode: "FINAL",
      difficulty: "HARD",
      prompt: "Soal uji",
      options: { A: "A", B: "B", C: "C", D: "D" },
      correctAnswer: "D",
      explanation: "Uji",
    });
    await db.query(
      "INSERT INTO questions (id, quiz_id, position, content) VALUES ($1, $2, 0, $3)",
      [id(4), id(3), content],
    );
    for (const sessionId of [5, 6]) {
      await db.query(
        "INSERT INTO quiz_sessions (id, teacher_id, quiz_id, quiz_revision, total_rounds) VALUES ($1, $2, $3, 1, 1)",
        [id(sessionId), id(1), id(3)],
      );
    }
    for (const [participantId, sessionId, position] of [
      [7, 5, 0],
      [8, 6, 0],
      [15, 5, 1],
    ] as const) {
      await db.query(
        "INSERT INTO participants (id, session_id, display_name, registration_order, queue_position) VALUES ($1, $2, 'Santri uji', $3, $3)",
        [id(participantId), id(sessionId), position],
      );
    }
    for (const [questionId, sessionId] of [
      [9, 5],
      [10, 6],
    ] as const) {
      await db.query(
        "INSERT INTO session_questions (id, session_id, source_question_id, content) VALUES ($1, $2, $3, $4)",
        [id(questionId), id(sessionId), id(4), content],
      );
    }
    for (const [roundId, sessionId] of [
      [11, 5],
      [12, 6],
    ] as const) {
      await db.query(
        "INSERT INTO session_rounds (id, session_id, number, mode) VALUES ($1, $2, 1, 'FINAL')",
        [id(roundId), id(sessionId)],
      );
    }
    await db.query(
      "INSERT INTO turns (id, session_id, round_id, participant_id, session_question_id) VALUES ($1, $2, $3, $4, $5)",
      [id(13), id(5), id(11), id(7), id(9)],
    );

    await t.test("foreign key menolak peserta, soal, atau ronde dari sesi lain", async () => {
      for (const [roundId, participantId, questionId] of [
        [11, 8, 9],
        [11, 15, 10],
        [12, 15, 9],
      ] as const) {
        await assert.rejects(
          db.query(
            "INSERT INTO turns (id, session_id, round_id, participant_id, session_question_id) VALUES ($1, $2, $3, $4, $5)",
            [id(20), id(5), id(roundId), id(participantId), id(questionId)],
          ),
          { code: "23503" },
        );
      }
    });

    await t.test("satu santri tidak mendapat dua giliran pada ronde sama", async () => {
      await assert.rejects(
        db.query(
          "INSERT INTO turns (id, session_id, round_id, participant_id, session_question_id) VALUES ($1, $2, $3, $4, $5)",
          [id(20), id(5), id(11), id(7), id(9)],
        ),
        { code: "23505" },
      );
    });

    await t.test("pertukaran posisi antrean valid dalam satu transaksi", async () => {
      await db.exec("BEGIN");
      await db.query("UPDATE participants SET queue_position = 1 WHERE id = $1", [id(7)]);
      await db.query("UPDATE participants SET queue_position = 0 WHERE id = $1", [id(15)]);
      await db.exec("COMMIT");
      const result = await db.query<{ id: string }>(
        "SELECT id FROM participants WHERE session_id = $1 ORDER BY queue_position",
        [id(5)],
      );
      assert.deepEqual(
        result.rows.map((row) => row.id),
        [id(15), id(7)],
      );
    });

    await t.test("database hanya mengizinkan satu giliran aktif per sesi", async () => {
      await db.query(
        "UPDATE turns SET status = 'ACTIVE', attempt_id = $1, started_at = now() WHERE id = $2",
        [id(30), id(13)],
      );
      await assert.rejects(
        db.query(
          "INSERT INTO turns (id, session_id, round_id, participant_id, session_question_id, status, attempt_id, started_at) VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, now())",
          [id(20), id(5), id(11), id(15), id(9), id(31)],
        ),
        { code: "23505" },
      );
    });

    await t.test("skor tidak boleh lebih dari satu atau satu pada jawaban kosong", async () => {
      for (const [selected, points] of [
        ["D", 2],
        [null, 1],
      ] as const) {
        await assert.rejects(
          db.query(
            "INSERT INTO answers (turn_id, selected_answer, points, ended_by, elapsed_ms) VALUES ($1, $2, $3, 'MAIN_TIMER', 10000)",
            [id(13), selected, points],
          ),
          { code: "23514" },
        );
      }
    });

    await t.test("jawaban final D mendapat satu poin dan insert ulang ditolak", async () => {
      await db.query(
        "INSERT INTO answers (turn_id, selected_answer, points, ended_by, elapsed_ms) VALUES ($1, 'D', 1, 'LOCK_TIMER', 5000)",
        [id(13)],
      );
      await assert.rejects(
        db.query(
          "INSERT INTO answers (turn_id, selected_answer, points, ended_by, elapsed_ms) VALUES ($1, 'D', 1, 'LOCK_TIMER', 5000)",
          [id(13)],
        ),
        { code: "23505" },
      );
      const result = await db.query<{ score: number }>(
        "SELECT SUM(points)::integer AS score FROM answers",
      );
      assert.equal(result.rows[0]?.score, 1);
    });

    await t.test("sesi tidak boleh memiliki dua ronde final", async () => {
      await assert.rejects(
        db.query(
          "INSERT INTO session_rounds (id, session_id, number, mode) VALUES ($1, $2, 2, 'FINAL')",
          [id(20), id(5)],
        ),
        { code: "23505" },
      );
    });

    await t.test("penghapusan bank soal tetap mempertahankan salinan sesi", async () => {
      await db.query("DELETE FROM questions WHERE id = $1", [id(4)]);
      const result = await db.query<{ source_question_id: string | null; content: unknown }>(
        "SELECT source_question_id, content FROM session_questions WHERE id = $1",
        [id(9)],
      );
      assert.equal(result.rows[0]?.source_question_id, null);
      assert.deepEqual(result.rows[0]?.content, JSON.parse(content));
    });
  } finally {
    await db.close();
  }
});
