import init, {
  tree as extractDependencies,
} from "https://raw.githubusercontent.com/nestdotland/analyzer/master/wasm/pkg/nest_analyzer_wasm.js";

await init();

/**
 * Build a dependency tree from a relative path or remote HTTP URL.
 * Analyses simultaneously the constructed tree.
 * @param {string} path 
 * @param {{ fullTree: boolean }} options 
 * @returns {Promise<{
    tree: DependencyTree;
    circular: boolean;
    count: number;
    iterator: IterableIterator<string>;
  }>}
 */
export async function dependencyTree(path, options = { fullTree: false }) {
  const markedDependencies = new Map();

  const { fullTree } = options;

  let circular = false;
  let count = 0;

  async function createTree(url, parents = []) {
    if (url.match(/^\[(Circular|Error|Redundant)/)) {
      return [{
        path: url,
        imports: [],
      }];
    }

    const depTree = [];
    markedDependencies.set(url, depTree);

    const src = await fetchData(url);

    const dependencies = extractDependencies("", src)
      .map((dep) => resolveURL(dep, url));

    const resolvedDependencies = dependencies
      .map((dep) => {
        if (parents.includes(dep)) {
          circular = true;
          return "[Circular]";
        }
        return dep;
      })
      .map((dep) => {
        if (markedDependencies.has(dep)) {
          return fullTree
            ? Promise.resolve(markedDependencies.get(dep))
            : createTree("[Redundant]");
        }
        count++;
        return createTree(dep, [url, ...parents]);
      });
    const settledDependencies = await Promise.allSettled(
      resolvedDependencies,
    );

    for (let i = 0; i < dependencies.length; i++) {
      const subTree = settledDependencies[i];

      if (subTree.status === "fulfilled") {
        depTree.push({
          path: dependencies[i],
          imports: subTree.value,
        });
      } else {
        depTree.push({
          path: dependencies[i],
          imports: [{
            path: `[Error: ${subTree.reason}]`,
            imports: [],
          }],
        });
      }
    }

    return depTree;
  }

  const url = resolveURL(path);
  const tree = [{
    path: url,
    imports: await createTree(url),
  }];
  return { tree, circular, count, iterator: markedDependencies.keys() };
} /* Resolves any path, relative or HTTP url. */

export function resolveURL(path, base = "") {
  if (path.match(/^https?:\/\//)) {
    return path;
  }
  return new URL(path, base).href;
}

/* Fetch data from file: or https: urls */
async function fetchData(url) {
  const data = await fetch(url);
  return data.text();
}
