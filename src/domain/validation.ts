import { z } from "zod";

const text = z.string().trim().min(1, "Teks tidak boleh kosong.").max(3000);
const common = { prompt: text, explanation: z.string().max(5000) };
export const questionSchema = z.discriminatedUnion("mode", [
  z.object({
    ...common,
    mode: z.literal("REGULAR"),
    difficulty: z.enum(["EASY", "MEDIUM"]),
    options: z.object({ A: text, B: text, C: text }).strict(),
    correctAnswer: z.enum(["A", "B", "C"]),
  }),
  z.object({
    ...common,
    mode: z.literal("FINAL"),
    difficulty: z.literal("HARD"),
    options: z.object({ A: text, B: text, C: text, D: text }).strict(),
    correctAnswer: z.enum(["A", "B", "C", "D"]),
  }),
]);
export const quizInputSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(150),
  materialText: z.string().trim().min(10, "Materi minimal 10 karakter.").max(120000),
  sourceType: z.enum(["PDF", "PPTX", "MARKDOWN"]),
  originalFilename: z.string().max(250).nullable(),
  questions: z.array(questionSchema).min(1, "Tambahkan setidaknya satu soal.").max(100),
  ready: z.boolean(),
});
export const settingsSchema = z.object({
  teacherName: z.string().trim().min(1).max(80),
  className: z.string().trim().min(1).max(100),
  roster: z.array(z.string().trim().min(1).max(80)).max(40),
});
export type QuizInput = z.infer<typeof quizInputSchema>;
export type Settings = z.infer<typeof settingsSchema>;
