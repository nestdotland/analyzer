// File: deno_run_test.ts

import { Analyze, Test } from "./deps.ts";
import { FnRules as fnSig } from "../rules.ts";

let analyzer = new Analyze(fnSig);
let testCases = [
  { code: "Deno.openPlugin()", name: "Deno.openPlugin()" },
  { code: "Deno['openPlugin']()", name: "Deno['openPlugin']()" },
  { code: `const r = Deno.openPlugin; r();`, name: "Reassigned call" },
  {
    code: `function d() { return Deno; } d().openPlugin();`,
    name: "Wrapped inside a function",
  },
  {
    code: `[Deno][0].openPlugin(); [Deno][0]["openPlugin"]();`,
    name: "Arrayified call",
  },
  {
    code: `const {openPlugin} = Deno; openPlugin()`,
    name: "Destructured call",
  },
];

Test.testPlan("deno_plugin_test.ts", () => {
  Test.testSuite("analyze - javascript", () => {
    for (let i = 0; i < testCases.length; i++) {
      Test.testCase(testCases[i].name, async () => {
        let diagnostics = await analyzer.analyze(testCases[i].code);
        Test.asserts.assertEquals(
          diagnostics.runtimeDiagnostics[0].name,
          "openPlugin",
        );
        Test.asserts.assertEquals(
          diagnostics.runtimeDiagnostics[0].arguments,
          [],
        );
      });
    }
  });
  Test.testSuite("analyze - typescript", () => {
    for (let i = 0; i < testCases.length; i++) {
      Test.testCase(testCases[i].name, async () => {
        let diagnostics = await analyzer.analyze(testCases[i].code, true);
        Test.asserts.assertEquals(
          diagnostics.runtimeDiagnostics[0].name,
          "openPlugin",
        );
        Test.asserts.assertEquals(
          diagnostics.runtimeDiagnostics[0].arguments,
          [],
        );
      });
    }
  });
});

Test.run();
