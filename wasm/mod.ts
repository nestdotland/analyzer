import init, { source, tree as wasm_tree } from "./wasm.js";

await init(source);

export function tree(filename: string, src: string) {
  return wasm_tree(filename, src);
}
console.log(
  tree(
    "anon.ts",
    `
    import * as x from "x.ts";
  `,
  ),
);
