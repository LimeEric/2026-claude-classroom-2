// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { LibSQLStore } from "@mastra/libsql";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// lib/tutor.ts is `server-only`; the marker throws outside a React Server
// environment, and only the module's caching is under test here.
vi.mock("server-only", () => ({}));

type Tutor = typeof import("@/lib/tutor");
// The caches lib/tutor.ts keeps; Mastra wraps the store in a per-instance
// proxy, so `mastra.getStorage()` cannot show which store it was given.
const globals = globalThis as { mastraStorage?: LibSQLStore; mastra?: unknown };

let dir: string;

// A fresh module evaluation, which is what `next dev` does on a hot reload.
async function evaluate(): Promise<Tutor> {
  vi.resetModules();
  return import("@/lib/tutor");
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "tutor-test-"));
  vi.stubEnv("DATABASE_URL", `file:${path.join(dir, "test.db")}`);
});

afterEach(async () => {
  await globals.mastraStorage?.close();
  delete globals.mastraStorage;
  delete globals.mastra;
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe("lib/tutor across module re-evaluations", () => {
  test("development rebuilds the agent but keeps the cached store", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const first = await evaluate();
    const store = globals.mastraStorage;
    const second = await evaluate();

    expect(store).toBeDefined();
    expect(globals.mastraStorage).toBe(store);
    expect(second.mastra).not.toBe(first.mastra);
    expect(second.mastra.getAgentById(second.TUTOR_AGENT_ID)).not.toBe(
      first.mastra.getAgentById(first.TUTOR_AGENT_ID),
    );
  });

  test("production keeps the one cached instance", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const first = await evaluate();
    const second = await evaluate();

    expect(second.mastra).toBe(first.mastra);
  });
});
