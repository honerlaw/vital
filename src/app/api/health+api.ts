/**
 * Health-check endpoint. Doubles as the DigitalOcean App Platform health probe
 * (see .do/app.yaml `health_check.http_path`) and a post-deploy smoke test.
 */
export function GET(): Response {
  return Response.json({ status: 'ok' });
}
