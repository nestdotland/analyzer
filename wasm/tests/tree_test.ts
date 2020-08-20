import { Test, Tree } from "./deps.ts";

Test.testPlan("tree_test.ts", () => {
  Test.testSuite("static_analyze", () => {
    Test.testCase("basic imports", async () => {
      let deps = Tree("test.ts", `import * as x from "x.ts";`);
      Test.asserts.assertEquals(deps, [
        "x.ts",
      ]);
    });
  });
});

Test.run();
