"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// The tools in lib/todos.ts that change the list.
const WRITE_TOOLS = new Set(["addTodo", "setTodoDone"]);

/**
 * Re-renders the server-rendered todo sidebar once a write tool has returned.
 * `router.refresh()` re-runs the page's Server Components only, so the chat's
 * client state survives it. Renders nothing; it must sit inside `CopilotKit`.
 */
export function TodoRefresher({ agentId }: { agentId: string }) {
  const router = useRouter();
  // `updates: []`: this component never needs to re-render on agent changes.
  const { agent, isReady } = useAgent({ agentId, updates: [] });

  useEffect(() => {
    if (!isReady) return;

    // The result event carries only the call's id, so remember which calls
    // were writes when their name goes by.
    const writes = new Set<string>();
    const { unsubscribe } = agent.subscribe({
      onToolCallEndEvent: ({ event, toolCallName }) => {
        if (WRITE_TOOLS.has(toolCallName)) writes.add(event.toolCallId);
      },
      onToolCallResultEvent: ({ event }) => {
        if (writes.delete(event.toolCallId)) router.refresh();
      },
    });
    return unsubscribe;
  }, [agent, isReady, router]);

  return null;
}
