import { setupTree } from "./src/setup.ts";

/** Build a dependency tree from a remote HTTP URL.
 * Analyses simultaneously the constructed tree. */
export const dependencyTree = setupTree(fetchData, resolveURL);

/* Resolves any path, relative or HTTP url. */
export function resolveURL(path: string, base = "") {
  if (path.match(/^https?:\/\//)) {
    return path;
  }
  return new URL(path, base).href;
}

/* Fetch data from file: or https: urls */
async function fetchData(url: string) {
  const data = await fetch(url);
  return data.text();
}
