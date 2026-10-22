import type { AnswerKey } from "./schema.js";

export interface GestureTimer {
  phase: "COUNTDOWN" | "LOCK" | "DONE";
  deadline: number;
  suspendedMs: number;
  observed: AnswerKey | null;
  stableSince: number;
  candidate: AnswerKey | null;
  answer: AnswerKey | null;
  endedBy: "MAIN_TIMER" | "LOCK_TIMER";
}
export const startTimer = (now: number, durationMs = 10000): GestureTimer => ({
  phase: "COUNTDOWN",
  deadline: now + durationMs,
  suspendedMs: 0,
  observed: null,
  stableSince: now,
  candidate: null,
  answer: null,
  endedBy: "MAIN_TIMER",
});
export function stepTimer(
  timer: GestureTimer,
  now: number,
  observed: AnswerKey | null,
): GestureTimer {
  if (timer.phase === "DONE") return timer;
  if (now >= timer.deadline)
    return {
      ...timer,
      phase: "DONE",
      answer: timer.phase === "LOCK" ? timer.candidate : timer.observed,
      endedBy: timer.phase === "LOCK" ? "LOCK_TIMER" : "MAIN_TIMER",
    };
  if (timer.phase === "LOCK") {
    if (observed !== timer.candidate)
      return {
        ...timer,
        phase: "COUNTDOWN",
        deadline: now + timer.suspendedMs,
        candidate: null,
        observed,
        stableSince: now,
      };
    return timer;
  }
  if (observed !== timer.observed) return { ...timer, observed, stableSince: now };
  if (observed && now - timer.stableSince >= 550)
    return {
      ...timer,
      phase: "LOCK",
      candidate: observed,
      suspendedMs: timer.deadline - now,
      deadline: now + Math.min(3000, timer.deadline - now),
    };
  return timer;
}

interface Point {
  x: number;
  y: number;
  z: number;
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const angle = (a: Point, b: Point, c: Point) => {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const denominator = Math.hypot(ab.x, ab.y, ab.z) * Math.hypot(cb.x, cb.y, cb.z);
  return (
    (Math.acos(
      Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y + ab.z * cb.z) / (denominator || 1))),
    ) *
      180) /
    Math.PI
  );
};
export function countFingers(points: Point[]): number {
  if (points.length !== 21) return 0;
  const wrist = points[0]!;
  let count = 0;
  for (const base of [5, 9, 13, 17]) {
    if (
      angle(points[base]!, points[base + 1]!, points[base + 3]!) > 155 &&
      distance(points[base + 3]!, wrist) > distance(points[base + 1]!, wrist) * 1.15
    )
      count++;
  }
  if (
    angle(points[1]!, points[2]!, points[4]!) > 150 &&
    distance(points[4]!, points[17]!) > distance(points[2]!, points[17]!) * 1.2
  )
    count++;
  return count;
}
