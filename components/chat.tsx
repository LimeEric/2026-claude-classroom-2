"use client";

import { CopilotChat, CopilotKit } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import type { ReactNode } from "react";
import { TodoRefresher } from "@/components/todo-refresher";
import { todoToolRenderers } from "@/components/tool-calls";

/**
 * `threadId` is handed down from the server-rendered session rather than picked
 * here, so a reload rejoins the same Mastra thread instead of starting a new
 * one. See lib/tutor.ts for why a forged one is useless.
 *
 * `children` (the todo sidebar) sit to the right of the chat.
 */
export function Chat({
  agentId,
  threadId,
  children,
}: {
  agentId: string;
  threadId: string;
  children?: ReactNode;
}) {
  return (
    // The Inspector is on by default in development builds and never loads in a
    // production one, so `enableInspector` is left unset deliberately;
    // `showDevConsole` is deprecated and no longer controls it either way.
    // app/globals.css moves its launcher off the header's sign-out button.
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      credentials="include"
      renderToolCalls={todoToolRenderers}
    >
      <TodoRefresher agentId={agentId} />
      <div className="flex min-h-0 flex-1">
        <CopilotChat
          agentId={agentId}
          threadId={threadId}
          className="min-h-0 min-w-0 flex-1"
          labels={{
            chatInputPlaceholder: "Add something to the list…",
          }}
        />
        {children}
      </div>
    </CopilotKit>
  );
}
