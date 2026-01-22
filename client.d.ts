// client.d.ts
export { BoxCutter } from "./index";
export type * from "./index";
export declare function initPdfjsWorker(params: { url?: string; port?: Worker } = {}): Worker | null;
