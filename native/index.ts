import init, { source, analyze } from "../wasm/wasm.js";

await init(source);

console.log(analyze("Deno.run()"))