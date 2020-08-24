import init, {
  source,
  tree as wasm_tree,
  analyze as wasm_analyze,
} from "../wasm/wasm.js";
import { Analyze as runtime, RuntimeDiagnostics } from "../runtime/mod.ts";
import { FnRules } from "../runtime/rules.ts";

await init(source);

// TODO(@divy-work): Typings...
export interface Diagnostics {
  static: any;
  runtime?: RuntimeDiagnostics[];
}

export function tree(filename: string, src: string) {
  return wasm_tree(filename, src);
}

interface AnalyzerOptions {
  runtime?: boolean;
}

export async function analyze(
  src: string,
  options?: AnalyzerOptions,
): Promise<Diagnostics> {
  let runtimeDiagnostics: RuntimeDiagnostics[] = [];
  if (options?.runtime) {
    let anl = new runtime(FnRules);
    runtimeDiagnostics.push(await anl.analyze(src));
  }
  let diagnostics: Diagnostics = {
    static: wasm_analyze(src),
    runtime: runtimeDiagnostics,
  };

  return diagnostics;
}
