import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { SignOutButton } from "@/components/sign-out-button";
import { TodoSidebar } from "@/components/todo-sidebar";
import { PageHeader } from "@/components/ui/page-header";
import { auth } from "@/lib/auth";
import { TUTOR_AGENT_ID, tutorThreadId } from "@/lib/tutor";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  // A fixed viewport-high frame, so a long transcript scrolls inside the chat
  // instead of growing the page under the header.
  return (
    <div className="flex h-dvh flex-col">
      <PageHeader title="Bartholomew" subtitle={session.user.name}>
        <SignOutButton />
      </PageHeader>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Chat
          agentId={TUTOR_AGENT_ID}
          threadId={tutorThreadId(session.user.id)}
        >
          <TodoSidebar userId={session.user.id} />
        </Chat>
      </main>
    </div>
  );
}
