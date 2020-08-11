import { encode } from "https://deno.land/std@0.61.0/encoding/base64.ts";
import { compress } from "https://deno.land/x/lz4@v0.1.2/mod.ts";

const encoder = new TextEncoder();

async function requires(...executables: string[]) {
  const where = Deno.build.os === "windows" ? "where" : "which";

  for (const executable of executables) {
    const process = Deno.run({
      cmd: [where, executable],
      stderr: "null",
      stdin: "null",
      stdout: "null",
    });

    if (!(await process.status()).success) {
      err(`Could not find required build tool ${executable}`);
    }
  }
}

async function run(msg: string, cmd: string[]) {
  log(msg);

  const process = Deno.run({ cmd });

  if (!(await process.status()).success) {
    err(`${msg} failed`);
  }
}

function log(text: string): void {
  console.log(`[build log] ${text}`);
}

function err(text: string): never {
  console.log(`[build err] ${text}`);
  return Deno.exit(1);
}

await requires("rustup", "rustc", "cargo", "wasm-pack");

if (!(await Deno.stat("Cargo.toml")).isFile) {
  err(`the build script should be executed in the "wasm" root`);
}

await run(
  "build source",
  "cargo build --release --target wasm32-unknown-unknown".split(" "),
);

await run(
  "building using wasm-bindgen",
  // ["wasm-pack", "build", "--target", "no-modules", "--release", "./wasm"],
  "wasm-bindgen /media/divy/Data/data/Projects/nest_analyzer/wasm/target/wasm32-unknown-unknown/release/nest_analyzer_wasm.wasm --out-dir ./wasm/pkg --target deno"
    .split(" "),
);

const wasm = await Deno.readFile("wasm/pkg/nest_analyzer_wasm_bg.wasm");
const compressed = compress(wasm);
log(
  `compressed wasm using lz4, size reduction: ${wasm.length -
    compressed.length} bytes`,
);
const encoded = encode(compressed);
log(
  `encoded wasm using base64, size increase: ${encoded.length -
    compressed.length} bytes`,
);

log("inlining wasm in js");
const source = `import * as lz4 from "https://deno.land/x/lz4@v0.1.2/mod.ts";
                export const source = lz4.decompress(Uint8Array.from(atob("${encoded}"), c => c.charCodeAt(0)));`;

const init = await Deno.readTextFile("wasm/pkg/nest_analyzer_wasm.js");

log(`writing output to file ("wasm.js")`);
await Deno.writeFile("wasm.js", encoder.encode(`${source}\n${init}`));

const outputFile = await Deno.stat("wasm.js");
console.log(
  `[!] output file ("wasm.js"), final size is: ${outputFile.size} bytes`,
);
