import { ToolCallStatus } from "@copilotkit/react-core/v2";
import { render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, test } from "vitest";
import { todoToolRenderers } from "@/components/tool-calls";

// Each renderer is a component of the tool call's props, so it mounts here
// without a provider, a runtime, or a model. `result` is the tool's output,
// serialised the way it arrives unless it is already a string.
function renderCall(
  name: string,
  status: ToolCallStatus,
  args: Record<string, unknown>,
  result?: unknown,
) {
  const renderer = todoToolRenderers.find((r) => r.name === name);
  if (!renderer) throw new Error(`no renderer for ${name}`);
  // The renderers' prop types differ per tool; the cast only spares the test
  // from repeating each one.
  const Render = renderer.render as ComponentType<Record<string, unknown>>;
  const { container } = render(
    <Render
      name={name}
      toolCallId="call-1"
      args={args}
      status={status}
      result={
        status !== ToolCallStatus.Complete
          ? undefined
          : typeof result === "string"
            ? result
            : JSON.stringify(result)
      }
    />,
  );
  return within(container).getByTestId("tool-call");
}

const milk = { id: "t1", title: "Buy milk", done: false };

describe("tool-call cards", () => {
  test("cover exactly the tools the agent has", () => {
    expect(todoToolRenderers.map((r) => r.name).sort()).toEqual([
      "addTodo",
      "listTodos",
      "setTodoDone",
    ]);
  });

  test("addTodo shows the title while running and once added", () => {
    const pending = renderCall("addTodo", ToolCallStatus.Executing, {
      title: "Buy milk",
    });
    expect(pending).toHaveAttribute("data-status", "pending");
    expect(pending).toHaveTextContent("Adding “Buy milk”…");
    expect(pending).toHaveTextContent("addTodo");

    const card = renderCall(
      "addTodo",
      ToolCallStatus.Complete,
      { title: "Buy milk" },
      { todo: milk },
    );
    expect(card).toHaveAttribute("data-status", "done");
    expect(card).toHaveTextContent("Added “Buy milk” to the list");
  });

  test("addTodo shows a failure for Mastra's validation error output", () => {
    const card = renderCall(
      "addTodo",
      ToolCallStatus.Complete,
      { title: " " },
      { error: true, message: "Tool input validation failed" },
    );
    expect(card).toHaveAttribute("data-status", "error");
    expect(card).toHaveTextContent("Couldn’t add “ ”");
  });

  test("listTodos summarises the list and lists it in the details", () => {
    const card = renderCall(
      "listTodos",
      ToolCallStatus.Complete,
      {},
      { todos: [milk, { id: "t2", title: "Post the letter", done: true }] },
    );
    expect(card).toHaveTextContent("Checked the list · 2 items, 1 done");
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByText("Post the letter")).toHaveClass("line-through");
  });

  test("listTodos says when the list is empty", () => {
    const card = renderCall(
      "listTodos",
      ToolCallStatus.Complete,
      {},
      { todos: [] },
    );
    expect(card).toHaveTextContent("Checked the list · empty");
    expect(card.querySelector("details")).toBeNull();
  });

  test("setTodoDone names the item it ticked off or reopened", () => {
    const done = renderCall(
      "setTodoDone",
      ToolCallStatus.Complete,
      { id: "t1", done: true },
      { todo: { ...milk, done: true } },
    );
    expect(done).toHaveTextContent("Marked “Buy milk” done");

    const reopened = renderCall(
      "setTodoDone",
      ToolCallStatus.Complete,
      { id: "t1", done: false },
      { todo: milk },
    );
    expect(reopened).toHaveTextContent("Marked “Buy milk” not done");
  });

  test("setTodoDone flags an id that matched nothing", () => {
    const card = renderCall(
      "setTodoDone",
      ToolCallStatus.Complete,
      { id: "someone-elses", done: true },
      { todo: null },
    );
    expect(card).toHaveAttribute("data-status", "error");
    expect(card).toHaveTextContent("Found no such item on the list");
  });

  test("a result that is not JSON counts as a failure", () => {
    const card = renderCall(
      "listTodos",
      ToolCallStatus.Complete,
      {},
      "Internal error",
    );
    expect(card).toHaveAttribute("data-status", "error");
    expect(card).toHaveTextContent("Couldn’t read the list");
  });
});
