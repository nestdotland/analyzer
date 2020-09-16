import { dependencyTree, toFileURL, Test, path } from "./deps.ts";

const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

const basicTree = await dependencyTree(
  path.join(__dirname, "./trees/tree_1.ts"),
);
const basicFullTree = await dependencyTree(
  path.join(__dirname, "./trees/tree_1.ts"),
  { fullTree: true },
);
const complexTree = await dependencyTree(
  path.join(__dirname, "./trees/tree_2.ts"),
  { fullTree: true },
);

Test.testPlan("dep_tree_test.ts", () => {
  Test.testSuite("Basic tree", () => {
    Test.testCase("Dependency count", () => {
      Test.asserts.assertEquals(basicTree.count, 6);
    });
    Test.testCase("No circular import", () => {
      Test.asserts.assertEquals(basicTree.circular, false);
    });
    Test.testCase("No import error", () => {
      Test.asserts.assertEquals(basicTree.errors.length, 0);
    });
    Test.testCase("Iterator", () => {
      const files = [
        "./trees/tree_1.ts",
        "./trees/tree_1/file_1.ts",
        "./trees/tree_1/file_2.ts",
        "./trees/tree_1/file_3.ts",
        "./trees/tree_1/file_4.ts",
        "./trees/tree_1/file_5.ts",
        "./trees/tree_1/file_6.ts",
      ];
      Test.asserts.assertEquals(
        new Set(basicTree.iterator),
        new Set(files.map((file) => toFileURL(path.join(__dirname, file)))),
      );
    });
  });

  Test.testSuite("Basic full tree", () => {
    Test.testCase("Dependency count", () => {
      Test.asserts.assertEquals(basicFullTree.count, 6);
    });
    Test.testCase("No circular import", () => {
      Test.asserts.assertEquals(basicFullTree.circular, false);
    });
    Test.testCase("No import error", () => {
      Test.asserts.assertEquals(basicFullTree.errors.length, 0);
    });
    Test.testCase("Iterator", () => {
      const files = [
        "./trees/tree_1.ts",
        "./trees/tree_1/file_1.ts",
        "./trees/tree_1/file_2.ts",
        "./trees/tree_1/file_3.ts",
        "./trees/tree_1/file_4.ts",
        "./trees/tree_1/file_5.ts",
        "./trees/tree_1/file_6.ts",
      ];
      Test.asserts.assertEquals(
        new Set(basicFullTree.iterator),
        new Set(files.map((file) => toFileURL(path.join(__dirname, file)))),
      );
    });
  });

  Test.testSuite("Complex tree", () => {
    Test.testCase("Dependency count", () => {
      Test.asserts.assertEquals(complexTree.count, 4);
    });
    Test.testCase("Circular import", () => {
      Test.asserts.assertEquals(complexTree.circular, true);
    });
    Test.testCase("Import error", () => {
      Test.asserts.assertEquals(complexTree.errors.length, 1);
    });
    Test.testCase("Iterator", () => {
      const files = [
        "./trees/tree_2.ts",
        "./trees/tree_2/file_1.ts",
        "./trees/tree_2/file_2.ts",
        "./trees/tree_2/file_3.ts",
        "./trees/tree_2/file_4.ts",
      ];
      Test.asserts.assertEquals(
        new Set(complexTree.iterator),
        new Set(files.map((file) => toFileURL(path.join(__dirname, file)))),
      );
    });
  });
});

Test.run();
