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
import { BoxCutter } from "boxcutter";

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
        showSnippetsCollection
      />
    </div>
  );
}

export default App;
```

## License

Boxcutter is licensed under the MIT License. See the LICENSE file for more details.

## Contributing

Contributions are welcome! Please see the [issues](https://github.com/tashes/boxcutter/issues) page for guidelines on how to contribute to this project.

## Support

For any issues or feature requests, please visit our [GitHub repository](https://github.com/tashes/boxcutter).
