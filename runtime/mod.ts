import Iroh from "./runtime.js";

export async function runtimeAnalyze(code: string, rules: Function[]): Promise<any> {
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
  })
}
