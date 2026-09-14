import { z } from "zod";
import {
  vesselSchema,
  crewSchema,
  loginSchema,
  registrationSchema,
} from "../shared/domain";
interface Env {
  DB: D1Database;
  APP_ORIGIN: string;
  ENVIRONMENT: string;
  INTERNAL_PROXY_SECRET?: string;
}
interface Identity {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  company: string;
}
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const enc = new TextEncoder();
const hex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
const digest = async (s: string) =>
  hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
export async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: enc.encode(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      key,
      256,
    ),
  );
}
function equal(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}
async function body(request: Request) {
  if (Number(request.headers.get("Content-Length")) > 16384)
    throw new ApiError(413, "Request too large");
  if (!request.headers.get("Content-Type")?.includes("application/json"))
    throw new ApiError(415, "Use application/json");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Request body required");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) {
      await reader.cancel();
      throw new ApiError(413, "Request too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, "Invalid JSON");
  }
}
function token(request: Request) {
  return request.headers
    .get("Cookie")
    ?.match(/(?:^|;\s*)os_session=([a-f0-9]{64})(?:;|$)/)?.[1];
}
async function identity(request: Request, env: Env): Promise<Identity> {
  const raw = token(request);
  if (!raw) throw new ApiError(401, "Please sign in to continue");
  const user = await env.DB.prepare(
    "SELECT u.id,u.organization_id,u.name,u.email,o.name company FROM sessions s JOIN users u ON s.user_id=u.id JOIN organizations o ON o.id=u.organization_id WHERE s.token_hash=? AND s.expires_at>?",
  )
    .bind(await digest(raw), Date.now())
    .first<Identity>();
  if (!user)
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  return user;
}
function userInfo(u: Identity) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    company: u.company,
    role: "admin",
  };
}
function cookie(value: string, env: Env, maxAge = 604800) {
  return `os_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${env.ENVIRONMENT === "production" ? "; Secure" : ""}`;
}
async function rateLimit(request: Request, env: Env) {
  const ip =
    (env.ENVIRONMENT === "production"
      ? request.headers.get("X-Ocean-Client-IP")
      : request.headers.get("CF-Connecting-IP")) || "local";
  const window = Math.floor(Date.now() / 600000);
  const key = await digest(ip + ":" + window);
  const row = await env.DB.prepare(
    "INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
  )
    .bind(key, (window + 1) * 600000)
    .first<{ count: number }>();
  if (row!.count > 30)
    throw new ApiError(
      429,
      "Too many attempts. Please try again in 10 minutes.",
    );
}
function originAllowed(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  if (origin === env.APP_ORIGIN) return true;
  if (env.ENVIRONMENT === "development") {
    try {
      const url = new URL(origin);
      return (
        ["localhost", "127.0.0.1"].includes(url.hostname) ||
        url.hostname.endsWith(".e2b.app")
      );
    } catch {
      return false;
    }
  }
  return false;
}
function audit(env: Env, org: string, message: string) {
  return env.DB.prepare(
    "INSERT INTO activity(id,organization_id,message) VALUES (?,?,?)",
  ).bind(crypto.randomUUID(), org, message);
}
async function route(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (
    env.ENVIRONMENT === "production" &&
    (!env.INTERNAL_PROXY_SECRET ||
      !equal(
        request.headers.get("X-Ocean-Proxy-Secret") || "",
        env.INTERNAL_PROXY_SECRET,
      ))
  )
    throw new ApiError(403, "Gateway authorization required");
  if (method !== "GET" && !originAllowed(request, env))
    throw new ApiError(403, "Request origin is not allowed");
  if (path === "/api/health" && method === "GET") {
    await env.DB.prepare("SELECT 1").first();
    return json({ status: "ok", storage: "Cloudflare D1" });
  }
  if (
    ["/api/auth/register", "/api/auth/login"].includes(path) &&
    method === "POST"
  ) {
    await rateLimit(request, env);
    const input = await body(request);
    let u: Identity;
    if (path.endsWith("register")) {
      const data = registrationSchema.parse(input);
      const org = crypto.randomUUID();
      const id = crypto.randomUUID();
      const salt = crypto.randomUUID();
      const password = await hashPassword(data.password, salt);
      await env.DB.batch([
        env.DB.prepare("INSERT INTO organizations(id,name) VALUES (?,?)").bind(
          org,
          data.company,
        ),
        env.DB.prepare(
          "INSERT INTO users(id,organization_id,name,email,password_hash,salt) VALUES (?,?,?,?,?,?)",
        ).bind(id, org, data.name, data.email, password, salt),
        audit(env, org, "Workspace created"),
      ]);
      u = {
        id,
        organization_id: org,
        name: data.name,
        email: data.email,
        company: data.company,
      };
    } else {
      const data = loginSchema.parse(input);
      const found = await env.DB.prepare(
        "SELECT u.*,o.name company FROM users u JOIN organizations o ON o.id=u.organization_id WHERE u.email=?",
      )
        .bind(data.email)
        .first<Identity & { password_hash: string; salt: string }>();
      const calculated = await hashPassword(
        data.password,
        found?.salt || "unregistered-user-salt",
      );
      if (!found || !equal(calculated, found.password_hash))
        throw new ApiError(401, "Email or password is incorrect");
      u = found;
    }
    const raw = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
    const old = token(request);
    if (old)
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
        .bind(await digest(old))
        .run();
    await env.DB.prepare(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)",
    )
      .bind(await digest(raw), u.id, Date.now() + 604800000)
      .run();
    return json({ user: userInfo(u) }, 200, { "Set-Cookie": cookie(raw, env) });
  }
  if (path === "/api/auth/logout" && method === "POST") {
    const raw = token(request);
    if (raw)
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
        .bind(await digest(raw))
        .run();
    return json({ ok: true }, 200, { "Set-Cookie": cookie("", env, 0) });
  }
  const u = await identity(request, env);
  const org = u.organization_id;
  if (path === "/api/auth/me" && method === "GET")
    return json({ user: userInfo(u) });
  if (path === "/api/workspace" && method === "GET") {
    const [vessels, crew, activity] = await env.DB.batch([
      env.DB.prepare(
        "SELECT id,name,imo,type,flag,capacity,status,destination,version,created_at createdAt FROM vessels WHERE organization_id=? ORDER BY created_at DESC,id",
      ).bind(org),
      env.DB.prepare(
        "SELECT id,name,email,rank,nationality,certificate_expiry certificateExpiry,vessel_id vesselId,version,created_at createdAt FROM crew WHERE organization_id=? ORDER BY created_at DESC,id",
      ).bind(org),
      env.DB.prepare(
        "SELECT id,message,created_at createdAt FROM activity WHERE organization_id=? ORDER BY created_at DESC,id DESC LIMIT 100",
      ).bind(org),
    ]);
    return json({
      vessels: vessels.results,
      crew: crew.results,
      activity: activity.results,
    });
  }
  const match = path.match(
    /^\/api\/(vessels|crew)(?:\/([a-f0-9-]{36}))?(?:\/(assignment))?$/,
  );
  if (!match) throw new ApiError(404, "Endpoint not found");
  const [, kind, id, assignment] = match;
  const table = kind === "vessels" ? "vessels" : "crew";
  if (assignment) {
    if (kind !== "crew" || method !== "PUT")
      throw new ApiError(405, "Method not allowed");
    const data = z
      .object({
        vesselId: z.string().uuid().nullable(),
        version: z.number().int().positive(),
      })
      .parse(await body(request));
    if (data.vesselId) {
      const vessel = await env.DB.prepare(
        "SELECT id FROM vessels WHERE id=? AND organization_id=? AND status!=?",
      )
        .bind(data.vesselId, org, "Maintenance")
        .first();
      if (!vessel)
        throw new ApiError(400, "Choose an available vessel in your workspace");
    }
    const [result] = await env.DB.batch([
      env.DB.prepare(
        "UPDATE crew SET vessel_id=?,version=version+1 WHERE id=? AND organization_id=? AND version=?",
      ).bind(data.vesselId, id, org, data.version),
      env.DB.prepare(
        "INSERT INTO activity(id,organization_id,message) SELECT ?,?,? WHERE changes()>0",
      ).bind(
        crypto.randomUUID(),
        org,
        data.vesselId ? "Crew assignment updated" : "Crew member signed off",
      ),
    ]);
    if (!result.meta.changes)
      throw new ApiError(
        409,
        "Record changed or no longer exists. Refresh and try again.",
      );
    return json({ ok: true });
  }
  if (method === "POST" && !id) {
    const input = await body(request);
    const newId = crypto.randomUUID();
    let statement: D1PreparedStatement;
    let name: string;
    const key = z
      .string()
      .uuid()
      .parse(request.headers.get("Idempotency-Key") || crypto.randomUUID());
    const parsed =
      kind === "vessels" ? vesselSchema.parse(input) : crewSchema.parse(input);
    const requestHash = await digest(kind + JSON.stringify(parsed));
    const previous = () =>
      env.DB.prepare(
        "SELECT request_hash,response_id FROM idempotency_keys WHERE organization_id=? AND key=? AND expires_at>?",
      )
        .bind(org, key, Date.now())
        .first<{ request_hash: string; response_id: string }>();
    const existing = await previous();
    if (existing) {
      if (existing.request_hash !== requestHash)
        throw new ApiError(
          409,
          "This request was already used with different details. Reopen the form.",
        );
      return json({ id: existing.response_id });
    }
    if (kind === "vessels") {
      const d = vesselSchema.parse(input);
      name = d.name;
      statement = env.DB.prepare(
        "INSERT INTO vessels(id,organization_id,name,imo,type,flag,capacity,status,destination) VALUES (?,?,?,?,?,?,?,?,?)",
      ).bind(
        newId,
        org,
        d.name,
        d.imo,
        d.type,
        d.flag,
        d.capacity,
        d.status,
        d.destination,
      );
    } else {
      const d = crewSchema.parse(input);
      name = d.name;
      statement = env.DB.prepare(
        "INSERT INTO crew(id,organization_id,name,email,rank,nationality,certificate_expiry) VALUES (?,?,?,?,?,?,?)",
      ).bind(
        newId,
        org,
        d.name,
        d.email.toLowerCase(),
        d.rank,
        d.nationality,
        d.certificateExpiry,
      );
    }
    try {
      await env.DB.batch([
        statement,
        audit(
          env,
          org,
          `${kind === "vessels" ? "Vessel" : "Crew member"} added · ${name}`,
        ),
        env.DB.prepare(
          "INSERT INTO idempotency_keys(organization_id,key,request_hash,response_id,expires_at) VALUES (?,?,?,?,?)",
        ).bind(org, key, requestHash, newId, Date.now() + 604800000),
      ]);
    } catch (error) {
      const saved = await previous();
      if (saved && saved.request_hash === requestHash)
        return json({ id: saved.response_id });
      throw error;
    }
    return json({ id: newId }, 201);
  }
  if (method === "PUT" && id) {
    const input = await body(request);
    const version = z
      .object({ version: z.number().int().positive() })
      .parse(input).version;
    let statement: D1PreparedStatement;
    let name: string;
    if (kind === "vessels") {
      const d = vesselSchema.parse(input);
      name = d.name;
      statement = env.DB.prepare(
        "UPDATE vessels SET name=?,imo=?,type=?,flag=?,capacity=?,status=?,destination=?,version=version+1 WHERE id=? AND organization_id=? AND version=?",
      ).bind(
        d.name,
        d.imo,
        d.type,
        d.flag,
        d.capacity,
        d.status,
        d.destination,
        id,
        org,
        version,
      );
    } else {
      const d = crewSchema.parse(input);
      name = d.name;
      statement = env.DB.prepare(
        "UPDATE crew SET name=?,email=?,rank=?,nationality=?,certificate_expiry=?,version=version+1 WHERE id=? AND organization_id=? AND version=?",
      ).bind(
        d.name,
        d.email.toLowerCase(),
        d.rank,
        d.nationality,
        d.certificateExpiry,
        id,
        org,
        version,
      );
    }
    const [result] = await env.DB.batch([
      statement,
      env.DB.prepare(
        "INSERT INTO activity(id,organization_id,message) SELECT ?,?,? WHERE changes()>0",
      ).bind(crypto.randomUUID(), org, `Record updated · ${name}`),
    ]);
    if (!result.meta.changes)
      throw new ApiError(
        409,
        "Record changed or no longer exists. Refresh and try again.",
      );
    return json({ ok: true });
  }
  if (method === "DELETE" && id) {
    const version = z
      .object({ version: z.number().int().positive() })
      .parse(await body(request)).version;
    const [result] = await env.DB.batch([
      env.DB.prepare(
        `DELETE FROM ${table} WHERE id=? AND organization_id=? AND version=?`,
      ).bind(id, org, version),
      env.DB.prepare(
        "INSERT INTO activity(id,organization_id,message) SELECT ?,?,? WHERE changes()>0",
      ).bind(
        crypto.randomUUID(),
        org,
        `${kind === "vessels" ? "Vessel" : "Crew member"} removed · ${id}`,
      ),
    ]);
    if (!result.meta.changes)
      throw new ApiError(
        409,
        "Record changed or no longer exists. Refresh and try again.",
      );
    return json({ ok: true });
  }
  throw new ApiError(405, "Method not allowed");
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    let response: Response;
    try {
      if (
        env.ENVIRONMENT === "production" &&
        env.APP_ORIGIN.includes("REPLACE")
      )
        throw new ApiError(503, "Service configuration is incomplete");
      response = await route(request, env);
    } catch (error) {
      let status = 500;
      let message = "Something went wrong. Please retry.";
      if (error instanceof ApiError) {
        status = error.status;
        message = error.message;
      } else if (error instanceof z.ZodError) {
        status = 400;
        message = error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
      } else if (error instanceof Error) {
        if (error.message.includes("UNIQUE constraint")) {
          status = 409;
          message = "A record with these details already exists.";
        } else if (error.message.includes("FOREIGN KEY constraint")) {
          status = 409;
          message = "Sign off assigned crew before removing this vessel.";
        } else if (error.message.includes("Vessel unavailable")) {
          status = 409;
          message = "This vessel is unavailable for new assignments.";
        } else if (
          error.message.includes("capacity") ||
          error.message.includes("Capacity")
        ) {
          status = 409;
          message =
            "Vessel capacity conflict. Check crew assignments and capacity.";
        }
      }
      if (status === 500)
        console.error(
          JSON.stringify({
            requestId,
            event: "api_error",
            path: new URL(request.url).pathname,
          }),
        );
      response = json({ error: message, requestId }, status);
    }
    response.headers.set("X-Request-Id", requestId);
    response.headers.set("X-Frame-Options", "DENY");
    return response;
  },
  async scheduled(_event: ScheduledController, env: Env) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE expires_at<?").bind(
        Date.now(),
      ),
      env.DB.prepare("DELETE FROM rate_limits WHERE expires_at<?").bind(
        Date.now(),
      ),
      env.DB.prepare("DELETE FROM idempotency_keys WHERE expires_at<?").bind(
        Date.now(),
      ),
    ]);
  },
} satisfies ExportedHandler<Env>;
