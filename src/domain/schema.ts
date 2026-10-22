export type Id = string;
export type ISODateTime = string;
export type AnswerKey = "A" | "B" | "C" | "D";
export type RoundMode = "REGULAR" | "FINAL";

interface QuestionText {
  prompt: string;
  explanation: string;
}

// Dipetakan ke JSONB agar opsi dan kunci ikut tersalin sebagai satu versi soal.
export type QuestionContent = QuestionText &
  (
    | {
        mode: "REGULAR";
        difficulty: "EASY" | "MEDIUM";
        options: { A: string; B: string; C: string };
        correctAnswer: "A" | "B" | "C";
      }
    | {
        mode: "FINAL";
        difficulty: "HARD";
        options: { A: string; B: string; C: string; D: string };
        correctAnswer: AnswerKey;
      }
  );

export interface Teacher {
  id: Id;
  authSubject: string;
  displayName: string;
  createdAt: ISODateTime;
}

export interface Material {
  id: Id;
  teacherId: Id;
  title: string;
  sourceType: "PDF" | "PPTX" | "MARKDOWN";
  originalFilename: string | null;
  extractedText: string;
  createdAt: ISODateTime;
}

export interface Quiz {
  id: Id;
  teacherId: Id;
  materialId: Id;
  title: string;
  status: "DRAFT" | "REVIEW" | "READY" | "ARCHIVED";
  revision: number;
  reviewedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Question {
  id: Id;
  quizId: Id;
  position: number;
  content: QuestionContent;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface QuizSession {
  id: Id;
  teacherId: Id;
  quizId: Id;
  quizRevision: number;
  totalRounds: number;
  answerDurationMs: number;
  status: "SETUP" | "RUNNING" | "ROUND_RESULTS" | "COMPLETED";
  revision: number;
  createdAt: ISODateTime;
  startedAt: ISODateTime | null;
  completedAt: ISODateTime | null;
}

export interface Participant {
  id: Id;
  sessionId: Id;
  displayName: string;
  registrationOrder: number;
  queuePosition: number;
}

export interface SessionQuestion {
  id: Id;
  sessionId: Id;
  sourceQuestionId: Id | null;
  content: QuestionContent;
}

export interface SessionRound {
  id: Id;
  sessionId: Id;
  number: number;
  mode: RoundMode;
  status: "PENDING" | "RUNNING" | "COMPLETED";
}

export interface Turn {
  id: Id;
  sessionId: Id;
  roundId: Id;
  participantId: Id;
  sessionQuestionId: Id;
  status: "PENDING" | "ACTIVE" | "COMPLETED";
  attemptId: Id | null;
  startedAt: ISODateTime | null;
}

export interface Answer {
  // Satu jawaban per giliran; pengiriman ulang memakai primary key yang sama.
  turnId: Id;
  selectedAnswer: AnswerKey | null;
  points: 0 | 1;
  endedBy: "MAIN_TIMER" | "LOCK_TIMER";
  elapsedMs: number;
  answeredAt: ISODateTime;
}

export interface DatabaseTables {
  teachers: Teacher;
  materials: Material;
  quizzes: Quiz;
  questions: Question;
  quiz_sessions: QuizSession;
  participants: Participant;
  session_questions: SessionQuestion;
  session_rounds: SessionRound;
  turns: Turn;
  answers: Answer;
}

export interface SessionSnapshot {
  session: QuizSession;
  participants: Participant[];
  questions: SessionQuestion[];
  rounds: SessionRound[];
  turns: Turn[];
  answers: Answer[];
}

export const QUIZ_TIMING = { mainMs: 10_000, lockMs: 3_000 } as const;
