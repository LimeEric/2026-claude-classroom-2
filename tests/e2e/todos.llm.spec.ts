import { expect, test } from "@playwright/test";

// Calls the real model through OpenRouter (OPENROUTER_API_KEY in .env), so it
// runs only under `npm run test:e2e:llm`; see playwright.config.ts.
test("the agent adds an item and the sidebar shows it", async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(`e2e-todos-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");

  const sidebar = page.getByRole("complementary", { name: "To-do list" });
  await expect(sidebar).toContainText("Nothing on the list yet.");

  const input = page.getByPlaceholder("Add something to the list…");
  await input.fill('Please add "buy milk" to my list.');
  // Enabled only once the chat is connected and can submit; Enter before
  // that is silently dropped.
  const send = page.getByTestId("copilot-send-button");
  await expect(send).toBeEnabled();
  await send.click();

  // No reload: the sidebar must refresh on its own once the tool has run.
  await expect(sidebar.getByRole("listitem")).toHaveText([/buy milk/i], {
    timeout: 90_000,
  });
  // ...that refresh must not wipe the chat's own transcript, and the call
  // itself shows there as a card (components/tool-calls.tsx).
  await expect(
    page
      .getByTestId("tool-call")
      .filter({ hasText: /Added “buy milk” to the list/i }),
  ).toHaveAttribute("data-tool", "addTodo");
});
