import { toFileURL, assertEquals } from "./deps.ts";

Deno.test({
  name: "dependency tree | toFileURL (windows)",
  ignore: Deno.build.os !== "windows",
  fn() {
    assertEquals(toFileURL("\\"), "file:///");
    assertEquals(toFileURL("\\home\\foo"), "file:///home/foo");
    assertEquals(toFileURL("\\home\\foo bar"), "file:///home/foo%20bar");
    assertEquals(toFileURL("\\%"), "file:///%25");
    assertEquals(toFileURL("C:\\"), "file:///C:/");
    assertEquals(toFileURL("C:\\Users\\"), "file:///C:/Users/");
    assertEquals(toFileURL("\\C:foo\\bar"), "file:///C:foo/bar");
  },
});

Deno.test({
  name: "dependency tree | toFileURL (posix)",
  fn() {
    assertEquals(toFileURL("/"), "file:///");
    assertEquals(toFileURL("/home/foo"), "file:///home/foo");
    assertEquals(toFileURL("/home/foo bar"), "file:///home/foo%20bar");
    assertEquals(toFileURL("/%"), "file:///%25");
    assertEquals(toFileURL("/C:"), "file:///C:");
    assertEquals(toFileURL("/C:/"), "file:///C:/");
    assertEquals(toFileURL("/C:/Users/"), "file:///C:/Users/");
    assertEquals(toFileURL("/C:foo/bar"), "file:///C:foo/bar");
  },
});
