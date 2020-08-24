import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'https://deno.land/x/lambda/mod.ts';
import { analyze, Diagnostics } from "https://raw.github.com/nestdotland/analyzer/master/deno/mod.ts";

export default async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult>  => {
  const src: string = String(event.body!)
  try {
    let diagnostics: Diagnostics = await analyze(src, {
      runtime: true,
    }
    );
    return { statusCode: 200, body: JSON.stringify(diagnostics) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error }) };
  }
};
