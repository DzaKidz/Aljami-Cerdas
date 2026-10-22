import type {
  Answer, AnswerKey, Id, Participant, QuizSession,
  SessionQuestion, SessionRound, Turn,
} from "../domain/schema.js";

// Deadline menggunakan performance.now(), hanya berlaku dalam tab yang hidup.
export type ActiveTimer =
  | {
      phase: "COUNTDOWN";
      deadlineMs: number;
      lastDetectedAnswer: AnswerKey | null;
    }
  | {
      phase: "LOCK";
      deadlineMs: number;
      suspendedMainRemainingMs: number;
      candidate: AnswerKey;
    };

export interface AnswerSubmission {
  sessionId: Id;
  turnId: Id;
  attemptId: Id;
  selectedAnswer: AnswerKey | null;
  endedBy: "MAIN_TIMER" | "LOCK_TIMER";
  elapsedMs: number;
}

export type PlaybackState =
  | { phase: "SETUP" }
  | { phase: "CALLING"; turnId: Id }
  | { phase: "ANSWERING"; turnId: Id; attemptId: Id; timer: ActiveTimer }
  | { phase: "SAVING"; submission: AnswerSubmission }
  | { phase: "PAUSED"; reason: "RELOAD" | "TEACHER" | "CAMERA" | "NETWORK" }
  | { phase: "ROUND_RESULTS"; roundId: Id }
  | { phase: "FINISHED" };

export type CameraState =
  | { status: "OFF" | "REQUESTING" | "CALIBRATING" | "READY" }
  | { status: "ERROR"; message: string };

export interface SessionState {
  session: QuizSession | null;
  participantsById: Record<Id, Participant>;
  questionsById: Record<Id, SessionQuestion>;
  roundsById: Record<Id, SessionRound>;
  turnsById: Record<Id, Turn>;
  answersByTurnId: Record<Id, Answer>;
  queue: Id[];
  queueDirty: boolean;
  playback: PlaybackState;
  camera: CameraState;
}

export function emptySessionState(): SessionState {
  return {
    session: null,
    participantsById: {},
    questionsById: {},
    roundsById: {},
    turnsById: {},
    answersByTurnId: {},
    queue: [],
    queueDirty: false,
    playback: { phase: "SETUP" },
    camera: { status: "OFF" },
  };
}
