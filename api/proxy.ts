/** Vercel's same-origin gateway. Business logic and storage remain in Cloudflare. */
export const config = { runtime: "edge" };
export default async function handler(request: Request): Promise<Response> {
  const origin = process.env.API_WORKER_ORIGIN;
  const secret = process.env.INTERNAL_PROXY_SECRET;
  const unavailable = () =>
    Response.json(
      {
        error:
          "The operations service is unavailable. Please try again shortly.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  if (!origin || !secret) return unavailable();
  let target: URL;
  try {
    target = new URL(origin);
    if (
      target.protocol !== "https:" ||
      target.username ||
      target.password ||
      target.pathname !== "/" ||
      target.search ||
      target.hash
    )
      return unavailable();
  } catch {
    return unavailable();
  }
  const url = new URL(request.url);
  // The rewrite supplies the original path. Never accept a user-controlled destination.
  const path = url.searchParams.get("path") || "";
  if (
    !/^(?:auth\/(?:me|login|register|logout)|workspace|health|(?:vessels|crew)(?:\/[a-f0-9-]{36})?(?:\/assignment)?)$/.test(
      path,
    )
  ) {
    return Response.json(
      { error: "Endpoint not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  target.pathname = `/api/${path}`;
  const headers = new Headers();
  for (const name of [
    "content-type",
    "content-length",
    "cookie",
    "origin",
    "idempotency-key",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("X-Ocean-Proxy-Secret", secret);
  // Vercel overwrites this trusted ingress header. Never forward X-Forwarded-For from clients.
  headers.set(
    "X-Ocean-Client-IP",
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
      "unknown",
  );
  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
    });
    if (response.status >= 300 && response.status < 400) return unavailable();
    const resultHeaders = new Headers();
    for (const name of [
      "content-type",
      "set-cookie",
      "x-request-id",
      "retry-after",
    ]) {
      const value = response.headers.get(name);
      if (value) resultHeaders.set(name, value);
    }
    resultHeaders.set("Cache-Control", "no-store");
    resultHeaders.set("X-Content-Type-Options", "nosniff");
    return new Response(response.body, {
      status: response.status,
      headers: resultHeaders,
    });
  } catch {
    return unavailable();
  }
}
