import type { QuizInput } from "./validation.js";

export const exampleQuiz: QuizInput = {
  title: "Adab sehari-hari",
  sourceType: "MARKDOWN",
  originalFilename: null,
  ready: false,
  materialText:
    "# Adab sehari-hari\n\nSebelum makan, kita membaca basmalah. Makan dan minum menggunakan tangan kanan. Setelah makan, kita mengucapkan hamdalah sebagai rasa syukur kepada Allah.\n\nKetika bertemu sesama muslim, kita mengucapkan salam. Kepada orang tua dan guru, kita berbicara dengan sopan dan mendengarkan nasihatnya. Kita menjaga kebersihan serta membantu teman yang membutuhkan pertolongan.",
  questions: [
    {
      mode: "REGULAR",
      difficulty: "EASY",
      prompt: "Apa yang kita baca sebelum makan?",
      options: { A: "Basmalah", B: "Hamdalah", C: "Salam" },
      correctAnswer: "A",
      explanation: "Kita membaca basmalah sebelum makan.",
    },
    {
      mode: "REGULAR",
      difficulty: "EASY",
      prompt: "Tangan mana yang digunakan untuk makan?",
      options: { A: "Tangan kiri", B: "Tangan kanan", C: "Bergantian sesuka hati" },
      correctAnswer: "B",
      explanation: "Adab makan adalah menggunakan tangan kanan.",
    },
    {
      mode: "REGULAR",
      difficulty: "MEDIUM",
      prompt: "Apa yang diucapkan setelah selesai makan?",
      options: { A: "Salam", B: "Basmalah", C: "Hamdalah" },
      correctAnswer: "C",
      explanation: "Hamdalah diucapkan sebagai rasa syukur kepada Allah.",
    },
    {
      mode: "REGULAR",
      difficulty: "EASY",
      prompt: "Bagaimana kita berbicara kepada orang tua?",
      options: { A: "Dengan suara keras", B: "Dengan sopan", C: "Sambil memotong pembicaraan" },
      correctAnswer: "B",
      explanation: "Kita berbicara dengan sopan dan mendengarkan nasihat orang tua.",
    },
    {
      mode: "FINAL",
      difficulty: "HARD",
      prompt: "Temanmu kesulitan membereskan buku setelah belajar. Sikap mana yang paling baik?",
      options: {
        A: "Meninggalkannya",
        B: "Menertawakannya",
        C: "Menyembunyikan bukunya",
        D: "Membantu membereskan buku",
      },
      correctAnswer: "D",
      explanation: "Menolong teman merupakan adab yang baik dalam kehidupan sehari-hari.",
    },
    {
      mode: "FINAL",
      difficulty: "HARD",
      prompt: "Urutan adab makan mana yang benar?",
      options: {
        A: "Basmalah, makan dengan tangan kanan, hamdalah",
        B: "Hamdalah, makan dengan tangan kiri, salam",
        C: "Salam, makan dengan tangan kiri, basmalah",
        D: "Makan dahulu, lalu membaca basmalah",
      },
      correctAnswer: "A",
      explanation:
        "Sebelum makan membaca basmalah, makan dengan tangan kanan, lalu mengucapkan hamdalah.",
    },
  ],
};
