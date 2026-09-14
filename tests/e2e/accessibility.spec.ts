import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("all workspace pages and the registration dialog meet automated WCAG checks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of [
    "/",
    "/fleet",
    "/personnel",
    "/assignments",
    "/compliance",
    "/activity",
    "/settings",
    "/unknown",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1,main h3").first()).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations, `Accessibility at ${path}`).toEqual([]);
  }
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
