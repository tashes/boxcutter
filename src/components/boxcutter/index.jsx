import { v4 } from "uuid";
import React, { useRef, useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Slider } from "../../../components/ui/slider";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { deepEquals } from "./utils/helpers";

const BTNRADIUS = 8;

import { pdfjsLib } from "./utils/pdfjs";
import {
    ArrowUpRight,
    Bookmark,
    BookmarkX,
    ChevronLeft,
    ChevronRight,
    Download,
    GitPullRequestArrow,
    Menu,
    Scissors,
    Trash,
} from "lucide-react";
import { useCallback } from "react";

export default function BoxCutter({
    pdf = null,
    page = undefined,
    snippets = [],
    onSnippetsChange = () => {},
    toc = [],
    onTOCChange = () => {},
    onPageChange = () => {},
    showSnippetsCollection = true,
    onReady = undefined,
}) {
    const canvasRef = useRef(null);
    const overlayRef = useRef(null);

    const [pdfData, setPdfData] = useState(pdf);
    // Use controlled snippets from props; default to [] if undefined/null
    const controlledSnippets = Array.isArray(snippets) ? snippets : [];
    // Local TOC state (uncontrolled); sync outward via onTOCChange
    const [contents, setContents] = useState(toc);
    const [isContentsOpen, setIsContentsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Internal page state; syncs with optional controlled `page` prop
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.5);
    const [activePointerType, setActivePointerType] = useState(null);
    const [selection, setSelection] = useState({
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        isSelecting: false,
    });
    const [multiselection, setMultiselection] = useState({
        selections: [],
        isActive: false,
    });
    const [hoveredSelection, setHoveredSelection] = useState(null);
    const [isSnippetsOpen, setIsSnippetsOpen] = useState(false);
    // Track whether we've informed the parent that we're ready for interaction
    const hasAnnouncedReady = useRef(false);

    let renderSnippets = useCallback(() => {
        if (!overlayRef.current) return;

        const overlayCanvas = overlayRef.current;
        const overlayContext = overlayCanvas.getContext("2d");
        if (!overlayContext) return;

        // Clear overlay
        overlayContext.clearRect(
            0,
            0,
            overlayCanvas.width,
            overlayCanvas.height,
        );

        // Draw existing snippets
        const pageSnippets = controlledSnippets.filter(
            (s) => s.pageNumber === currentPage,
        );
        pageSnippets.forEach((snippet, index) => {
            const sx = snippet.x * scale;
            const sy = snippet.y * scale;
            const sw = snippet.width * scale;
            const sh = snippet.height * scale;

            const isHovered =
                hoveredSelection?.type === "single" &&
                hoveredSelection.id === snippet.id;

            overlayContext.strokeStyle = "#3b82f6";
            overlayContext.lineWidth = 2;
            overlayContext.setLineDash([5, 5]);
            overlayContext.strokeRect(sx, sy, sw, sh);

            overlayContext.fillStyle = "#3b82f6";
            overlayContext.font = "12px Arial";
            overlayContext.fillText(`${index + 1}`, sx + 5, sy + 15);

            if (isHovered) {
                const btnRadius = BTNRADIUS;
                const cx = sx + sw - btnRadius - 4;
                const cy = sy + btnRadius + 4;

                overlayContext.beginPath();
                overlayContext.arc(cx, cy, btnRadius, 0, Math.PI * 2);
                overlayContext.fillStyle = "#ef4444";
                overlayContext.fill();

                overlayContext.strokeStyle = "#fff";
                overlayContext.lineWidth = 2;
                overlayContext.setLineDash([]);
                overlayContext.beginPath();
                overlayContext.moveTo(cx - 4, cy - 4);
                overlayContext.lineTo(cx + 4, cy + 4);
                overlayContext.moveTo(cx + 4, cy - 4);
                overlayContext.lineTo(cx - 4, cy + 4);
                overlayContext.stroke();
            }
        });

        // Draw multiselection rectangles
        if (multiselection.isActive && multiselection.selections.length > 0) {
            overlayContext.strokeStyle = "#22c55e";
            overlayContext.lineWidth = 1;
            overlayContext.setLineDash([3, 3]);

            multiselection.selections.forEach((sel, i) => {
                const x = Math.min(sel.startX, sel.endX);
                const y = Math.min(sel.startY, sel.endY);
                const width = Math.abs(sel.endX - sel.startX);
                const height = Math.abs(sel.endY - sel.startY);
                overlayContext.strokeRect(x, y, width, height);

                const isHovered =
                    hoveredSelection?.type === "multi" &&
                    hoveredSelection.id === i;

                if (isHovered) {
                    const btnRadius = BTNRADIUS;
                    const cx = x + width - btnRadius - 4;
                    const cy = y + btnRadius + 4;

                    overlayContext.beginPath();
                    overlayContext.arc(cx, cy, btnRadius, 0, Math.PI * 2);
                    overlayContext.fillStyle = "#ef4444";
                    overlayContext.fill();

                    overlayContext.strokeStyle = "#fff";
                    overlayContext.lineWidth = 2;
                    overlayContext.beginPath();
                    overlayContext.moveTo(cx - 4, cy - 4);
                    overlayContext.lineTo(cx + 4, cy + 4);
                    overlayContext.moveTo(cx + 4, cy - 4);
                    overlayContext.lineTo(cx - 4, cy + 4);
                    overlayContext.stroke();
                }
            });
        }

        // Draw current selection
        if (selection.isSelecting) {
            const x = Math.min(selection.startX, selection.endX);
            const y = Math.min(selection.startY, selection.endY);
            const width = Math.abs(selection.endX - selection.startX);
            const height = Math.abs(selection.endY - selection.startY);

            overlayContext.strokeStyle = "#ef4444";
            overlayContext.lineWidth = 2;
            overlayContext.setLineDash([]);
            overlayContext.strokeRect(x, y, width, height);

            overlayContext.fillStyle = "rgba(239, 68, 68, 0.1)";
            overlayContext.fillRect(x, y, width, height);
        }
    }, [
        controlledSnippets,
        currentPage,
        selection,
        multiselection,
        scale,
        hoveredSelection,
    ]);

    let extractSnippet = async () => {
        if (!canvasRef.current || !selection.isSelecting) return;

        const canvas = canvasRef.current;
        const x = Math.min(selection.startX, selection.endX);
        const y = Math.min(selection.startY, selection.endY);
        const width = Math.abs(selection.endX - selection.startX);
        const height = Math.abs(selection.endY - selection.startY);

        // Create a new canvas for the snippet
        const snippetCanvas = document.createElement("canvas");
        snippetCanvas.width = width;
        snippetCanvas.height = height;
        const snippetContext = snippetCanvas.getContext("2d");

        if (!snippetContext) return;

        // Draw the selected area
        snippetContext.drawImage(
            canvas,
            x,
            y,
            width,
            height,
            0,
            0,
            width,
            height,
        );

        // Create new snippet
        const newSnippet = {
            id: `${v4()}`,
            pageNumber: currentPage,
            x: x / scale,
            y: y / scale,
            width: width / scale,
            height: height / scale,
            image: snippetCanvas.toDataURL("image/png"),
        };

        onSnippetsChange([...controlledSnippets, newSnippet]);
    };

    let extractCombinedSnippet = async () => {
        if (!canvasRef.current || multiselection.selections.length === 0)
            return;

        const canvas = canvasRef.current;

        // Convert raw selections into usable rectangles
        const rects = multiselection.selections.map((sel) => {
            const x = Math.min(sel.startX, sel.endX);
            const y = Math.min(sel.startY, sel.endY);
            const width = Math.abs(sel.endX - sel.startX);
            const height = Math.abs(sel.endY - sel.startY);
            return { x, y, width, height };
        });

        // Get bounding box for all rectangles
        const minX = Math.min(...rects.map((r) => r.x));
        const minY = Math.min(...rects.map((r) => r.y));
        const maxX = Math.max(...rects.map((r) => r.x + r.width));
        const maxY = Math.max(...rects.map((r) => r.y + r.height));

        const combinedWidth = maxX - minX;
        const combinedHeight = maxY - minY;

        // Create a new canvas for the combined snippet
        const snippetCanvas = document.createElement("canvas");
        snippetCanvas.width = combinedWidth;
        snippetCanvas.height = combinedHeight;
        const snippetContext = snippetCanvas.getContext("2d");

        if (!snippetContext) return;

        // Optional: white background
        snippetContext.fillStyle = "#ffffff";
        snippetContext.fillRect(0, 0, combinedWidth, combinedHeight);

        // Draw each selection onto the combined canvas
        rects.forEach((r) => {
            const relativeX = r.x - minX;
            const relativeY = r.y - minY;

            snippetContext.drawImage(
                canvas,
                r.x,
                r.y,
                r.width,
                r.height,
                relativeX,
                relativeY,
                r.width,
                r.height,
            );
        });

        const newSnippet = {
            id: `${v4()}`,
            pageNumber: currentPage,
            x: minX / scale,
            y: minY / scale,
            width: combinedWidth / scale,
            height: combinedHeight / scale,
            image: snippetCanvas.toDataURL("image/png"),
        };

        onSnippetsChange([...controlledSnippets, newSnippet]);

        setMultiselection({
            selections: [],
            isActive: false,
        });
    };

    useEffect(() => {
        const loadPDF = async () => {
            setLoading(true);
            setError(null);
            setPdfData(null);
            try {
                if (!pdf) throw new Error("No pdf");
                const loadingTask = pdfjsLib.getDocument({
                    data: pdf,
                    useWorkerFetch: false,
                    isEvalSupported: false,
                    useSystemFonts: true,
                    verbosity: 0,
                });
                const pdfDoc = await loadingTask.promise;
                setPdfData(pdfDoc);
                setTotalPages(pdfDoc.numPages);
                // If controlled, start from provided page; otherwise default to 1
                const initial = typeof page === "number" ? page : 1;
                setCurrentPage(initial);
            } catch (e) {
                setError(e);
            } finally {
                setLoading(false);
            }
        };

        // Reset the ready flag when a new PDF is provided
        hasAnnouncedReady.current = false;
        loadPDF();
    }, [pdf]);

    useEffect(() => {
        let renderTask = null;

        const loadPage = async () => {
            setError(null);
            try {
                if (!pdfData || !canvasRef.current)
                    throw new Error("No pdf page data");

                const canvas = canvasRef.current;
                const context = canvas.getContext("2d");
                if (!context) throw new Error("No context found for canvas");

                const page = await pdfData.getPage(currentPage);
                const viewport = page.getViewport({ scale });

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Setup overlay canvas
                if (overlayRef.current) {
                    overlayRef.current.height = viewport.height;
                    overlayRef.current.width = viewport.width;
                }

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                // Cancel previous render if needed
                if (renderTask?.cancel) {
                    renderTask.cancel(); // Safe to call even if already finished
                }

                renderTask = page.render(renderContext);
                await renderTask.promise;
                renderSnippets();

                // Announce readiness once the first page has finished rendering
                if (!hasAnnouncedReady.current) {
                    hasAnnouncedReady.current = true;
                    if (typeof onReady === "function") {
                        // Defer to next frame to ensure DOM is painted
                        const canvasEl = canvasRef.current;
                        const overlayEl = overlayRef.current;
                        const info = {
                            totalPages,
                            currentPage,
                            scale,
                            pageSize: {
                                width: canvas.width,
                                height: canvas.height,
                            },
                            canvas: canvasEl,
                            overlay: overlayEl,
                            jumpToPage: (target) => {
                                const toNum = (val) => {
                                    const n = typeof val === "number" ? val : parseInt(val, 10);
                                    return Number.isFinite(n) ? n : 1;
                                };
                                const t = toNum(target);
                                if (totalPages > 0 && t >= totalPages) setCurrentPage(totalPages);
                                else if (t <= 1) setCurrentPage(1);
                                else setCurrentPage(t);
                            },
                        };
                        requestAnimationFrame(() => onReady(info));
                    }
                }
            } catch (e) {
                if (e?.name !== "RenderingCancelledException") {
                    setError(e);
                }
            }
        };

        loadPage();

        // Cleanup render task when component or effect changes
        return () => {
            if (renderTask?.cancel) renderTask.cancel();
        };
    }, [pdfData, currentPage, scale]);

    useEffect(() => {
        let animationFrameId = requestAnimationFrame(() => {
            renderSnippets();
        });

        return () => cancelAnimationFrame(animationFrameId);
    }, [
        controlledSnippets,
        currentPage,
        selection,
        multiselection,
        scale,
        hoveredSelection,
    ]);

    useEffect(() => {
        let handleKeyUp = () => {
            if (
                multiselection.isActive === true &&
                multiselection.selections.length > 0
            ) {
                extractCombinedSnippet();
            }
        };

        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [multiselection]);

    // Snippets are controlled; no internal state sync needed.

    useEffect(() => {
        if (!deepEquals(toc, contents)) onTOCChange(contents);
    }, [contents]);

    useEffect(() => {
        onPageChange(currentPage);
    }, [currentPage]);

    // Keep internal page in sync with controlled `page` prop
    useEffect(() => {
        if (typeof page === "number") {
            // Clamp to [1, totalPages] when totalPages is known (>0)
            const max = totalPages && totalPages > 0 ? totalPages : undefined;
            const next = Math.max(1, max ? Math.min(page, max) : page);
            if (next !== currentPage) setCurrentPage(next);
        }
    }, [page, totalPages]);

    let handleExtractOutline = async (maxDepth = 1) => {
        const outline = await pdfData.getOutline();
        if (!outline) return [];

        async function resolveItem(item, depth = 1) {
            let pageNumber = null;
            try {
                let destArray = null;
                if (Array.isArray(item.dest)) {
                    destArray = item.dest;
                } else if (typeof item.dest === "string") {
                    const resolved = await pdfData.getDestination(item.dest);
                    if (Array.isArray(resolved)) {
                        destArray = resolved;
                    }
                }

                if (destArray) {
                    const [ref] = destArray;
                    if (
                        typeof ref === "object" &&
                        ref !== null &&
                        "num" in ref &&
                        "gen" in ref
                    ) {
                        const pageIndex = await pdfData.getPageIndex(ref);
                        pageNumber = pageIndex + 1;
                    }
                }
            } catch (e) {
                console.warn("Failed to resolve:", item.title, e);
            }

            return {
                title: item.title,
                pageNumber,
                children:
                    depth < maxDepth && item.items
                        ? await Promise.all(
                              item.items.map((child) =>
                                  resolveItem(child, depth + 1),
                              ),
                          )
                        : [],
            };
        }

        function flattenOutline(outline) {
            const result = [];
            const walk = (items) => {
                for (const item of items) {
                    result.push({
                        title: item.title,
                        pageNumber: item.pageNumber,
                    });
                    if (item.children) walk(item.children);
                }
            };
            walk(outline);
            return result;
        }

        const resolvedOutline = await Promise.all(
            outline.map((item) => resolveItem(item, 1)),
        );
        const fullOutline = flattenOutline(resolvedOutline);
        const pagedOutline = fullOutline
            .filter((a) => a.pageNumber !== null)
            .map((p) => ({
                ...p,
                id: v4(),
                type: "bookmark",
            }));

        setContents(pagedOutline);
    };

    let handleScaleChange = (value) => {
        setScale(value / 100);
    };

    let handlePreviousPage = () => {
        if (currentPage <= 1) return;
        setCurrentPage((pageNum) => pageNum - 1);
    };

    let handleNextPage = () => {
        if (currentPage >= totalPages) return;
        setCurrentPage((pageNum) => pageNum + 1);
    };

    let handleToggleSnippets = () => {
        if (isContentsOpen === true) setIsContentsOpen(false);
        setIsSnippetsOpen((snippetsOpenState) => !snippetsOpenState);
    };

    let handleToggleContents = () => {
        if (isSnippetsOpen === true) setIsSnippetsOpen(false);
        setIsContentsOpen((contentsOpenState) => !contentsOpenState);
    };

    let handleAddBookmark = (pageNumber) => {
        setContents((prevContents) => {
            const exists = prevContents.some(
                (item) => item.pageNumber === pageNumber,
            );
            if (exists) return prevContents;

            return [
                ...prevContents,
                {
                    id: v4(),
                    type: "bookmark",
                    pageNumber,
                    title: `Page ${pageNumber}`,
                },
            ].sort((a, b) => a.pageNumber - b.pageNumber);
        });
    };

    let handleRemoveBookmark = (pageNumber) => {
        setContents((prevContents) =>
            prevContents.filter((item) => item.pageNumber !== pageNumber),
        );
    };

    let handleBookmarkTitleChange = (index, title) => {
        setContents([
            ...contents.slice(0, index),
            {
                ...contents[index],
                title,
            },
            ...contents.slice(index + 1),
        ]);
    };

    let handleOpenPageNumber = (pageNumber) => {
        const toNum = (val) => {
            const n = typeof val === "number" ? val : parseInt(val, 10);
            return Number.isFinite(n) ? n : 1;
        };
        const target = toNum(pageNumber);
        if (totalPages > 0 && target >= totalPages) setCurrentPage(totalPages);
        else if (target <= 1) setCurrentPage(1);
        else setCurrentPage(target);
    };

    let handlePointerDown = (evt) => {
        if (evt.pointerType === "touch") return;
        if (!overlayRef.current) return;

        const rect = overlayRef.current.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;

        setActivePointerType(evt.pointerType);

        setSelection({
            startX: x,
            startY: y,
            endX: x,
            endY: y,
            isSelecting: true,
        });

        if (evt.pointerType === "pen") {
            evt.preventDefault();
        }
    };

    let handlePointerMove = (evt) => {
        if (!overlayRef.current) return;

        const rect = overlayRef.current.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;

        // Adjust for scale
        const scaledX = x / scale;
        const scaledY = y / scale;

        if (selection.isSelecting && evt.pointerType === activePointerType) {
            setSelection((prev) => ({
                ...prev,
                endX: x,
                endY: y,
            }));
            return;
        }

        let found = false;

        // Hover over multiselections (screen-space)
        multiselection.selections.forEach((sel, i) => {
            const x1 = Math.min(sel.startX, sel.endX);
            const y1 = Math.min(sel.startY, sel.endY);
            const x2 = Math.max(sel.startX, sel.endX);
            const y2 = Math.max(sel.startY, sel.endY);
            if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
                setHoveredSelection({
                    type: "multi",
                    id: i,
                    cx: x2 - 4 - BTNRADIUS,
                    cy: y1 + 4 + BTNRADIUS,
                });
                found = true;
            }
        });

        // Hover over snippets (PDF-space)
        if (!found) {
            const currentSnips = controlledSnippets.filter(
                (s) => s.pageNumber === currentPage,
            );
            currentSnips.forEach((s) => {
                const x1 = s.x;
                const y1 = s.y;
                const x2 = s.x + s.width;
                const y2 = s.y + s.height;

                if (
                    scaledX >= x1 &&
                    scaledX <= x2 &&
                    scaledY >= y1 &&
                    scaledY <= y2
                ) {
                    setHoveredSelection({
                        type: "single",
                        id: s.id,
                        cx: x2 * scale - 4 - BTNRADIUS,
                        cy: y1 * scale + 4 + BTNRADIUS,
                    });
                    found = true;
                }
            });
        }

        if (!found) {
            setHoveredSelection(null);
        }
    };

    let handlePointerUp = (evt) => {
        if (hoveredSelection !== null) {
            const rect = overlayRef.current.getBoundingClientRect();
            const x = evt.clientX - rect.left;
            const y = evt.clientY - rect.top;

            const dx = x - hoveredSelection.cx;
            const dy = y - hoveredSelection.cy;

            if (Math.sqrt(dx * dx + dy * dy) <= BTNRADIUS) {
                if (hoveredSelection.type === "single") {
                    // Delete snippet
                    const snipIndex = controlledSnippets.findIndex(
                        (s) => s.id === hoveredSelection.id,
                    );
                    if (snipIndex !== -1) {
                        onSnippetsChange([
                            ...controlledSnippets.slice(0, snipIndex),
                            ...controlledSnippets.slice(snipIndex + 1),
                        ]);
                    }
                } else if (hoveredSelection.type === "multi") {
                    // Delete multi-selection at index
                    const newSelections = multiselection.selections.filter(
                        (_, idx) => idx !== hoveredSelection.id,
                    );
                    setMultiselection({
                        selections: newSelections,
                        isActive: newSelections.length > 0,
                    });
                }
            }
        }

        if (!selection.isSelecting || !activePointerType) return;
        if (evt.pointerType !== activePointerType) return;

        const newSel = {
            startX: Math.min(selection.startX, selection.endX),
            startY: Math.min(selection.startY, selection.endY),
            endX: Math.max(selection.startX, selection.endX),
            endY: Math.max(selection.startY, selection.endY),
        };

        const width = newSel.endX - newSel.startX;
        const height = newSel.endY - newSel.startY;

        if (width > 10 && height > 10) {
            if (evt.shiftKey) {
                // Append to multi-selection
                const allSelections = [...multiselection.selections, newSel];

                setMultiselection({
                    selections: allSelections,
                    isActive: true,
                });
            } else {
                // Normal single selection
                setSelection({ ...newSel, isSelecting: true });

                setTimeout(() => {
                    extractSnippet();
                }, 0);
            }
        }

        setSelection((prev) => ({ ...prev, isSelecting: false }));
        setActivePointerType(null);
    };

    let handlePointerLeave = (evt) => {
        if (selection.isSelecting && evt.pointerType === activePointerType) {
            setSelection((prev) => ({ ...prev, isSelecting: false }));
            setActivePointerType(null);
        }
        if (multiselection.isActive === true) {
            setMultiselection({
                selections: [],
                isActive: false,
            });
        }
        setHoveredSelection(null);
    };

    let handlePointerCancel = (evt) => {
        if (selection.isSelecting && evt.pointerType === activePointerType) {
            setSelection((prev) => ({ ...prev, isSelecting: false }));
            setActivePointerType(null);
        }
        if (multiselection.isActive === true) {
            setMultiselection({
                selections: [],
                isActive: false,
            });
        }
        setHoveredSelection(null);
    };

    let handleDownloadSnippet = (snippet) => {
        const a = document.createElement("a");
        a.href = snippet.image;
        a.download = `snippet-${snippet.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    let handleDeleteSnippet = (index) => {
        onSnippetsChange([
            ...controlledSnippets.slice(0, index),
            ...controlledSnippets.slice(index + 1),
        ]);
    };

    let item = null;
    if (pdfData === null) {
        item = (
            <Card className="p-8 text-center rounded relative">
                No PDF loaded
            </Card>
        );
    } else if (loading === true) {
        item = (
            <Card className="p-8 text-center rounded relative">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading PDF...</p>
            </Card>
        );
    } else if (error !== null) {
        item = (
            <Card
                className="p-8 bg-red-100 border border-red-400 text-red-700 rounded relative"
                role="alert"
            >
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <span className="block">{error.message}</span>
                    <pre className="pt-4 width-100 overflow-x-auto">
                        {error.stack.split("\n").slice(1).join("\n")}
                    </pre>
                </CardContent>
            </Card>
        );
    } else {
        item = null;
    }

    let shouldAllowBookmarkOfPage =
        contents.find((item) => item.pageNumber === currentPage) !== undefined;

    let tableOfContents = contents.map((item, index) => (
        <div className="flex items-center" key={item.id}>
            <Input
                value={item.title}
                placeholder={`Enter title for page ${item.pageNumber}`}
                className="border-none shadow-none mr-2"
                onChange={(e) =>
                    handleBookmarkTitleChange(index, e.target.value)
                }
            />
            <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 cursor-pointer"
                onClick={() => handleOpenPageNumber(item.pageNumber)}
            >
                <ArrowUpRight />
            </Button>
        </div>
    ));

    let renderedSnips = controlledSnippets.map((s, index) => {
        const isCurrentPage = s.pageNumber === currentPage;
        return (
            <div
                key={s.id}
                className={`p-3 border rounded ${isCurrentPage ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
            >
                <div className="mb-2">
                    <img
                        src={s.image}
                        alt={`Snippet ${index + 1}`}
                        className="w-full h-20 object-contain bg-white border rounded"
                    />
                </div>
                <div className="w-full inline-flex shadow-sm overflow-hidden rounded-md">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenPageNumber(s.pageNumber)}
                        className="flex-1 rounded-tl-md rounded-bl-md rounded-tr-none rounded-br-none border-r border-border cursor-pointer"
                    >
                        <ArrowUpRight />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDownloadSnippet(s)}
                        className="flex-1 rounded-none border-r border-border cursor-pointer"
                    >
                        <Download />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteSnippet(index)}
                        className="flex-1 rounded-tr-md rounded-br-md rounded-tl-none rounded-bl-none cursor-pointer"
                    >
                        <Trash />
                    </Button>
                </div>
            </div>
        );
    });

    return (
        <div className="w-full h-full">
            <div className="space-y-4">
                {item ? (
                    item
                ) : (
                    <div className="relative overflow-hidden">
                        <div className="flex items-center justify-between gap-4 p-2 bg-gray-50 rounded-lg my-4">
                            <div className="flex items-center gap-2 w-full">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 cursor-pointer"
                                    onClick={() => handleToggleContents()}
                                >
                                    <Menu />
                                </Button>
                                {showSnippetsCollection && (
                                    <Button
                                        variant="ghost"
                                        className="relative cursor-pointer"
                                        onClick={() => handleToggleSnippets()}
                                    >
                                        <Scissors className="w-6 h-6" />

                                        <Badge
                                            variant="default"
                                            className="absolute top-0 left-full -translate-x-full h-5 min-w-5 rounded-full px-1 font-mono tabular-nums text-xs"
                                        >
                                            {controlledSnippets.length}
                                        </Badge>
                                    </Button>
                                )}
                                <div className="grow"></div>
                                <Slider
                                    defaultValue={[150]}
                                    max={300}
                                    min={50}
                                    step={10}
                                    className="w-[150px]"
                                    onValueChange={(val) =>
                                        handleScaleChange(val[0])
                                    }
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 cursor-pointer"
                                    onClick={() => handlePreviousPage()}
                                >
                                    <ChevronLeft />
                                </Button>
                                <span className="text-sm fit-content">
                                    Page{" "}
                                    <Input
                                        className="inline border-none shadow-none w-[fit-content] mx-2"
                                        value={currentPage}
                                        type="number"
                                        min={1}
                                        max={totalPages}
                                        onChange={(e) =>
                                            handleOpenPageNumber(e.target.value)
                                        }
                                    />{" "}
                                    of {totalPages}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 cursor-pointer"
                                    onClick={() => handleNextPage()}
                                >
                                    <ChevronRight />
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="overflow-auto min-h-[800px] h-full max-h-[100vh] border rounded">
                                <div className="relative w-fit">
                                    <canvas ref={canvasRef} className="block" />
                                    <canvas
                                        ref={overlayRef}
                                        className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
                                        onPointerDown={(e) =>
                                            handlePointerDown(e)
                                        }
                                        onPointerMove={(e) =>
                                            handlePointerMove(e)
                                        }
                                        onPointerUp={(e) => handlePointerUp(e)}
                                        onPointerLeave={(e) =>
                                            handlePointerLeave(e)
                                        }
                                        onPointerCancel={(e) =>
                                            handlePointerCancel(e)
                                        }
                                    />
                                </div>
                            </div>
                            <Card
                                className={`h-[calc(100%-6em)] w-[40%] absolute bottom-2 left-2 ${isContentsOpen ? "translate-x-0" : "-translate-x-[calc(100%+2em)]"} transition-transform duration-300`}
                            >
                                <CardHeader className="flex items-center">
                                    <CardTitle className="grow">
                                        Table of Contents
                                    </CardTitle>
                                    <Button
                                        className="cursor-pointer"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            const levelStr = prompt(
                                                "How many levels of the outline should be extracted?",
                                                "1",
                                            );
                                            const level = parseInt(levelStr);
                                            if (!isNaN(level) && level > 0) {
                                                handleExtractOutline(level);
                                            }
                                        }}
                                    >
                                        <GitPullRequestArrow />
                                    </Button>
                                    {shouldAllowBookmarkOfPage === true ? (
                                        <Button
                                            className="cursor-pointer"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                handleRemoveBookmark(
                                                    currentPage,
                                                )
                                            }
                                        >
                                            <BookmarkX />
                                        </Button>
                                    ) : (
                                        <Button
                                            className="cursor-pointer"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                handleAddBookmark(currentPage)
                                            }
                                        >
                                            <Bookmark />
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent className="overflow-auto">
                                    {tableOfContents}
                                </CardContent>
                            </Card>
                            {showSnippetsCollection && (
                                <Card
                                    className={`h-[calc(100%-6em)] w-[40%] absolute bottom-2 left-2 ${isSnippetsOpen ? "translate-x-0" : "-translate-x-[calc(100%+2em)]"} transition-transform duration-300`}
                                >
                                    <CardHeader className="flex items-center">
                                        <CardTitle>Snippets</CardTitle>
                                    </CardHeader>
                                    <CardContent className="overflow-auto space-y-2">
                                        {renderedSnips}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
