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

const source_code = `Deno.run({ cmd: "shutdown now"})` // oh no! malicious!

// analyzer to the rescue ;)
const diagnostics = await analyze(source_code, {
  runtime: true,
});
```

## Architecture

nest_analyzer has a runtime and static analyzer.

#### Static analyzer

The static analyzer is available as a rust crate and wasm module for use in the web and deno.

Rules:

- [x] `ban-deno-run` - Report if module uses `Deno.run();`
- [x] `ban-deno-plugin` - Report if module uses `Deno.openPlugin();`

Dynamic rules:

- [x] `check-deno-run` - Check if the given command is executed with `Deno.run();`

The static analyzer merely scans the AST and collects basic diagnostics.
For example:

```typescript
Deno.run();
// catched by the static analyzer

Deno["run"]();
// undetected by the static analyzer
```

Since module authors will malicious intent can also obfuscate their function calls to bypass the static analyzer, it is not ideal to depend on it.

Therefore, we have a **runtime analyzer**

#### Runtime analyzer

The runtime analyzer comes with the analyzer module published at nest.land

```typescript
import { analyze } from "https://x.nest.land/analyzer@0.0.4/mod.ts";

analyze(source_code, {
  runtime: true // enable the runtime analyzer
})
```

Rules are corresponding to the rules in the static analyzer.

The runtime analysis is a tideous process.

The code is compiled to `acorn-js` compatible using `Deno.bundle` followed by `babel`.

AST nodes are injected with custom listeners using a fork of `Iroh.js`.
Finally the code is _safely_ evaluated and diagnostics are collected based on the inbuilt rules.

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
