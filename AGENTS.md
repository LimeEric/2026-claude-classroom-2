<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ai-tutor

A to-do list kept by Bartholomew, a chat butler the code calls the tutor: a Mastra agent behind a CopilotKit chat, Better Auth, and Drizzle over SQLite.

## Setup and commands

- First run: `npm install`, `cp .env.example .env` and fill it in, `npm run db:migrate`, and `npx playwright install chromium` before any e2e run.
- The two `ERESOLVE overriding peer dependency` warnings from `npm install` are expected (a nested zod-3 tree).
- Typecheck with `npx next typegen && npx tsc --noEmit`, since `PageProps`/`LayoutProps` are globals generated into `.next/types`.
- Before committing, `npm run lint`, the typecheck, and `npm test` pass.
- Biome only, so never add ESLint or Prettier config; `npm run format` skips import sorting, which `npx biome check --write <path>` applies.

## App — `app/`, `components/`

- Pages are `/` (the chat), `/login`, and `/signup`.
- Import with the `@/*` alias, and extend a primitive in `components/ui/` instead of repeating its class string.
- TypeScript 7 has no JS compiler API, so never turn off `experimental.useTypeScriptCli`, and the `next` plugin in `tsconfig.json` is inert.
- Tailwind v4 has no `tailwind.config.*`; tokens live in the `@theme inline` block of `app/globals.css`.
- The app is light only: no `dark:` variants, no `prefers-color-scheme` rule, and nothing sets the `.dark` class CopilotKit's dark theme keys on.

## Persistence — `lib/db.ts`, `lib/schema.ts`, `drizzle/`

- Import `db` from `lib/db.ts` rather than constructing another `drizzle()`.
- App tables go in `lib/schema.ts`, because `lib/auth-schema.ts` is overwritten wholesale by `auth:generate`.
- A schema change is `npm run db:generate` + `npm run db:migrate`; `drizzle/` is generated and `data/app.db` is disposable.
- The driver is libSQL, so do not install `better-sqlite3`.
- Mastra creates and owns `mastra_*` tables in the same SQLite file; keep them out of `lib/schema.ts`.
- The `todos` table is the list: the agent writes it only through the tools in `lib/todos.ts`, and the sidebar only reads it.

## Auth — `lib/auth.ts`, `lib/auth-cli.ts`, `lib/auth-config.ts`

- `lib/auth.ts` (the app instance, `nextCookies()` last) and `lib/auth-cli.ts` (the CLI target, since the Better Auth CLI refuses `server-only`) both spread `authOptions(db)`, and `plugins` must stay a literal array or Better Auth stops inferring plugin helpers.
- A new plugin or provider goes into both entry points, then `npm run auth:generate` → `db:generate` → `db:migrate`, or startup throws `Drizzle schema mismatch`.
- `auth:generate` runs `npx auth@latest` rather than the installed `better-auth`, and a Better Auth upgrade needs the same generate-and-migrate flow.
- Gate pages server-side with `auth.api.getSession({ headers: await headers() })` + `redirect()`; there is deliberately no `proxy.ts`.

## Agent — `lib/tutor.ts`, `lib/todos.ts`, `components/`, `app/api/copilotkit/[...all]/`

- The route is the only security boundary: it answers 401 without a session and takes both `resourceId` and the tools' `RequestContext` `userId` from `session.user.id`, never from the request or tool input.
- The sidebar is a Server Component that `components/todo-refresher.tsx` re-renders with `router.refresh()` after a write tool's result.
- A new tool takes its schemas from the client-safe `lib/todo-schemas.ts`, gets a card in `components/tool-calls.tsx`, and, if it writes, joins `WRITE_TOOLS` in the refresher.
- Use only the `/v2` entry points of `@copilotkit/react-core` and `@copilotkit/runtime`; `@copilotkit/react-ui` and the package roots are v1.
- `@ag-ui/client`/`core` stay on the `0.0.59` CopilotKit pins exactly; move them only with a CopilotKit release on AG-UI 1.x.
- The browser transcript starts empty on reload (the runtime's default `InMemoryAgentRunner`), while the thread itself persists in Mastra memory.

## Tests — `tests/unit` (Vitest), `tests/e2e` (Playwright)

- Vitest only picks up `tests/unit/**/*.test.{ts,tsx}` and cannot render async Server Components, so cover those in e2e.
- Don't reinstall the deprecated `vite-tsconfig-paths`; `resolve.tsconfigPaths` replaces it.
- Vitest inlines `@copilotkit/*` (`server.deps.inline`), because its v2 entry imports a stylesheet Node cannot load.
- Vitest does not load `.env`, so database tests run under `// @vitest-environment node` on a temp file, and nothing in the suite calls OpenRouter.
- E2e specs write to `data/app.db`, so sign up with a `Date.now()`-stamped email.
- `*.llm.spec.ts` call the real model and run only under `npm run test:e2e:llm`, never in `test:e2e`.
- Wait for `copilot-send-button` to be enabled before sending, because input submitted before the chat connects is silently dropped.

## Skills — `.claude/skills/`

- Vendored CopilotKit, Mastra, and `find-docs` skills, pinned in `skills-lock.json`; load the matching one before touching those APIs.

## Secrets — `.env`

- `.env.example` lists every variable; `.env` is git-ignored, so never commit it or print its values.

## Maintenance — for you, the agent

- Update this file in the same change set whenever a change invalidates a line here or teaches a costly lesson.
- Prefer deleting over adding and pointers over prose; drop anything a reader would learn just by opening the file a bullet points to.
- One sentence per bullet, current state only, no history or changelog.
