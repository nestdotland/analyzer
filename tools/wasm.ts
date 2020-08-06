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
  "building using wasm-pack",
  ["wasm-pack", "build", "--target", "web", "--release", "./wasm"],
);

const wasm = await Deno.readFile("pkg/nest_analyzer_bg.wasm");

log("inlining wasm in js");
const source = `export const source = ${wasm};`;

const init = await Deno.readTextFile("pkg/nest_analyzer.js");

log(`writing output to file ("wasm.js")`);
await Deno.writeFile("wasm.js", encoder.encode(`${source}\n${init}`));

const outputFile = await Deno.stat("wasm.js");
console.log(
  `[!] output file ("wasm.js"), final size is: ${outputFile.size} bytes`,
);
