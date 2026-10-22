export async function extractMaterial(file: File): Promise<{ text: string; sourceType: "PDF" | "PPTX" | "MARKDOWN" }> {
  if (file.size > 20 * 1024 * 1024) throw new Error("Ukuran file maksimal 20 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "md" || extension === "txt") return { text: await file.text(), sourceType: "MARKDOWN" };
  if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
    const document = await loadingTask.promise;
    const pages: string[] = [];
    try {
      if (document.numPages > 150) throw new Error("Gunakan PDF maksimal 150 halaman.");
      for (let index = 1; index <= document.numPages; index++) {
        const page = await document.getPage(index);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
      }
    } finally { await loadingTask.destroy(); }
    const text = pages.join("\n\n").trim();
    if (!text) throw new Error("PDF ini tidak memiliki teks yang dapat dibaca. Salin teks hasil OCR ke tab Tulis materi.");
    return { text, sourceType: "PDF" };
  }
  if (extension === "pptx") {
    const { default: JSZip } = await import("jszip");
    const archive = await JSZip.loadAsync(await file.arrayBuffer());
    const slides = Object.keys(archive.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => Number(a.match(/slide(\d+)\./)?.[1]) - Number(b.match(/slide(\d+)\./)?.[1]));
    if (slides.length > 150) throw new Error("Gunakan presentasi maksimal 150 slide.");
    const result: string[] = [];
    for (const name of slides) {
      const xml = await archive.file(name)!.async("string");
      if (xml.length > 4_000_000) throw new Error("Isi slide terlalu besar untuk diproses.");
      const doc = new DOMParser().parseFromString(xml, "application/xml");
      result.push(Array.from(doc.getElementsByTagNameNS("*", "t")).map((node) => node.textContent).join(" "));
    }
    const text = result.join("\n\n").trim();
    if (!text) throw new Error("Tidak ditemukan teks di dalam slide.");
    return { text, sourceType: "PPTX" };
  }
  throw new Error("Pilih file PDF, PPTX, Markdown, atau TXT.");
}
