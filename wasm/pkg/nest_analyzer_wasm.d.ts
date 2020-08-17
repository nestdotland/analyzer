/* tslint:disable */
/* eslint-disable */
/**
* @param {string} filename
* @param {string} src
* @returns {Array<any>}
*/
export function tree(filename: string, src: string): Array<any>;
/**
* @param {string} src
* @returns {Array<any>}
*/
export function analyze(src: string): Array<any>;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly tree: (a: number, b: number, c: number, d: number) => number;
  readonly analyze: (a: number, b: number) => number;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_free: (a: number, b: number) => void;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
        