import init, { source, analyze } from "../wasm.js";

await init(source);

console.log(analyze("Deno.run()"))