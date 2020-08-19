import { Analyze } from "./deps.ts";

export class FuncTest {
  public sig: Function;
  constructor(sig: Function) {
    this.sig = sig;
  }
  async analyze(code: string) {
    return await Analyze(code, [this.sig]);
  }
}
