import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "./pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export { pdfjsLib };
