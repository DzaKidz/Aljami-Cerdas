import { cp, mkdir, access, writeFile } from 'node:fs/promises';
await mkdir('public/mediapipe', { recursive: true });
await mkdir('public/models', { recursive: true });
await cp('node_modules/@mediapipe/tasks-vision/wasm', 'public/mediapipe', { recursive: true });
const target = 'public/models/hand_landmarker.task';
try { await access(target); }
catch {
  const response = await fetch('https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task');
  if (!response.ok) throw new Error('Model tangan gagal diunduh. Jalankan npm run assets kembali.');
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
}
console.log('Aset kamera siap.');
