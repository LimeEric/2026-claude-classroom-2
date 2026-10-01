import { expect, test } from "@playwright/test";

// An OS set to dark mode must still get the light app, and the chat plus the
// todo sidebar must fill everything below the header.
test.use({ colorScheme: "dark", viewport: { width: 1600, height: 900 } });

test("chat stays light and fills the page under the header beside the list", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByLabel("Email").fill(`e2e-layout-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL("/");

  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );

  const chat = page.locator(".copilotKitChat");
  await expect(
    page.getByPlaceholder("Add something to the list…"),
  ).toBeVisible();

  const sidebar = page.getByRole("complementary", { name: "To-do list" });
  await expect(sidebar).toContainText("Nothing on the list yet.");

  const header = await page.locator("header").boundingBox();
  const box = await chat.boundingBox();
  const side = await sidebar.boundingBox();
  expect(header).not.toBeNull();
  expect(box).not.toBeNull();
  expect(side).not.toBeNull();
  if (!header || !box || !side) return;
  expect(box.x).toBe(0);
  expect(box.width).toBe(side.x);
  expect(side.x + side.width).toBe(1600);
  for (const { y, height } of [box, side]) {
    expect(y).toBe(header.height);
    expect(y + height).toBe(900);
  }
});
