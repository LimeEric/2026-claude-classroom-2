import { createTool } from "@mastra/core/tools";
import { and, asc, eq, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { z } from "zod";
import type * as schema from "@/lib/schema";
import { todos } from "@/lib/schema";
import {
  addTodoInput,
  addTodoOutput,
  listTodosInput,
  listTodosOutput,
  setTodoDoneInput,
  setTodoDoneOutput,
} from "@/lib/todo-schemas";

// Takes the database as a parameter instead of importing lib/db.ts, so the
// page, the agent, and tests on a temp file all share these queries.
type Db = LibSQLDatabase<typeof schema>;

/**
 * What the CopilotKit route puts on the Mastra RequestContext. `userId` is the
 * verified session's, set server-side; nothing the model or the browser sends
 * can reach it (the AG-UI bridge writes client context under "ag-ui" only).
 */
export type TutorRequestContext = { userId: string };

const requestContextSchema = z.object({ userId: z.string().min(1) });

const columns = { id: todos.id, title: todos.title, done: todos.done };

export function listTodos(db: Db, userId: string) {
  // `createdAt` has one-second resolution, so rowid breaks ties in insert order.
  return db
    .select(columns)
    .from(todos)
    .where(eq(todos.userId, userId))
    .orderBy(asc(todos.createdAt), sql`rowid`);
}

/** The model-facing tools; each scopes every query to the context's `userId`. */
export function createTodoTools(db: Db) {
  const listTodosTool = createTool({
    id: "listTodos",
    description:
      "Read the user's whole to-do list, oldest first. Call it before answering anything about the list, and to find an item's id.",
    inputSchema: listTodosInput,
    outputSchema: listTodosOutput,
    requestContextSchema,
    execute: async (_input, { requestContext }) => ({
      todos: await listTodos(db, requestContext.get("userId")),
    }),
  });

  const addTodoTool = createTool({
    id: "addTodo",
    description: "Add one item to the user's to-do list.",
    inputSchema: addTodoInput,
    outputSchema: addTodoOutput,
    requestContextSchema,
    execute: async ({ title }, { requestContext }) => {
      const [todo] = await db
        .insert(todos)
        .values({ userId: requestContext.get("userId"), title })
        .returning(columns);
      return { todo };
    },
  });

  const setTodoDoneTool = createTool({
    id: "setTodoDone",
    description:
      "Mark an item on the user's to-do list as done, or as not done again.",
    inputSchema: setTodoDoneInput,
    outputSchema: setTodoDoneOutput,
    requestContextSchema,
    execute: async ({ id, done }, { requestContext }) => {
      // Matching on userId too makes another user's id look like no item at all.
      const [todo] = await db
        .update(todos)
        .set({ done })
        .where(
          and(eq(todos.id, id), eq(todos.userId, requestContext.get("userId"))),
        )
        .returning(columns);
      return { todo: todo ?? null };
    },
  });

  // The keys are the tool names the model calls; components/todo-refresher.tsx
  // refreshes the sidebar on the two that write, and components/tool-calls.tsx
  // renders each one in the chat.
  return {
    listTodos: listTodosTool,
    addTodo: addTodoTool,
    setTodoDone: setTodoDoneTool,
  };
}
