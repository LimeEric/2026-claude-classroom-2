import { z } from "zod";

// The todo tools' input and output shapes, kept free of Mastra and Drizzle so
// the browser's tool-call cards (components/tool-calls.tsx) can import them
// alongside the tools themselves (lib/todos.ts).

export const todoSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
});

export const listTodosInput = z.object({});
export const listTodosOutput = z.object({ todos: z.array(todoSchema) });

export const addTodoInput = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe("The item as the user would write it, e.g. 'Buy milk'"),
});
export const addTodoOutput = z.object({ todo: todoSchema });

export const setTodoDoneInput = z.object({
  id: z.string().describe("The item's id, from listTodos"),
  done: z.boolean(),
});
export const setTodoDoneOutput = z.object({ todo: todoSchema.nullable() });
