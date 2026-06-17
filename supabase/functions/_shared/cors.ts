// CORS locked to the app origin(s). A wildcard would let any site script the paid
// endpoint with a stolen JWT, so set ALLOWED_ORIGIN to your real domain(s) in secrets.
const ALLOWED = (Deno.env.get("ALLOWED_ORIGIN") ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}
