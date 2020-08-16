import { tree } from "../deno.ts";
import { assertEquals } from "./deps.ts";

Deno.test("tree #1 | basic import", () => {
  let deps = tree("test.ts", `import * as x from "x.ts";`);
  assertEquals(deps, [
    "x.ts",
  ]);
});
