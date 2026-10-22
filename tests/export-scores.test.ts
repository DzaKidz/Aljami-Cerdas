import { test } from "node:test";
import assert from "node:assert/strict";
import { scoresCsv } from "../src/lib/export-scores.js";

test("ekspor mempertahankan nama berkoma dan kutipan, serta mencegah formula spreadsheet", () => {
  const csv = scoresCsv(
    [
      { participantId: "a", displayName: 'Santri, "A"', rank: 1, score: 2 },
      { participantId: "b", displayName: "=1+1", rank: 2, score: 0 },
    ],
    2,
  );
  assert.ok(csv.startsWith("\uFEFFPeringkat,Nama,Skor,Total ronde\r\n"));
  assert.ok(csv.includes('1,"Santri, ""A""",2,2'));
  assert.ok(csv.includes('2,"\'=1+1",0,2'));
});
