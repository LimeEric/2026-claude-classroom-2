import { db } from "@/lib/db";
import { listTodos } from "@/lib/todos";

/**
 * The signed-in user's list, read-only: the agent is the only write path, and
 * components/todo-refresher.tsx re-renders this after it writes.
 */
export async function TodoSidebar({ userId }: { userId: string }) {
  const items = await listTodos(db, userId);
  const open = items.filter((item) => !item.done).length;

  return (
    <aside
      aria-labelledby="todo-sidebar-title"
      className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-zinc-200 bg-zinc-50 px-5 py-4 md:flex"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="todo-sidebar-title"
          className="text-sm font-semibold tracking-tight text-zinc-900"
        >
          To-do list
        </h2>
        {items.length > 0 ? (
          <span className="text-xs text-zinc-500">{open} open</span>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          Nothing on the list yet. Ask Bartholomew to add something.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <span
                aria-hidden
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border text-[10px] leading-none ${
                  item.done
                    ? "border-zinc-400 bg-zinc-400 text-white"
                    : "border-zinc-300 bg-white"
                }`}
              >
                {item.done ? "✓" : null}
              </span>
              <span
                className={
                  item.done ? "text-zinc-400 line-through" : "text-zinc-800"
                }
              >
                {item.title}
                {item.done ? <span className="sr-only"> (done)</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
