import {
  fromFileUrl,
  isAbsolute,
  resolve,
} from "https://x.nest.land/std@0.61.0/path/mod.ts";
import init, {
  tree as extractDependencies,
  source,
} from "../analyzer_wasm/wasm.js";

const decoder = new TextDecoder("utf-8");

export type DependencyTree = Array<{
  path: string;
  imports: DependencyTree;
}>;

export interface IDependencyTree {
  tree: DependencyTree;
  circular: boolean;
  errors: Array<[string, unknown]>;
  count: number;
  iterator: IterableIterator<string>;
}

export interface TreeOptions {
  fullTree?: boolean;
  onImportFound?: (count: number) => void;
  onImportResolved?: (count: number) => void;
}

await init(source);

/** Build a dependency tree from a relative path or remote HTTP URL.
 * Analyses simultaneously the constructed tree. */
export async function dependencyTree(
  path: string,
  {
    fullTree = false,
    onImportFound = () => {},
    onImportResolved = () => {},
  }: TreeOptions = {},
): Promise<IDependencyTree> {
  const markedDependencies = new Map<string, DependencyTree>();

  const errors: Array<[string, unknown]> = [];
  let circular = false;
  let count = 0;

  let foundImportsCount = 0;
  let resolvedImportsCount = 0;

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
        onImportFound(++foundImportsCount);
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
        if (dep !== "[Circular]") count++;
        return createTree(dep, [url, ...parents]);
      });
    const settledDependencies = await Promise.allSettled(
      resolvedDependencies,
    );

    for (let i = 0; i < dependencies.length; i++) {
      onImportResolved(++resolvedImportsCount);
      const subTree = settledDependencies[i];

      if (subTree.status === "fulfilled") {
        depTree.push({
          path: dependencies[i],
          imports: subTree.value,
        });
      } else {
        errors.push([dependencies[i], subTree.reason]);
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
  return { tree, circular, count, iterator: markedDependencies.keys(), errors };
}

/* Converts a path string to a file URL. */
export function toFileURL(path: string, url = "") {
  if (url.match(/^file:\/\/\//) && (!isAbsolute(path))) {
    return new URL(path, url).href;
  }

  let resolvedPath = (isAbsolute(path) ? path : resolve(path))
    .replace(/\\/g, "/");

  // Windows drive letter must be prefixed with a slash
  if (resolvedPath[0] !== "/") {
    resolvedPath = `/${resolvedPath}`;
  }

  return encodeURI(`file://${resolvedPath}`).replace(
    /[?#]/g,
    encodeURIComponent,
  );
}

/* Resolves any path, relative or HTTP url. */
export function resolveURL(path: string, base = "") {
  if (path.match(/^https?:\/\//)) {
    return path;
  }
  if (base.match(/^https?:\/\//)) {
    return new URL(path, base).href;
  }
  return toFileURL(path, base);
}

/* Fetch data from file: or https: urls */
async function fetchData(url: string) {
  if (url.match(/^https?:\/\//)) {
    const data = await fetch(url);
    return data.text();
  }
  const data = await Deno.readFile(
    resolve(decodeURIComponent(fromFileUrl(url))),
  );
  return decoder.decode(data);
}
