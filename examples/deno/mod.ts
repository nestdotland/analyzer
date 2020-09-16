import { analyze } from "../../mod.ts";

let diagnostics = await analyze(
  `
Deno.run({ cmd: "echo 2".split(" ")});
console.log("Something else");
`,
);

console.log("===Diagnostics===");
console.log(diagnostics);
