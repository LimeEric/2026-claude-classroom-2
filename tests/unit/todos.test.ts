// @vitest-environment node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RequestContext } from "@mastra/core/request-context";
import { noopObserve } from "@mastra/core/tools";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql/node";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import * as schema from "@/lib/schema";
import { createTodoTools, type TutorRequestContext } from "@/lib/todos";

// The real tools and migrations against a throwaway file; the agent and the
// model are not involved, only what each executor does with a given context.
let dir: string;
let db: ReturnType<typeof drizzle<typeof schema>>;
let tools: ReturnType<typeof createTodoTools>;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "ai-tutor-todos-"));
  db = drizzle({ connection: { url: `file:${join(dir, "test.db")}` }, schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  tools = createTodoTools(db);

  await db.insert(schema.user).values([
    { id: "alice", name: "Alice", email: "alice@example.com" },
    { id: "bob", name: "Bob", email: "bob@example.com" },
  ]);
});

beforeEach(async () => {
  await db.delete(schema.todos);
});

afterAll(async () => {
  db.$client.close();
  await rm(dir, { recursive: true, force: true });
});

/** What the route builds from the session; `{}` stands for a missing one. */
function context(userId?: string) {
  const requestContext = new RequestContext<TutorRequestContext>();
  if (userId !== undefined) requestContext.set("userId", userId);
  return { requestContext, observe: noopObserve };
}

const list = (userId?: string) =>
  tools.listTodos.execute?.({}, context(userId));
const add = (title: string, userId?: string) =>
  tools.addTodo.execute?.({ title }, context(userId));
const setDone = (id: string, done: boolean, userId?: string) =>
  tools.setTodoDone.execute?.({ id, done }, context(userId));

async function addedId(title: string, userId: string) {
  const result = await add(title, userId);
  if (!result || !("todo" in result)) throw new Error("addTodo failed");
  return result.todo.id;
}

describe("the todo tools", () => {
  test("add, list in insertion order, and mark done and undone", async () => {
    const milk = await addedId("Buy milk", "alice");
    await addedId("Post the letter", "alice");

    expect(await setDone(milk, true, "alice")).toEqual({
      todo: { id: milk, title: "Buy milk", done: true },
    });
    expect(await list("alice")).toEqual({
      todos: [
        { id: milk, title: "Buy milk", done: true },
        { id: expect.any(String), title: "Post the letter", done: false },
      ],
    });

    await setDone(milk, false, "alice");
    const rows = await db.select().from(schema.todos);
    expect(rows.find((row) => row.id === milk)?.done).toBe(false);
  });

  test("stores the title trimmed and rejects a blank one", async () => {
    await addedId("  Buy milk  ", "alice");
    expect(await list("alice")).toMatchObject({
      todos: [{ title: "Buy milk" }],
    });

    expect(await add("   ", "alice")).toMatchObject({ error: true });
  });
});

describe("per-user isolation", () => {
  test("each user lists only their own items", async () => {
    await addedId("Alice's item", "alice");
    await addedId("Bob's item", "bob");

    expect(await list("alice")).toMatchObject({
      todos: [{ title: "Alice's item" }],
    });
    expect(await list("bob")).toMatchObject({
      todos: [{ title: "Bob's item" }],
    });
  });

  test("addTodo writes under the context's user, whatever the input says", async () => {
    // A model that smuggles a userId into the input gets it stripped by the
    // input schema; the row belongs to the context's user regardless.
    await tools.addTodo.execute?.(
      { title: "Sneaky", userId: "bob" } as { title: string },
      context("alice"),
    );

    const rows = await db.select().from(schema.todos);
    expect(rows.map(({ userId, title }) => ({ userId, title }))).toEqual([
      { userId: "alice", title: "Sneaky" },
    ]);
  });

  test("setTodoDone cannot touch another user's item, even with its id", async () => {
    const bobs = await addedId("Bob's item", "bob");

    expect(await setDone(bobs, true, "alice")).toEqual({ todo: null });
    expect(await list("bob")).toMatchObject({ todos: [{ done: false }] });
  });

  test("every tool refuses to run without a user in the context", async () => {
    const bobs = await addedId("Bob's item", "bob");

    for (const result of [
      await list(),
      await add("Orphan"),
      await setDone(bobs, true),
      await list(""),
    ]) {
      expect(result).toMatchObject({ error: true });
    }

    const rows = await db.select().from(schema.todos);
    expect(rows.map(({ title, done }) => ({ title, done }))).toEqual([
      { title: "Bob's item", done: false },
    ]);
  });
});
