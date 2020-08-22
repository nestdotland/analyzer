import {
  fromFileUrl,
  isAbsolute,
  resolve,
} from "https://x.nest.land/std@0.61.0/path/mod.ts";
import { setupTree } from "./src/setup.ts";

const decoder = new TextDecoder("utf-8");

/** Build a dependency tree from a relative path or remote HTTP URL.
 * Analyses simultaneously the constructed tree. */
export const dependencyTree = setupTree(fetchData, resolveURL);

/* Converts a path string to a file URL. */
export function fileURL(path: string, url = "") {
  if (url.match(/^file:\/\/\//) && (!isAbsolute(path))) {
    return new URL(path, url).href;
  }
  let resolvedPath = resolve(path).replace(/\\/g, "/");

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
  return fileURL(path, base);
}

/* Fetch data from file: or https: urls */
async function fetchData(url: string) {
  if (url.match(/^https?:\/\//)) {
    const data = await fetch(url);
    return data.text();
  }
  const data = await Deno.readFile(resolve(fromFileUrl(url)));
  return decoder.decode(data);
}
