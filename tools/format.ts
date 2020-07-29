const check = Deno.args.includes("--check");
console.log("rustfmt");

const checkArgs = check ? ["--check"] : [];

const p2 = await Deno.run({
  cmd: ["rustfmt", ...checkArgs],
  stdin: "null",
}).status();

if (p2.code !== 0) {
  throw new Error(`Failed: rustfmt ${check ? "--check" : ""}`);
}

console.log("deno fmt");

const p3 = await Deno.run({
  cmd: ["deno", "fmt", ...checkArgs, "tools/"],
  stdin: "null",
}).status();

if (p3.code !== 0) {
  throw new Error(`Failed: deno fmt ${check ? "--check" : ""} tools/`);
}
