import init, {
  source,
  tree as wasm_tree,
  analyze as wasm_analyze,
} from "../wasm/wasm.js";

await init(source);

export function tree(filename: string, src: string): string[] {
  return wasm_tree(filename, src);
}

export function analyze(src: string) {
  return wasm_analyze(src);
}
