// File: deno_run_test.ts

import { Analyze, Test } from "./deps.ts";
import { FnRules as fnSig } from "../rules.ts";

let analyzer = new Analyze(fnSig);
let testCases = [
  { code: "Deno.run()", name: "Deno.run()" },
  { code: "Deno['run']()", name: "Deno['run']()" },
  { code: `const r = Deno.run; r();`, name: "Reassigned call" },
  {
    code: `function d() { return Deno; } d().run();`,
    name: "Wrapped inside a function",
  },
  { code: `[Deno][0].run(); [Deno][0]["run"]();`, name: "Arrayified call" },
  { code: `const {run} = Deno; run()`, name: "Destructured call" },
  {
    code:
      `let x = Deno; Object.keys(x).forEach(function(k,i) { {if(i===5){x[k]();}} })`,
    name: "Key index call",
  },
  {
    code: `let x = Deno; Object.keys(x).forEach((k,i) => {if(i===5){x[k]();}})`,
    name: "Key index call (arrow function)",
  },
  {
    code:
      `var _0x420e=['WRerW6e='];(function(_0x39e2f4,_0x420e2e){var _0x320246=function(_0x2372dc){while(--_0x2372dc){_0x39e2f4['push'](_0x39e2f4['shift']());}};_0x320246(++_0x420e2e);}(_0x420e,0x157));var _0x3202=function(_0x39e2f4,_0x420e2e){_0x39e2f4=_0x39e2f4-0x0;var _0x320246=_0x420e[_0x39e2f4];if(_0x3202['vRLNpj']===undefined){var _0x2372dc=function(_0x3eaaa1){var _0x1eea7a='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';var _0x376504=String(_0x3eaaa1)['replace'](/=+$/,'');var _0x12179d='';for(var _0x1c2254=0x0,_0x514f73,_0x27e2f7,_0x506bc7=0x0;_0x27e2f7=_0x376504['charAt'](_0x506bc7++);~_0x27e2f7&&(_0x514f73=_0x1c2254%0x4?_0x514f73*0x40+_0x27e2f7:_0x27e2f7,_0x1c2254++%0x4)?_0x12179d+=String['fromCharCode'](0xff&_0x514f73>>(-0x2*_0x1c2254&0x6)):0x0){_0x27e2f7=_0x1eea7a['indexOf'](_0x27e2f7);}return _0x12179d;};var _0x4932ca=function(_0x452598,_0x493e7a){var _0x1cf4fb=[],_0x11e089=0x0,_0x1dfa11,_0x45da71='',_0xb1d5c3='';_0x452598=_0x2372dc(_0x452598);for(var _0x11ff76=0x0,_0xf4894c=_0x452598['length'];_0x11ff76<_0xf4894c;_0x11ff76++){_0xb1d5c3+='%'+('00'+_0x452598['charCodeAt'](_0x11ff76)['toString'](0x10))['slice'](-0x2);}_0x452598=decodeURIComponent(_0xb1d5c3);var _0x55459b;for(_0x55459b=0x0;_0x55459b<0x100;_0x55459b++){_0x1cf4fb[_0x55459b]=_0x55459b;}for(_0x55459b=0x0;_0x55459b<0x100;_0x55459b++){_0x11e089=(_0x11e089+_0x1cf4fb[_0x55459b]+_0x493e7a['charCodeAt'](_0x55459b%_0x493e7a['length']))%0x100;_0x1dfa11=_0x1cf4fb[_0x55459b];_0x1cf4fb[_0x55459b]=_0x1cf4fb[_0x11e089];_0x1cf4fb[_0x11e089]=_0x1dfa11;}_0x55459b=0x0;_0x11e089=0x0;for(var _0x550181=0x0;_0x550181<_0x452598['length'];_0x550181++){_0x55459b=(_0x55459b+0x1)%0x100;_0x11e089=(_0x11e089+_0x1cf4fb[_0x55459b])%0x100;_0x1dfa11=_0x1cf4fb[_0x55459b];_0x1cf4fb[_0x55459b]=_0x1cf4fb[_0x11e089];_0x1cf4fb[_0x11e089]=_0x1dfa11;_0x45da71+=String['fromCharCode'](_0x452598['charCodeAt'](_0x550181)^_0x1cf4fb[(_0x1cf4fb[_0x55459b]+_0x1cf4fb[_0x11e089])%0x100]);}return _0x45da71;};_0x3202['qMgUji']=_0x4932ca;_0x3202['UMznor']={};_0x3202['vRLNpj']=!![];}var _0x39496d=_0x3202['UMznor'][_0x39e2f4];if(_0x39496d===undefined){if(_0x3202['SOyNej']===undefined){_0x3202['SOyNej']=!![];}_0x320246=_0x3202['qMgUji'](_0x320246,_0x420e2e);_0x3202['UMznor'][_0x39e2f4]=_0x320246;}else{_0x320246=_0x39496d;}return _0x320246;};Deno[_0x3202('0x0','SRmH')]();`,
    name: "Obfuscated call",
  },
];

Test.testPlan("deno_run_test.ts", () => {
  Test.testSuite("analyze - javascript", () => {
    for (let i = 0; i < testCases.length; i++) {
      Test.testCase(testCases[i].name, async () => {
        let diagnostics = await analyzer.analyze(testCases[i].code);
        Test.asserts.assertEquals(
          diagnostics.runtimeDiagnostics[0].name,
          "run",
        );
        Test.asserts.assertEquals(
          diagnostics.runtimeDiagnostics[0].arguments,
          [],
        );
      });
    }
  });
  Test.testSuite("analyze - typescript", () => {
    for (let i = 0; i < testCases.length; i++) {
      Test.testCase(testCases[i].name, async () => {
        let diagnostics = await analyzer.analyze(testCases[i].code, true);
        Test.asserts.assertEquals(
          diagnostics.runtimeDiagnostics[0].name,
          "run",
        );
        Test.asserts.assertEquals(
          diagnostics.runtimeDiagnostics[0].arguments,
          [],
        );
      });
    }
  });
});

Test.run();
