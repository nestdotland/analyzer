import { analyze } from "../../wasm/deno.ts";

let diagnostics = analyze(`
await Deno.run();
console.log("Something else");
await Deno.openPlugin();
`);

console.log("===Diagnostics===");
console.log(diagnostics);
