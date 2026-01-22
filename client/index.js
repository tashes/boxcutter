"use client";

// Client-only entry for Next.js App Router.
// Re-export symbols directly from source without importing global CSS.
export { default as BoxCutter } from "../src/components/boxcutter";
export { initPdfjsWorker } from "../src/components/boxcutter/utils/pdfjs";
