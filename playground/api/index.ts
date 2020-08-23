import { ServerRequest } from "https://deno.land/std@0.66.0/http/server.ts";
import {
  analyze,
  Diagnostics,
} from "https://raw.github.com/nestdotland/analyzer/master/deno/mod.ts";

export default async (req: ServerRequest) => {
  const buf: Uint8Array = await Deno.readAll(req.body);
  const src: string = new TextDecoder().decode(buf);
  try {
    let diagnostics: Diagnostics = await analyze(src, {
      runtime: true, // TODO(@divy-work): set this to false unless we are sure that evaluation is safe.
    });
    await req.respond({ body: JSON.stringify(diagnostics) });
  } catch (error) {
    await req.respond({ body: JSON.stringify({ error }) });
    throw new Error("Oops...");
  }
};
