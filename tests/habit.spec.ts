import { expect, test } from "@playwright/test";

const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;

test.describe("Habit flow", () => {
  test("login -> create habit -> mark complete", async ({ page }) => {
    test.skip(
      !TEST_EMAIL || !TEST_PASSWORD,
      "Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run this test."
    );

    const habitName = `E2E Habit ${Date.now()}`;

    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_EMAIL ?? "");
    await page.getByLabel("Password").fill(TEST_PASSWORD ?? "");

    await Promise.all([
      page.waitForURL("**/dashboard"),
      page.getByRole("button", { name: "Log in" }).click(),
    ]);

    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("button", { name: "Add Habit" }).click();
    await page.getByLabel("Habit name").fill(habitName);
    await page.getByRole("button", { name: "Create Habit" }).click();

    const habitCard = page.locator("[data-slot='card']").filter({ hasText: habitName }).first();
    await expect(habitCard).toBeVisible();

    const completionCheckbox = habitCard.getByRole("checkbox", {
      name: /mark complete for today|completed today/i,
    });

    await completionCheckbox.click();
    await expect(completionCheckbox).toBeChecked();
  });
});

