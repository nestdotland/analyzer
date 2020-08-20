import "https://cdn.jsdelivr.net/npm/javascript-obfuscator/dist/index.browser.js";

export function obfuscator(code: string = Deno.args[0]) {
  // @ts-ignore
  let obfuscationResult = window.JavaScriptObfuscator.obfuscate(code, {
    compact: false,
    controlFlowFlattening: true,
    numbersToExpressions: true,
    simplify: true,
    shuffleStringArray: true,
    splitStrings: true,
  }).getObfuscatedCode();
  console.log(obfuscationResult);
}

obfuscator();
