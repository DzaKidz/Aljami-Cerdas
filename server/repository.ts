import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { QuizInput } from "../src/domain/validation.js";
import type { SessionSnapshot } from "../src/domain/schema.js";

export const teacherId = "11111111-1111-4111-8111-111111111111";
export const defaultSettings = {
  teacherName: "Guru",
  className: "Kelas TPQ",
  roster: [] as string[],
};
export function camel<T>(row: unknown): T {
  if (!row || typeof row !== "object" || Array.isArray(row))
    throw new Error("Format data database tidak sesuai.");
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      v instanceof Date ? v.toISOString() : v,
    ]),
  ) as T;
}
export async function openDatabase(directory?: string) {
  const db = new PGlite(directory);
  const found = await db.query("SELECT to_regclass('public.teachers') AS present");
  if (!found.rows[0] || !(found.rows[0] as { present: unknown }).present) {
    await db.exec(await readFile(new URL("../database/schema.sql", import.meta.url), "utf8"));
  }
  await db.exec(
    "CREATE TABLE IF NOT EXISTS app_settings (key text PRIMARY KEY, value jsonb NOT NULL)",
  );
  await db.exec(
    "ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS answer_duration_ms integer NOT NULL DEFAULT 10000 CHECK (answer_duration_ms IN (10000, 60000, 120000, 180000, 300000))",
  );
  await db.query(
    "INSERT INTO teachers (id, auth_subject, display_name) VALUES ($1, 'local-teacher', 'Guru') ON CONFLICT (id) DO NOTHING",
    [teacherId],
  );
  await db.query(
    "INSERT INTO app_settings (key, value) VALUES ('settings', $1) ON CONFLICT DO NOTHING",
    [JSON.stringify(defaultSettings)],
  );
  return db;
}

export async function saveQuiz(db: PGlite, input: QuizInput, existingId?: string) {
  const id = existingId ?? randomUUID();
  await db.transaction(async (tx) => {
    const old = existingId
      ? await tx.query<{ material_id: string }>(
          "SELECT material_id FROM quizzes WHERE id=$1 AND teacher_id=$2",
          [id, teacherId],
        )
      : null;
    if (existingId && !old?.rows[0]) throw new Error("Kuis tidak ditemukan.");
    const materialId = old?.rows[0]?.material_id ?? randomUUID();
    await tx.query(
      `INSERT INTO materials (id, teacher_id, title, source_type, original_filename, extracted_text)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET title=$3, source_type=$4, original_filename=$5, extracted_text=$6`,
      [
        materialId,
        teacherId,
        input.title,
        input.sourceType,
        input.originalFilename,
        input.materialText,
      ],
    );
    await tx.query(
      `INSERT INTO quizzes (id, teacher_id, material_id, title, status, reviewed_at)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET title=$4, status=$5, reviewed_at=$6, revision=quizzes.revision+1, updated_at=now()`,
      [
        id,
        teacherId,
        materialId,
        input.title,
        input.ready ? "READY" : "REVIEW",
        input.ready ? new Date() : null,
      ],
    );
    await tx.query("DELETE FROM questions WHERE quiz_id=$1", [id]);
    for (const [position, content] of input.questions.entries()) {
      await tx.query(
        "INSERT INTO questions (id, quiz_id, position, content) VALUES ($1,$2,$3,$4)",
        [randomUUID(), id, position, JSON.stringify(content)],
      );
    }
  });
  return id;
}

export async function snapshot(db: PGlite, sessionId: string): Promise<SessionSnapshot> {
  const session = await db.query("SELECT * FROM quiz_sessions WHERE id=$1 AND teacher_id=$2", [
    sessionId,
    teacherId,
  ]);
  if (!session.rows[0]) throw new Error("Sesi tidak ditemukan.");
  const participants = await db.query(
    "SELECT * FROM participants WHERE session_id=$1 ORDER BY queue_position",
    [sessionId],
  );
  const questions = await db.query("SELECT * FROM session_questions WHERE session_id=$1", [
    sessionId,
  ]);
  const rounds = await db.query(
    "SELECT * FROM session_rounds WHERE session_id=$1 ORDER BY number",
    [sessionId],
  );
  const turns = await db.query(
    `SELECT t.* FROM turns t JOIN session_rounds r ON t.round_id=r.id JOIN participants p ON t.participant_id=p.id
    WHERE t.session_id=$1 ORDER BY r.number,p.queue_position`,
    [sessionId],
  );
  const answers = await db.query(
    "SELECT a.* FROM answers a JOIN turns t ON a.turn_id=t.id WHERE t.session_id=$1",
    [sessionId],
  );
  return {
    session: camel(session.rows[0]),
    participants: participants.rows.map((row) =>
      camel<SessionSnapshot["participants"][number]>(row),
    ),
    questions: questions.rows.map((row) => camel<SessionSnapshot["questions"][number]>(row)),
    rounds: rounds.rows.map((row) => camel<SessionSnapshot["rounds"][number]>(row)),
    turns: turns.rows.map((row) => camel<SessionSnapshot["turns"][number]>(row)),
    answers: answers.rows.map((row) => camel<SessionSnapshot["answers"][number]>(row)),
  };
}
