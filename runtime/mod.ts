import Iroh from "./runtime.js";

let code = `
    let a = Deno.run;
    a({ cmd: ["echo", "hey"] })
    Deno.run({ cmd: "echo 2".split(" ") })
`;

async function runtimeAnalyze(code: string, rules: Function[]) {
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

await runtimeAnalyze(code, [Deno.run]);
