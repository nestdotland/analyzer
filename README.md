# `nest_analyzer`

Analyze broken and malicious JavaScript and TypeScript modules.

![crates.io](https://img.shields.io/crates/v/nest_analyzer.svg)
![ci](https://github.com/nestdotland/analyzer/workflows/ci/badge.svg)
[![nest badge](https://nest.land/badge.svg)](https://nest.land/package/analyzer)

![flow](https://github.com/nestdotland/analyzer/raw/master/diagrams/analyzer.png)

## Usage

The analyzer is available for use in Deno. It comes with a default static analyzer and optional (but recommended) runtime analyzer.

```typescript
import { analyze } from "https://x.nest.land/analyzer@0.0.4/mod.ts";

// oh no! malicious!
const source_code = `Deno["run"]({ cmd: "shutdown now"})`

// analyzer to the rescue ;)
const diagnostics = await analyze(source_code);
```

## Architecture

nest_analyzer has a runtime and static analyzer.

#### Runtime analyzer

> The static code analzer was removed recently as module authors with malicious intent can obfuscate their function calls to bypass the static analyzer, it is not ideal to depend on it.

The runtime analyzer comes with the analyzer module published at nest.land

```typescript
import { analyze } from "https://x.nest.land/analyzer@0.0.4/mod.ts";

analyze(source_code, {
  runtime: true // enable the runtime analyzer
})
```

Rules are corresponding to the rules in the static analyzer.

Runtime analysis is a tideous process.

Typescript code is compiled and bundled to es6, which is then parsed into its AST.
AST nodes are injected with custom listeners using a fork of `Iroh.js`.
Finally the code is _safely_ evaluated and diagnostics are collected based on the inbuilt rules.

#### Static analyzer

The static analyzer uses Sauron to collect quality metrics. It is avaliable as a wasm module for use on the Web and Deno.
It collects diagnostics based on linting techniques, project structure, etc which can be used for calculation module score among other modules.

## Contributing

- If you are going to work on an issue, mention so in the issue comments
  _before_ you start working on the issue.

- Please be professional in the forums. Have a problem? Email divy@nest.land

## Submitting a Pull Request

Before submitting, please make sure the following is done:

1. That there is a related issue and it is referenced in the PR text.
2. There are tests that cover the changes.
3. Ensure `cargo test` and `deno test -A --unstable` passes.
4. Format your code with `deno run --allow-run tools/format.ts`
5. Make sure `deno run --allow-run tools/lint.ts` passes.
