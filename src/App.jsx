import { useState, useEffect } from "react";

import BoxCutter from "./components/boxcutter";

function App() {
    let [pdf, setPdf] = useState(null);
    let [snippets, setSnippets] = useState([]);
    let [toc, setTOC] = useState([]);
    // Controlled page state for testing parent-driven navigation
    let [page, setPage] = useState(1);

    // Initialize saved theme
    useEffect(() => {
        try {
            const saved = localStorage.getItem("theme");
            if (saved === "dark") {
                document.documentElement.classList.add("dark");
            }
        } catch {}
    }, []);

    useEffect(() => {
        let loadPdf = async () => {
            let data = await fetch("/example.pdf").then((r) => r.bytes());
            setPdf(data);
        };

        loadPdf();
    }, []);

    return (
        <div className="w-full h-full flex flex-col gap-8 overflow-auto bg-background text-foreground">
            <div className="flex flex-col gap-8 w-[90%] max-w-[1000px] mx-auto">
                <div className="flex items-center justify-between py-4">
                    <div className="text-sm text-muted-foreground">Demo</div>
                    <button
                        className="px-3 py-1 border border-input rounded bg-background hover:bg-accent hover:text-accent-foreground"
                        onClick={() => {
                            const root = document.documentElement;
                            const next = root.classList.toggle("dark")
                                ? "dark"
                                : "light";
                            try {
                                localStorage.setItem("theme", next);
                            } catch {}
                        }}
                    >
                        Toggle theme
                    </button>
                </div>
                {/* Simple controls to test controlled page behavior */}
                <div className="flex items-center gap-2">
                    <button
                        className="px-3 py-1 border border-input rounded bg-background hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Parent Prev
                    </button>
                    <span>
                        Page
                        <input
                            type="number"
                            className="mx-2 w-16 border border-input rounded px-2 py-1 bg-background"
                            value={page}
                            min={1}
                            onChange={(e) =>
                                setPage(() => {
                                    const n = parseInt(e.target.value, 10);
                                    return Number.isFinite(n) ? n : 1;
                                })
                            }
                        />
                    </span>
                    <button
                        className="px-3 py-1 border border-input rounded bg-background hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Parent Next
                    </button>
                </div>
                <div className="mb-6 w-248 h-full">
                    <BoxCutter
                        pdf={pdf}
                        page={page}
                        snippets={snippets}
                        onSnippetsChange={(snips) => setSnippets(snips)}
                        toc={toc}
                        onTOCChange={setTOC}
                        onPageChange={(p) => setPage(p)}
                        onReady={({ totalPages, currentPage, scale, pageSize, jumpToPage }) => {
                            // Demonstrate using onReady details and helper
                            console.log("onReady:", {
                                totalPages,
                                currentPage,
                                scale,
                                pageSize,
                            });

                            // Example: jump to page 3 if available
                            if (totalPages >= 3) {
                                jumpToPage(3);
                            }
                        }}
                        showSnippetsCollection={true}
                    />
                </div>

                <div className="flex-1">
                    <pre className="bg-muted text-muted-foreground p-4 rounded overflow-auto max-h-[400px]">
                        {JSON.stringify(snippets, undefined, 4)}
                    </pre>

                    <pre className="bg-muted text-muted-foreground p-4 rounded overflow-auto max-h-[400px] mt-4">
                        {JSON.stringify(toc, undefined, 4)}
                    </pre>
                </div>
            </div>
        </div>
    );
}

export default App;
