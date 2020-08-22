import { tree as extractDependencies } from "../../wasm.ts";

export type DependencyTree = Array<{
  path: string;
  imports: DependencyTree;
}>;

export interface IDependencyTree {
  tree: DependencyTree;
  circular: boolean;
  count: number;
  iterator: IterableIterator<string>;
}

export interface TreeOptions {
  fullTree: boolean;
}

/** Build a dependency tree from a relative path or remote HTTP URL.
 * Analyses simultaneously the constructed tree. */
export function setupTree(
  fetchData: (url: string) => Promise<string>,
  resolveURL: (path: string, base?: string) => string,
) {
  return async function dependencyTree(
    path: string,
    options: TreeOptions = { fullTree: false },
  ): Promise<IDependencyTree> {
    const markedDependencies = new Map<string, DependencyTree>();

    const { fullTree } = options;

    let circular = false;
    let count = 0;

    async function createTree(
      url: string,
      parents: string[] = [],
    ): Promise<DependencyTree> {
      if (url.match(/^\[(Circular|Error|Redundant)/)) {
        return [{
          path: url,
          imports: [],
        }];
      }

      const depTree: DependencyTree = [];
      markedDependencies.set(url, depTree);

      const src = await fetchData(url);

      const dependencies: string[] = extractDependencies("", src)
        .map((dep: string) => resolveURL(dep, url));

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
              ? Promise.resolve(markedDependencies.get(dep) as DependencyTree)
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
  };
}
