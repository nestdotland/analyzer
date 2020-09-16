import { Test, Analyze } from "./deps.ts";

Test.testPlan("analyze_test.ts", () => {
  Test.testSuite("static_analyze", () => {
    Test.testCase("Deno.run()", async () => {
      let deps = await Analyze(`Deno.run({ cmd: "echo test".split(" ") })`);
      Test.asserts.assertEquals(deps, {
        static: [
          {
            location: { filename: "test.ts", line: 1, col: 0 },
            message: "`Deno.run` call as function is not allowed",
            code: "no-deno-run",
            line_src: `Deno.run({ cmd: "echo test".split(" ") })`,
            snippet_length: 41,
          },
        ],
        runtime: [],
      });
    });
  });
});

Test.run();
