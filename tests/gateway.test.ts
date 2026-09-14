import { afterEach, describe, it, expect, vi } from "vitest";
import gateway from "../api/proxy";
import worker from "../worker/index";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Vercel gateway", () => {
  it("fails closed without production configuration", async () => {
    vi.stubEnv("API_WORKER_ORIGIN", "");
    vi.stubEnv("INTERNAL_PROXY_SECRET", "");
    expect(
      (
        await gateway(
          new Request("https://app.example/api/proxy?path=workspace"),
        )
      ).status,
    ).toBe(503);
  });
  it("rejects invalid upstream URLs and path injection", async () => {
    vi.stubEnv("INTERNAL_PROXY_SECRET", "test-secret");
    vi.stubEnv("API_WORKER_ORIGIN", "http://127.0.0.1");
    expect(
      (
        await gateway(
          new Request("https://app.example/api/proxy?path=workspace"),
        )
      ).status,
    ).toBe(503);
    vi.stubEnv("API_WORKER_ORIGIN", "https://worker.example");
    expect(
      (
        await gateway(
          new Request("https://app.example/api/proxy?path=../../private"),
        )
      ).status,
    ).toBe(404);
  });
  it("forwards only allowlisted headers, preserves session cookies, and disables caching", async () => {
    vi.stubEnv("API_WORKER_ORIGIN", "https://worker.example");
    vi.stubEnv("INTERNAL_PROXY_SECRET", "test-secret");
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response('{"ok":true}', {
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": "os_session=abc; HttpOnly; Secure",
            "X-Request-Id": "test-id",
          },
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const response = await gateway(
      new Request("https://app.example/api/proxy?path=auth/login", {
        method: "POST",
        headers: {
          Origin: "https://app.example",
          "Content-Type": "application/json",
          "X-Ocean-Proxy-Secret": "attacker",
          "X-Forwarded-For": "attacker",
          "x-vercel-forwarded-for": "192.0.2.1",
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const [url, options] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://worker.example/api/auth/login");
    expect(options.headers.get("X-Ocean-Proxy-Secret")).toBe("test-secret");
    expect(options.headers.get("X-Ocean-Client-IP")).toBe("192.0.2.1");
    expect(options.headers.has("X-Forwarded-For")).toBe(false);
  });
  it("does not follow upstream redirects or leak errors", async () => {
    vi.stubEnv("API_WORKER_ORIGIN", "https://worker.example");
    vi.stubEnv("INTERNAL_PROXY_SECRET", "test-secret");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, {
            status: 302,
            headers: { Location: "https://evil.example" },
          }),
        ),
    );
    expect(
      (
        await gateway(
          new Request("https://app.example/api/proxy?path=workspace"),
        )
      ).status,
    ).toBe(503);
  });
});
describe("production Worker gateway boundary", () => {
  it("rejects direct traffic without a valid shared secret before querying D1", async () => {
    const DB = { prepare: vi.fn() } as unknown as D1Database;
    const response = await worker.fetch(
      new Request("https://worker.example/api/workspace"),
      {
        DB,
        APP_ORIGIN: "https://app.example",
        ENVIRONMENT: "production",
        INTERNAL_PROXY_SECRET: "production-test-secret",
      },
    );
    expect(response.status).toBe(403);
    expect(DB.prepare).not.toHaveBeenCalled();
  });
});
