import init, {
  source,
  tree as wasm_tree,
} from "../analyzer_wasm/wasm.js";
import { Analyze as runtime, RuntimeDiagnostics } from "../analyzer_runtime/mod.ts";
import { FnRules } from "../analyzer_runtime/rules.ts";

await init(source);

export function tree(filename: string, src: string): string[] {
  return wasm_tree(filename, src);
}

export async function analyze(
  src: string,
): Promise<RuntimeDiagnostics[]> {
  let runtimeDiagnostics: RuntimeDiagnostics[] = [];
  let anl = new runtime(FnRules);
  runtimeDiagnostics.push(await anl.analyze(src, true));
  return runtimeDiagnostics;
}
