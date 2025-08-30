// This file is used as the "react-server" export target in package.json
// to prevent usage of this library in React Server Components.
// If you hit this error in Next.js, import from the client subpath instead:
//   import { BoxCutter } from "@tamatashwin/boxcutter/client";
// And import styles separately:
//   import "@tamatashwin/boxcutter/styles.css";

throw new Error(
  "@tamatashwin/boxcutter is a client-only library. Import from '@tamatashwin/boxcutter/client' in React Server Components."
);

