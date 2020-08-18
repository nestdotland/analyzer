import Iroh from "./runtime.js";

export async function runtimeAnalyze(code: string, rules: Function[]) {
  let stage = new Iroh.Stage(code);
  let listener = stage.addListener(Iroh.CALL);

  listener.on("before", (e: any) => {
    if (rules.includes(e.call)) {
      console.log(e);
      let args = e.arguments;
      // Makes evaluation safe
      e.call = () => code;
    }
  });

  // ;) Don't worry mate, it is safe
  eval(stage.script);
}
