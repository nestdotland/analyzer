import { analyze } from "../deno.ts";
import { assertEquals } from "./deps.ts";

Deno.test("tree #1 | basic import", () => {
  let deps = analyze(`Deno.run()`);
  assertEquals(deps, [
    {
      location: { filename: "test.ts", line: 1, col: 0 },
      message: "`Deno.run` call as function is not allowed",
      code: "no-deno-run",
      line_src: "Deno.run()",
      snippet_length: 10,
    },
  ]);
});
