import { useState, useEffect } from "react";

import BoxCutter from "./components/boxcutter";

function App() {
    let [pdf, setPdf] = useState(null);
    let [snippets, setSnippets] = useState([]);
    let [toc, setTOC] = useState([]);

    useEffect(() => {
        let loadPdf = async () => {
            let data = await fetch("/example.pdf").then((r) => r.bytes());
            setPdf(data);
        };

        loadPdf();
    }, []);

    return (
        <div className="w-full h-full flex flex-col gap-8 overflow-auto">
            <div className="flex flex-col gap-8 w-[90%] max-w-[1000px] mx-auto">
                <div className="mb-6 w-248 h-full">
                    <BoxCutter
                        pdf={pdf}
                        snippets={snippets}
                        onSnippetsChange={(snips) => setSnippets(snips)}
                        toc={toc}
                        onTOCChange={setTOC}
                        showSnippetsCollection={true}
                    />
                </div>

                <div className="flex-1">
                    <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[400px]">
                        {JSON.stringify(snippets, undefined, 4)}
                    </pre>

                    <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[400px]">
                        {JSON.stringify(toc, undefined, 4)}
                    </pre>
                </div>
            </div>
        </div>
    );
}

export default App;
