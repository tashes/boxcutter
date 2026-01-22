// @ts-nocheck

import * as pdfjsLib from "pdfjs-dist";

// Note: We no longer create a Worker via a bundled asset here because
// some consumers (e.g., Next.js/webpack on the server) attempt to
// statically resolve `new URL(..., import.meta.url)` and fail.
//
// Consumers should set the worker explicitly in client code, e.g.:
//   - Provide a module worker URL in your public assets and call
//       pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
//     or create a Worker and pass the port:
//       pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
//         "/pdf.worker.min.mjs", { type: "module" }
//       );
//
// We still export `pdfjsLib` so BoxCutter can use pdfjs when initialized
// and allow applications to configure the worker as they prefer.

export { pdfjsLib };

// Optional helper for apps that want a convenience initializer without
// forcing bundlers to resolve a specific asset during build.
export function initPdfjsWorker({ url, port } = {}) {
    if (typeof window === "undefined") return;
    try {
        if (port) {
            pdfjsLib.GlobalWorkerOptions.workerPort = port;
            return port;
        }
        if (url) {
            const worker = new Worker(
                /* webpackIgnore: true */ /* @vite-ignore */ url,
                { type: "module" },
            );
            pdfjsLib.GlobalWorkerOptions.workerPort = worker;
            return worker;
        }
        if (typeof console !== "undefined") {
            console.warn("[BoxCutter] initPdfjsWorker called without url/port; no worker configured.");
        }
    } catch (e) {
        if (typeof console !== "undefined") {
            console.warn("[BoxCutter] Failed to initialize pdfjs worker; pdfjs may use a fallback.", e);
        }
    }
    return null;
}
