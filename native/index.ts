let wasm = await Deno.readFileSync(
  "./wasm/target/wasm32-wasi/release/nest_analyzer_wasm.wasm"
);

let { instance } = await WebAssembly.instantiate(wasm);

console.log(instance.exports.analyze("Deno.run()"));
