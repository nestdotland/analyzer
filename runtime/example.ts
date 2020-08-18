import { runtimeAnalyze } from "./mod.ts";

let code = `
let a = Deno.run;
a({ cmd: ["echo", "hey"] })
Deno.run({ cmd: "echo 2".split(" ") })
`;

await runtimeAnalyze(code, [Deno.run]);
