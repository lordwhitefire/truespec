import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { __resetConfigCacheForTests } from "./config";
import { __resetDbCacheForTests } from "./db";

const originalFetch = globalThis.fetch;
const MAIN = "postgresql://user:pass@main.example.invalid/db";
const DEMO = "postgresql://user:pass@demo.example.invalid/db";

type TestGlobals = {
  __TRUESPEC_TEST_SPACE__?: "main" | "demo";
  __TRUESPEC_TEST_THROW__?: boolean;
};

const fakeSpace = `data:text/javascript,${encodeURIComponent(`
  export const resolveSpace = async () => {
    if (globalThis.__TRUESPEC_TEST_THROW__) throw new Error("No signed-in user");
    return globalThis.__TRUESPEC_TEST_SPACE__;
  };
`)}`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./space" && context.parentURL?.includes("/lib/store-guard.ts")) {
      return { url: fakeSpace, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

function testGlobals(): TestGlobals {
  return globalThis as unknown as TestGlobals;
}

function setEnv() {
  process.env.DATABASE_URL = MAIN;
  process.env.DEMO_DATABASE_URL = DEMO;
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_123";
  process.env.CLERK_SECRET_KEY = "sk_test_123";
  process.env.SANITY_PROJECT_ID = "test";
  process.env.SANITY_DATASET = "test";
  process.env.SANITY_TOKEN = "test";
  process.env.SESSION_SECRET = "0123456789abcdef";
  __resetConfigCacheForTests();
  __resetDbCacheForTests();
}

function stubFetch(): string[] {
  const connections: string[] = [];
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    connections.push(headers.get("neon-connection-string") ?? "");
    return new Response(
      JSON.stringify({ fields: [], rows: [], command: "SELECT", rowCount: 0, rowAsArray: false }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  return connections;
}

test.beforeEach(() => {
  setEnv();
  testGlobals().__TRUESPEC_TEST_SPACE__ = "demo";
  testGlobals().__TRUESPEC_TEST_THROW__ = false;
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  delete testGlobals().__TRUESPEC_TEST_SPACE__;
  delete testGlobals().__TRUESPEC_TEST_THROW__;
});

test("a demo-resolved office request uses demo, never main", async () => {
  const connections = stubFetch();
  const { storeQuery } = await import("./store-guard");

  await storeQuery("SELECT 1");

  assert.equal(connections.length, 1);
  assert.match(connections[0], /@demo\.example\.invalid/);
  assert.doesNotMatch(connections[0], /@main\.example\.invalid/);
});

test("a main-resolved office request uses main", async () => {
  testGlobals().__TRUESPEC_TEST_SPACE__ = "main";
  const connections = stubFetch();
  const { storeQuery } = await import("./store-guard");

  await storeQuery("SELECT 1");

  assert.equal(connections.length, 1);
  assert.match(connections[0], /@main\.example\.invalid/);
});

test("an anonymous office request is refused before a store read", async () => {
  testGlobals().__TRUESPEC_TEST_THROW__ = true;
  let fetched = false;
  globalThis.fetch = async () => {
    fetched = true;
    throw new Error("the anonymous request must not reach a store");
  };
  const { storeQuery } = await import("./store-guard");

  await assert.rejects(() => storeQuery("SELECT 1"), /No signed-in user/);
  assert.equal(fetched, false);
});

test("the door reads no cookie, header or query parameter", () => {
  const source = readFileSync(new URL("./store-guard.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /\bcookies\s*\(/);
  assert.doesNotMatch(source, /\bheaders\s*\(/);
  assert.doesNotMatch(source, /searchParams/);
  assert.doesNotMatch(source, /getHeader/);
});
