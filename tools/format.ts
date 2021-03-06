const check = Deno.args.includes("--check");
console.log("rustfmt");

const checkArgs = check ? ["--check"] : [];

const p2 = await Deno.run({
  cmd: ["rustfmt", ...checkArgs, "analyzer_tree/lib.rs"],
  stdin: "null",
}).status();

if (p2.code !== 0) {
  throw new Error(
    `Failed: rustfmt ${check ? "--check" : ""} analyzer_tree/lib.rs`,
  );
}

console.log("deno fmt");

const p3 = await Deno.run({
  cmd: ["deno", "fmt", ...checkArgs, "tools/"],
  stdin: "null",
}).status();

if (p3.code !== 0) {
  throw new Error(`Failed: deno fmt ${check ? "--check" : ""} tools/`);
}
