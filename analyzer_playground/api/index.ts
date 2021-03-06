import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "https://deno.land/x/lambda/mod.ts";
import {
  analyze,
} from "https://raw.github.com/nestdotland/analyzer/master/mod.ts";

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> {
  const src: string = atob(JSON.parse(event.body!).body);
  try {
    let diagnostics = await analyze(src);
    return { statusCode: 200, body: JSON.stringify(diagnostics) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error }) };
  }
}
