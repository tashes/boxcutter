# Boxcutter

Boxcutter is a powerful web development tool designed for snipping PDF documents with ease. It integrates seamlessly with React and Tailwind CSS to create highly responsive web applications.

## Key Features

- **PDF Handling**: Use Boxcutter to display and interact with PDFs within your application. The tool leverages `pdfjs-dist` to facilitate efficient PDF rendering and manipulation.
- **React Components**: Easily integrate with React using the provided Boxcutter component.
- **Tailwind CSS**: Styled by default with Tailwind CSS for modern and responsive design.

## Installation

To install Boxcutter, ensure you have Node.js installed, then run the following command to add it to your project:

```bash
npm install boxcutter
```

## Essential Scripts

- **Development**: Start a development server using Vite with `npm run dev`.
- **Production Build**: Compile your application for production with `npm run build`.
- **Preview**: Preview a production build with `npm run preview`.
- **Lint**: Run ESLint on the project with `npm run lint`.

## Usage Example

Here's a basic example of how you might use the Boxcutter component in a React application:

```javascript
import React, { useState, useEffect } from "react";
import { BoxCutter } from "@tamatashwin/boxcutter";
import "@tamatashwin/boxcutter/styles.css"

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
      <BoxCutter
        pdf={pdf}
        snippets={snippets}
        onSnippetsChange={setSnippets}
        toc={toc}
        onTOCChange={setTOC}
        onReady={({ totalPages, currentPage, scale, pageSize, jumpToPage }) => {
          // Called once the first page is rendered and interactions are ready
          console.log("Boxcutter ready:", {
            totalPages,
            currentPage,
            scale,
            pageSize,
          });

          // Example: jump to page 3 on ready
          if (totalPages >= 3) {
            jumpToPage(3);
          }
        }}
        showSnippetsCollection
      />
    </div>
  );
}

export default App;
```

## Next.js (Client Components)

Use the client-only subpath to avoid SSR DOM errors in Next.js App Router.

- Import components from `@tamatashwin/boxcutter/client`.
- Import styles from `@tamatashwin/boxcutter/styles.css`.
- Transpile the package in `next.config.js` with `transpilePackages`.

Example:

```tsx
// app/page.tsx (a Server Component)
import "@tamatashwin/boxcutter/styles.css";

export default function Page() {
  return (
    <div>
      {/* Use a Client Component wrapper for BoxCutter */}
      <ClientDemo />
    </div>
  );
}

// app/client-demo.tsx
"use client";
import { useState } from "react";
import { BoxCutter } from "@tamatashwin/boxcutter/client";

export function ClientDemo() {
  const [pdf, setPdf] = useState<ArrayBuffer | null>(null);
  // ...fetch and set the PDF bytes
  return <BoxCutter pdf={pdf} snippets={[]} onSnippetsChange={()=>{}} toc={[]} onTOCChange={()=>{}} />;
}
```

`next.config.js`:

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@tamatashwin/boxcutter"],
};
module.exports = nextConfig;
```

If you accidentally import `@tamatashwin/boxcutter` in a Server Component, you’ll see a helpful error directing you to use the `/client` subpath instead.

## Dark Mode

This package uses semantic Tailwind classes backed by CSS variables. Theme tokens are defined under `:root` and `.dark` in `@tamatashwin/boxcutter/styles.css`.

- Background/foreground: `bg-background`, `text-foreground`, `border-border`.
- Accents and subtle: `bg-accent`, `text-accent-foreground`, `bg-muted`, `text-muted-foreground`.
- Surfaces: `bg-card`/`text-card-foreground`, `bg-popover`/`text-popover-foreground`.

To toggle dark mode, add or remove the `dark` class on `document.documentElement` and persist to `localStorage`:

```ts
// Simple theme toggle
function toggleTheme() {
  const root = document.documentElement;
  const next = root.classList.toggle("dark") ? "dark" : "light";
  localStorage.setItem("theme", next);
}

// Initialize on load
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") document.documentElement.classList.add("dark");
}
```

When styling your app around the component, avoid hardcoded grays (e.g. `text-gray-500`). Use the semantic classes listed above for consistent theming.

If you use Next.js (App Router), import the client entry so the component renders only on the client and avoids SSR-only errors like "DOMMatrix is not defined":

```tsx
// app/(any)/page.tsx or a Client Component in your tree
"use client";

import { useState } from "react";
import { BoxCutter } from "@tamatashwin/boxcutter/client";
import "@tamatashwin/boxcutter/styles.css";

export default function Page() {
  const [snippets, setSnippets] = useState([]);
  const [toc, setToc] = useState([]);

  return (
    <BoxCutter
      pdf={null}
      snippets={snippets}
      onSnippetsChange={setSnippets}
      toc={toc}
      onTOCChange={setToc}
    />
  );
}
```

Notes:
- Import from `@tamatashwin/boxcutter/client` (which contains a `"use client"` directive) to ensure client-side rendering.
- Do not import `@tamatashwin/boxcutter` directly from a Server Component; that can cause SSR to evaluate DOM APIs and produce errors like `DOMMatrix is not defined`.
- Alternative: you can also dynamically import with SSR disabled if needed:

```tsx
import dynamic from "next/dynamic";

const BoxCutter = dynamic(
  () => import("@tamatashwin/boxcutter/client").then((m) => m.BoxCutter),
  { ssr: false }
);
```

## License

Boxcutter is licensed under the MIT License. See the LICENSE file for more details.

## Contributing

Contributions are welcome! Please see the [issues](https://github.com/tashes/boxcutter/issues) page for guidelines on how to contribute to this project.

## Support

For any issues or feature requests, please visit our [GitHub repository](https://github.com/tashes/boxcutter).
