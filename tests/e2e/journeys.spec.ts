import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("preview navigation, filters, details, export, help and honest not-found", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A clearer course. A stronger crew." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore your fleet" }).click();
  await page
    .getByRole("textbox", { name: "Search vessels, IMO, or port…" })
    .fill("Pacific");
  await expect(
    page.getByRole("button", { name: /Pacific Endeavour Bulk/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Atlantic Pioneer Container/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "View Pacific Endeavour" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export report", exact: true })
    .click();
  expect((await download).suggestedFilename()).toContain("demo");
  await page.getByRole("button", { name: "Help & field guide" }).click();
  await expect(
    page.getByRole("heading", { name: "Your operations field guide" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ready to explore" }).click();
  for (const path of [
    "/personnel",
    "/assignments",
    "/compliance",
    "/activity",
    "/settings",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.goto("/not-a-page");
  await expect(
    page.getByRole("heading", { name: "Uncharted waters" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("owner registers, creates vessel and crew, assigns, persists after refresh, edits, signs off and deletes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Your name").fill("Jordan Seabrook");
  await dialog.getByLabel("Company name").fill("E2E Maritime");
  await dialog
    .getByLabel("Work email")
    .fill(`journey-${crypto.randomUUID()}@example.com`);
  await dialog.getByLabel("Password").fill("A-private-test-passphrase-2026");
  await dialog
    .locator("form")
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Welcome aboard, Jordan." }),
  ).toBeVisible();
  await expect(
    page.getByText("Preview workspace", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Fleet management" }).click();
  await page
    .getByRole("button", { name: "Add vessel", exact: true })
    .first()
    .click();
  await dialog.getByLabel("Vessel name").fill("E2E Pioneer");
  await dialog.getByLabel("IMO number").fill("9074729");
  await dialog.getByLabel("Flag state").fill("Panama");
  await dialog.getByLabel("Destination / current port").fill("Rotterdam");
  await dialog.getByRole("button", { name: "Add vessel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("link", { name: "Crew & personnel" }).click();
  await page
    .getByRole("button", { name: "Add crew member", exact: true })
    .first()
    .click();
  await dialog.getByLabel("Full name").fill("Alex Rivers");
  await dialog.getByLabel("Email", { exact: true }).fill("alex@example.com");
  await dialog.getByLabel("Nationality").fill("United Kingdom");
  await dialog.getByLabel("Primary certificate expiry").fill("2027-05-20");
  await dialog
    .getByRole("button", { name: "Add crew member", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Assign", exact: true }).click();
  await dialog
    .getByLabel("Assigned vessel")
    .selectOption({ label: "E2E Pioneer" });
  await dialog.getByRole("button", { name: "Save assignment" }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("E2E Pioneer", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Alex Rivers alex/ }).click();
  await dialog.getByLabel("Full name").fill("Alex Rivers Updated");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByText("Alex Rivers Updated", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reassign", exact: true }).click();
  await dialog.getByLabel("Assigned vessel").selectOption("");
  await dialog.getByRole("button", { name: "Save assignment" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("link", { name: "Fleet management" }).click();
  await page.getByRole("button", { name: "View E2E Pioneer" }).click();
  await dialog.getByRole("button", { name: "Edit vessel" }).click();
  await dialog.getByRole("button", { name: "Remove record" }).click();
  await dialog.getByRole("button", { name: "Confirm removal" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your next voyage starts here" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Sign out securely" }).click();
  await expect(
    page.getByRole("heading", { name: "A clearer course. A stronger crew." }),
  ).toBeVisible();
});
test("keyboard, reduced motion, mobile layout and WCAG automated checks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const desktop = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(desktop.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "docs/audit/mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Crew & personnel" }).click();
  await expect(page.locator("main h1")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const mobile = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(mobile.violations).toEqual([]);
  await page
    .getByRole("button", { name: "Add crew member", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("embedded preview sends registration to a secure top-level workspace", async ({
  page,
}) => {
  await page.goto("/");
  await page.setContent(
    '<iframe title="Embedded preview" src="http://localhost:8080" style="width:1200px;height:900px"></iframe>',
  );
  const frame = page.frameLocator("iframe");
  await frame
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(
    frame.getByRole("heading", { name: "A secure place to come aboard." }),
  ).toBeVisible();
  const popupEvent = page.waitForEvent("popup");
  await frame.getByRole("link", { name: "Open secure workspace" }).click();
  const popup = await popupEvent;
  await expect(popup.getByRole("dialog").getByLabel("Your name")).toBeVisible();
  await popup.close();
});
