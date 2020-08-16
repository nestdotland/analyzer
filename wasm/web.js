import init, {
  source,
  tree as wasm_tree,
  analyze as wasm_analyze,
} from "./wasm.js";

(async () => await init(source));

export function tree(filename, src) {
  return wasm_tree(filename, src);
}

export function analyze(src) {
  return wasm_analyze(src);
}
