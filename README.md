# `nest_analyzer`

A Rust crate for analyzing broken and malicious JavaScript and TypeScript modules.

---

**NOTE**
Work-in-progress

Current Rules:

- [x] `ban-deno-run` - Report if module uses `Deno.run();`

## Contributing

- If you are going to work on an issue, mention so in the issue comments
  _before_ you start working on the issue.

- Please be professional in the forums. Have a problem? Email divy@nest.land

## Submitting a Pull Request

Before submitting, please make sure the following is done:

1. That there is a related issue and it is referenced in the PR text.
2. There are tests that cover the changes.
3. Ensure `cargo test` passes.
4. Format your code with `deno run --allow-run tools/format.ts`
5. Make sure `deno run --allow-run tools/lint.ts` passes.
