// index.d.ts

import * as React from "react";

/** What you pass in as the PDF source. */
export type PDFSource = ArrayBuffer | Uint8Array | Blob | null;

/** A rectangular region on the PDF page (PDF-space, not CSS pixels). */
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** A snippet extracted from a page selection. */
export interface Snippet {
    id: string;
    /** 1-based page number. */
    pageNumber: number;
    /** Selection rectangle in PDF-space units (scaled by your render scale). */
    x: number;
    y: number;
    width: number;
    height: number;
    /** Data URL of the PNG image (e.g. "data:image/png;base64,..."). */
    image: string;
}

/** A simple, flat TOC entry (matches what `handleExtractOutline` produces). */
export interface TOCItem {
    id: string;
    type: "bookmark";
    /** 1-based page number the entry points to. */
    pageNumber: number;
    title: string;
}

/** Props for the BoxCutter component. */
export interface BoxCutterProps {
    /** The PDF bytes (or null while loading). */
    pdf: PDFSource;

    /**
     * Current page (1-based). If provided, the component becomes controlled
     * for page state and will render this page. If omitted, it defaults to 1
     * and manages page internally.
     */
    page?: number;

    /** Current snippets array and change handler. */
    snippets: Snippet[];
    onSnippetsChange: (snippets: Snippet[]) => void;

    /** Current table of contents and change handler. */
    toc: TOCItem[];
    onTOCChange: (toc: TOCItem[]) => void;

    /**
     * Called whenever the current page changes (via next/prev/jump or prop).
     * Use with `page` to fully control the page from a parent.
     */
    onPageChange?: (pageNumber: number) => void;

    /** Show/hide the side "Snippets" drawer. Defaults to true. */
    showSnippetsCollection?: boolean;

    /**
     * Called once when the first page is rendered and the component
     * is ready for interaction. Fires again if a new `pdf` is provided
     * and the first page of that document finishes rendering.
     */
    onReady?: (info: {
        /** Total number of pages in the document. */
        totalPages: number;
        /** Current 1-based page number being displayed. */
        currentPage: number;
        /** Render scale factor applied to the page. */
        scale: number;
        /** Canvas pixel dimensions for the rendered page. */
        pageSize: { width: number; height: number };
        /** Underlying canvases used for content and overlay. */
        canvas: HTMLCanvasElement | null;
        overlay: HTMLCanvasElement | null;
        /** Helper to jump to a specific page (1-based, clamped). */
        jumpToPage: (page: number) => void;
    }) => void;
}

/** Named export, as in: `import { BoxCutter } from "@tamatashwin/boxcutter"` */
export declare const BoxCutter: React.FC<BoxCutterProps>;

/** Re-export types for convenience. */
export type {
    PDFSource as BoxcutterPDFSource,
    Snippet as BoxcutterSnippet,
    TOCItem as BoxcutterTOCItem,
    BoundingBox as BoxcutterBoundingBox,
};
