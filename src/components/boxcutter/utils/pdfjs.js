import * as pdfjsLib from "pdfjs-dist";

// Use a bundler-agnostic worker URL. Next/Webpack often fails on Vite's `?url`.
// Pin to the same major/minor as package.json to avoid mismatches.
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs";

export { pdfjsLib };
