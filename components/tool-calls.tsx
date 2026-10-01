"use client";

import {
  defineToolCallRenderer,
  ToolCallStatus,
} from "@copilotkit/react-core/v2";
import type { ReactNode } from "react";
import type { z } from "zod";
import {
  addTodoInput,
  addTodoOutput,
  listTodosInput,
  listTodosOutput,
  setTodoDoneInput,
  setTodoDoneOutput,
} from "@/lib/todo-schemas";

type Tone = "pending" | "done" | "error";

const tones: Record<Tone, string> = {
  pending: "border-zinc-200 bg-white text-zinc-600",
  done: "border-zinc-200 bg-zinc-50 text-zinc-800",
  error: "border-amber-200 bg-amber-50 text-amber-900",
};

/**
 * One tool call in the transcript: what Bartholomew did, in words, with the
 * tool's name beside it so the user can see which tool did the work.
 */
function ToolCallCard({
  tool,
  tone,
  icon,
  children,
  details,
}: {
  tool: string;
  tone: Tone;
  icon: ReactNode;
  children: ReactNode;
  details?: ReactNode;
}) {
  const summary = (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center"
      >
        {tone === "pending" ? <Spinner /> : icon}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      <code className="shrink-0 font-mono text-[11px] text-zinc-500">
        {tool}
      </code>
      {details ? (
        <span
          aria-hidden
          className="shrink-0 text-zinc-400 transition-transform group-open:rotate-90"
        >
          {icons.chevron}
        </span>
      ) : null}
    </span>
  );

  return (
    <div
      data-testid="tool-call"
      data-tool={tool}
      data-status={tone}
      className={`my-2 max-w-md rounded-lg border px-3 py-2 text-sm ${tones[tone]}`}
    >
      {details ? (
        <details className="group">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            {summary}
          </summary>
          <div className="mt-2 border-t border-zinc-200 pt-2 pl-7.5">
            {details}
          </div>
        </details>
      ) : (
        summary
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span className="size-3.5 rounded-full border-2 border-zinc-300 border-t-zinc-600 motion-safe:animate-spin" />
  );
}

function Icon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

const icons = {
  list: (
    <Icon path="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" />
  ),
  add: <Icon path="M8 3v10M3 8h10" />,
  done: <Icon path="M3 8.5l3.5 3.5L13 4.5" />,
  undo: <Icon path="M3 5.5h6.5a3.5 3.5 0 0 1 0 7H6M3 5.5L5.5 3M3 5.5L5.5 8" />,
  error: <Icon path="M8 4.5v4M8 11.5h.01M8 1.5l6.5 12h-13z" />,
  chevron: <Icon path="M6 4l4 4-4 4" />,
};

/**
 * The tool's result arrives as the JSON of its output. Anything that does not
 * match the output schema (Mastra's `{ error: true, … }` for a rejected input
 * or context, or a thrown executor) counts as a failure.
 */
function parseResult<S extends z.ZodType>(
  schema: S,
  result: string,
): z.infer<S> | undefined {
  try {
    const parsed = schema.safeParse(JSON.parse(result));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

const quoted = (title: string) => `“${title}”`;

const listTodosRenderer = defineToolCallRenderer({
  name: "listTodos",
  args: listTodosInput,
  render: ({ name, status, result }) => {
    if (status !== ToolCallStatus.Complete) {
      return (
        <ToolCallCard tool={name} tone="pending" icon={icons.list}>
          Checking the list…
        </ToolCallCard>
      );
    }
    const output = parseResult(listTodosOutput, result);
    if (!output) {
      return (
        <ToolCallCard tool={name} tone="error" icon={icons.error}>
          Couldn’t read the list
        </ToolCallCard>
      );
    }
    const { todos } = output;
    const done = todos.filter((todo) => todo.done).length;
    return (
      <ToolCallCard
        tool={name}
        tone="done"
        icon={icons.list}
        details={
          todos.length > 0 ? (
            <ul className="flex flex-col gap-1 text-zinc-700">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className={todo.done ? "text-zinc-400 line-through" : ""}
                >
                  {todo.title}
                  {todo.done ? <span className="sr-only"> (done)</span> : null}
                </li>
              ))}
            </ul>
          ) : undefined
        }
      >
        Checked the list{" "}
        <span className="text-zinc-500">
          ·{" "}
          {todos.length === 0
            ? "empty"
            : `${todos.length} ${todos.length === 1 ? "item" : "items"}, ${done} done`}
        </span>
      </ToolCallCard>
    );
  },
});

const addTodoRenderer = defineToolCallRenderer({
  name: "addTodo",
  args: addTodoInput,
  render: ({ name, status, args, result }) => {
    if (status !== ToolCallStatus.Complete) {
      return (
        <ToolCallCard tool={name} tone="pending" icon={icons.add}>
          {args.title ? `Adding ${quoted(args.title)}…` : "Adding an item…"}
        </ToolCallCard>
      );
    }
    const output = parseResult(addTodoOutput, result);
    if (!output) {
      return (
        <ToolCallCard tool={name} tone="error" icon={icons.error}>
          {args.title
            ? `Couldn’t add ${quoted(args.title)}`
            : "Couldn’t add the item"}
        </ToolCallCard>
      );
    }
    return (
      <ToolCallCard tool={name} tone="done" icon={icons.add}>
        Added {quoted(output.todo.title)} to the list
      </ToolCallCard>
    );
  },
});

const setTodoDoneRenderer = defineToolCallRenderer({
  name: "setTodoDone",
  args: setTodoDoneInput,
  render: ({ name, status, args, result }) => {
    const reopening = args.done === false;
    const icon = reopening ? icons.undo : icons.done;
    if (status !== ToolCallStatus.Complete) {
      return (
        <ToolCallCard tool={name} tone="pending" icon={icon}>
          {reopening ? "Reopening an item…" : "Ticking off an item…"}
        </ToolCallCard>
      );
    }
    const output = parseResult(setTodoDoneOutput, result);
    if (!output) {
      return (
        <ToolCallCard tool={name} tone="error" icon={icons.error}>
          Couldn’t update the item
        </ToolCallCard>
      );
    }
    if (!output.todo) {
      return (
        <ToolCallCard tool={name} tone="error" icon={icons.error}>
          Found no such item on the list
        </ToolCallCard>
      );
    }
    const { title, done } = output.todo;
    return (
      <ToolCallCard
        tool={name}
        tone="done"
        icon={done ? icons.done : icons.undo}
      >
        Marked {quoted(title)} {done ? "done" : "not done"}
      </ToolCallCard>
    );
  },
});

/**
 * One renderer per tool in lib/todos.ts, for the provider's `renderToolCalls`;
 * module-level because CopilotKit requires that array to stay stable.
 */
export const todoToolRenderers = [
  listTodosRenderer,
  addTodoRenderer,
  setTodoDoneRenderer,
];
