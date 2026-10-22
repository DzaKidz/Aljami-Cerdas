import { test } from "node:test";
import assert from "node:assert/strict";
import { startTimer, stepTimer } from "../src/domain/timer.js";

test("pilihan dua menit mengikuti durasi sesi dan lock tetap tiga detik", () => {
  let timer = startTimer(1000, 120000);
  assert.equal(timer.deadline, 121000);
  timer = stepTimer(timer, 2000, "B");
  timer = stepTimer(timer, 2550, "B");
  assert.equal(timer.deadline, 5550);
  const canceled = stepTimer(timer, 3000, null);
  assert.equal(canceled.deadline - 3000, 118450);
});

test("tanpa gestur, waktu utama berakhir tepat pada 10 detik", () => {
  const timer = startTimer(100);
  assert.equal(stepTimer(timer, 10099, null).phase, "COUNTDOWN");
  assert.deepEqual(
    { phase: stepTimer(timer, 10100, null).phase, answer: stepTimer(timer, 10100, null).answer },
    { phase: "DONE", answer: null },
  );
});
test("gestur harus stabil dan lock memotong waktu menjadi tiga detik", () => {
  let timer = stepTimer(startTimer(0), 1000, "B");
  assert.equal(stepTimer(timer, 1549, "B").phase, "COUNTDOWN");
  timer = stepTimer(timer, 1550, "B");
  assert.equal(timer.phase, "LOCK");
  assert.equal(timer.deadline, 4550);
  assert.equal(timer.suspendedMs, 8450);
  const result = stepTimer(timer, 4550, "B");
  assert.equal(result.answer, "B");
  assert.equal(result.endedBy, "LOCK_TIMER");
});
test("menurunkan tangan membatalkan lock dan memulihkan sisa utama", () => {
  let timer = stepTimer(startTimer(0), 2450, "A");
  timer = stepTimer(timer, 3000, "A");
  assert.equal(timer.suspendedMs, 7000);
  timer = stepTimer(timer, 4000, null);
  assert.equal(timer.phase, "COUNTDOWN");
  assert.equal(timer.deadline, 11000);
  assert.equal(timer.candidate, null);
});
test("pergantian kandidat harus stabil kembali dan tidak mewarisi lock", () => {
  let timer = stepTimer(startTimer(0), 1000, "A");
  timer = stepTimer(timer, 1550, "A");
  timer = stepTimer(timer, 2000, "C");
  assert.equal(timer.phase, "COUNTDOWN");
  timer = stepTimer(timer, 2550, "C");
  assert.equal(timer.candidate, "C");
  assert.equal(timer.deadline, 5550);
});
test("lock tidak memperpanjang sisa waktu yang kurang dari tiga detik", () => {
  let timer = stepTimer(startTimer(0), 8000, "D");
  timer = stepTimer(timer, 8550, "D");
  assert.equal(timer.deadline, 10000);
  assert.equal(timer.suspendedMs, 1450);
});
test("deadline didahulukan dari event tangan turun tepat saat batas waktu", () => {
  let timer = stepTimer(startTimer(0), 0, "A");
  timer = stepTimer(timer, 550, "A");
  const result = stepTimer(timer, 3550, null);
  assert.equal(result.phase, "DONE");
  assert.equal(result.answer, "A");
  assert.equal(stepTimer(result, 5000, "D"), result);
});
