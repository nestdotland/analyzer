import { analyze } from "../mod.ts";
import { Command } from "./deps.ts";

const result = await new Command()
  .arguments("<input:string>")
  .parse(Deno.args);

const input: string = result.args[0];

const src: string = await Deno.readTextFile(input);
console.log(src);
let diagnostics = await analyze(
  src,
);

console.log("===Diagnostics===");
console.log(diagnostics);
