import type { QuestionContent, Quiz, QuizSession, SessionSnapshot } from "./schema.js";
import type { Settings } from "./validation.js";

export interface QuizSummary extends Quiz {
  questionCount: number;
  regularCount: number;
  finalCount: number;
}
export interface QuizDetail extends QuizSummary {
  materialText: string;
  sourceType: "PDF" | "PPTX" | "MARKDOWN";
  originalFilename: string | null;
  questions: QuestionContent[];
}
export interface SessionSummary extends QuizSession {
  title: string;
  participantCount: number;
  answerCount: number;
}
export interface Bootstrap {
  quizzes: QuizSummary[];
  sessions: SessionSummary[];
  settings: Settings;
  aiConfigured: boolean;
}
export interface SessionResponse {
  snapshot: SessionSnapshot;
}
