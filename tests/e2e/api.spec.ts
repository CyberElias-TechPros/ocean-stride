import {
  test,
  expect,
  request as requestFactory,
  type APIRequestContext,
} from "@playwright/test";
import type { Workspace } from "../../shared/domain";
const origin = "http://localhost:8080";
const vessel = {
  name: "Test Pioneer",
  imo: "9074729",
  type: "Container ship",
  flag: "Panama",
  capacity: 1,
  status: "In port",
  destination: "Lagos",
};
const crew = {
  name: "Test Captain",
  email: "captain@example.com",
  rank: "Captain",
  nationality: "Nigeria",
  certificateExpiry: "2027-05-01",
};
async function account() {
  const request = await requestFactory.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const email = `test-${crypto.randomUUID()}@example.com`;
  const response = await request.post("/api/auth/register", {
    data: {
      name: "Test Owner",
      company: "Test Maritime",
      email,
      password: "A-long-test-passphrase-2026",
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  return { request, email };
}
async function workspace(request: APIRequestContext) {
  const response = await request.get("/api/workspace");
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as Workspace;
}
test("authentication, tenant isolation, CRUD, optimistic concurrency, capacity and audit integrity", async () => {
  const { request: a, email } = await account();
  const { request: b } = await account();
  expect((await workspace(a)).crew).toHaveLength(0);
  let response = await a.post("/api/vessels", { data: vessel });
  expect(response.status()).toBe(201);
  const { id: vesselId } = await response.json();
  expect((await b.get("/api/workspace")).status()).toBe(200);
  expect((await workspace(b)).vessels).toHaveLength(0);
  response = await b.put(`/api/vessels/${vesselId}`, {
    data: { ...vessel, version: 1, name: "Stolen" },
  });
  expect(response.status()).toBe(409);
  expect((await workspace(a)).vessels[0].name).toBe(vessel.name);
  expect((await a.post("/api/vessels", { data: vessel })).status()).toBe(409);
  expect(
    (
      await a.post("/api/vessels", { data: { ...vessel, imo: "invalid" } })
    ).status(),
  ).toBe(400);
  const c1 = await a.post("/api/crew", { data: crew });
  const { id: crewId } = await c1.json();
  expect(c1.status()).toBe(201);
  const c2 = await a.post("/api/crew", {
    data: { ...crew, name: "Second Person", email: "second@example.com" },
  });
  const { id: secondId } = await c2.json();
  expect(c2.status()).toBe(201);
  expect(
    (
      await a.put(`/api/crew/${crewId}/assignment`, {
        data: { vesselId, version: 1 },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await a.put(`/api/crew/${secondId}/assignment`, {
        data: { vesselId, version: 1 },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await a.delete(`/api/vessels/${vesselId}`, { data: { version: 1 } })
    ).status(),
  ).toBe(409);
  expect(
    (
      await a.put(`/api/vessels/${vesselId}`, {
        data: { ...vessel, name: "Updated Pioneer", version: 1 },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await a.put(`/api/vessels/${vesselId}`, {
        data: { ...vessel, version: 1 },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await a.put(`/api/crew/${crewId}/assignment`, {
        data: { vesselId: null, version: 2 },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await a.delete(`/api/vessels/${vesselId}`, { data: { version: 2 } })
    ).status(),
  ).toBe(200);
  expect(
    (await a.delete(`/api/crew/${crewId}`, { data: { version: 3 } })).status(),
  ).toBe(200);
  expect((await workspace(a)).activity.length).toBe(9);
  expect((await workspace(b)).activity).toHaveLength(1);
  expect((await a.post("/api/auth/logout", { data: {} })).status()).toBe(200);
  expect((await a.get("/api/workspace")).status()).toBe(401);
  expect(
    (
      await a.post("/api/auth/login", {
        data: { email, password: "wrong-password" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await a.post("/api/auth/login", {
        data: { email, password: "A-long-test-passphrase-2026" },
      })
    ).status(),
  ).toBe(200);
  const cookies = (await a.storageState()).cookies;
  expect(cookies[0].httpOnly).toBe(true);
  expect(cookies[0].sameSite).toBe("Lax");
  await a.dispose();
  await b.dispose();
});
test("rejects unauthorized requests, forged origins, malformed and oversized input", async ({
  request,
}) => {
  expect((await request.get("/api/workspace")).status()).toBe(401);
  expect(
    (
      await request.post("/api/auth/register", {
        headers: { Origin: "https://evil.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/auth/login", {
        headers: { Origin: origin, "Content-Type": "application/json" },
        data: "{",
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/auth/login", {
        headers: { Origin: origin },
        data: { password: "x".repeat(17000) },
      })
    ).status(),
  ).toBe(413);
  expect((await request.get("/api/health")).status()).toBe(200);
});
test("create retries are idempotent and concurrent assignments cannot overfill a vessel", async () => {
  const { request } = await account();
  const key = crypto.randomUUID();
  const headers = { "Idempotency-Key": key };
  const [first, second] = await Promise.all([
    request.post("/api/vessels", { headers, data: vessel }),
    request.post("/api/vessels", { headers, data: vessel }),
  ]);
  expect([200, 201]).toContain(first.status());
  expect([200, 201]).toContain(second.status());
  const { id: vesselId } = await first.json();
  expect((await second.json()).id).toBe(vesselId);
  expect((await workspace(request)).vessels).toHaveLength(1);
  expect((await workspace(request)).activity).toHaveLength(2);
  expect(
    (
      await request.post("/api/vessels", {
        headers,
        data: { ...vessel, name: "Different payload" },
      })
    ).status(),
  ).toBe(409);
  const one = await request.post("/api/crew", { data: crew });
  const two = await request.post("/api/crew", {
    data: { ...crew, email: "another@example.com" },
  });
  const ids = [(await one.json()).id, (await two.json()).id];
  const results = await Promise.all(
    ids.map((id) =>
      request.put(`/api/crew/${id}/assignment`, {
        data: { vesselId, version: 1 },
      }),
    ),
  );
  expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
  expect(
    (await workspace(request)).crew.filter((c) => c.vesselId),
  ).toHaveLength(1);
  await request.dispose();
});
test("authentication rate limit is enforced", async () => {
  const ip = `2001:db8:${Math.floor(Math.random() * 65535).toString(16)}:${Math.floor(Math.random() * 65535).toString(16)}::1`;
  const request = await requestFactory.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin, "CF-Connecting-IP": ip },
  });
  for (let i = 0; i < 30; i++)
    expect((await request.post("/api/auth/login", { data: {} })).status()).toBe(
      400,
    );
  expect((await request.post("/api/auth/login", { data: {} })).status()).toBe(
    429,
  );
  await request.dispose();
});
