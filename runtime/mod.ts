import Iroh from "./runtime.js";
import babelCore from "https://dev.jspm.io/@babel/core";
import babelPresetEnv from "https://dev.jspm.io/@babel/preset-env";
import babelPluginTopAwait from "https://dev.jspm.io/@babel/plugin-syntax-top-level-await";

export async function runtimeAnalyze(
  code: string,
  rules: Function[],
): Promise<any> {
  let stage = new Iroh.Stage(code);
  let listener = stage.addListener(Iroh.CALL);
  let program = stage.addListener(Iroh.PROGRAM);
  let diagnostics: any[] = [];
  return new Promise((res, rej) => {
    listener.on("before", (e: any) => {
      if (rules.includes(e.call)) {
        // Makes evaluation safe
        e.call = () => code;
        diagnostics.push(e);
      }
      return;
    });
    // program
    program
      .on("leave", (e: any) => {
        res(diagnostics);
      });
    // ;) Don't worry mate, it is safe
    eval(stage.script);
  });
}

export interface RuntimeDiagnostics {
  typescriptDiagnostics?: Deno.DiagnosticItem;
  runtimeDiagnostics?: any;
}

export class Analyze {
  public sig: Function[];
  constructor(sig: Function[]) {
    this.sig = sig;
  }
  async analyze(code: string, typescript?: boolean) {
    let js: string = code;
    let typescriptDiagnostics = null;
    if (typescript) {
      const [diagnostics, emit] = await Deno.bundle(
        "/runtime.ts",
        {
          "/runtime.ts": code,
        },
      );
      typescriptDiagnostics = diagnostics;
      js = emit;
    }
    const config = {
      presets: [[babelPresetEnv, { targets: "> 0.25%, not dead" }]],
      plugins: [babelPluginTopAwait],
    };
    let out = babelCore.transform(js, config);
    const runtimeDiagnostics = await runtimeAnalyze(out.code, this.sig);
    return { typescriptDiagnostics, runtimeDiagnostics } as RuntimeDiagnostics;
  }
}
