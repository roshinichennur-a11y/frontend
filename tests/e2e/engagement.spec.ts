import { test, expect } from "@playwright/test";

test("question to next best action preserves brief and source provenance", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", response => { if (response.url().includes("/api/") && !response.ok()) errors.push(`API ${response.status()}`); });
  await page.goto("/");
  await expect(page.getByText("YOUR QUESTION IS THE SIGNAL")).toBeVisible();
  await page.getByRole("button", { name: /Try a sample question/ }).click();
  await page.getByRole("button", { name: "Start huddle", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Understanding your question" })).toBeVisible();
  await expect(page.getByText("Information needed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Confirm context" }).click();
  await expect(page.locator(".source-relevance")).toHaveCount(3);
  await expect(page.getByText("Sample availability:")).toBeVisible();
  await page.getByRole("button", { name: "Request Expert Connection", exact: true }).click();
  await page.getByRole("button", { name: "Use simulated response" }).click();
  await page.getByRole("button", { name: "Create huddle brief" }).click();
  await page.getByRole("link", { name: "Choose your next step" }).click();
  const actions = page.getByRole("region", { name: "Next Best Action" });
  await expect(actions).toBeVisible();
  await expect(actions).toContainText("Simulated huddle only");
  await expect(actions.getByText("Approved Resource", { exact: true })).toHaveCount(0);
  await expect(actions.getByText("Patient Access", { exact: true })).toHaveCount(0);
  await actions.getByRole("link", { name: "View Evidence" }).click();
  await expect(page).toHaveURL(/#brief-sources$/);
  const refs = page.locator("#brief-sources");
  await expect(refs.getByRole("link")).toHaveCount(3);
  await expect(refs.getByRole("link").first()).toHaveAttribute("href", "https://www.cancer.gov/types/breast/hp/breast-treatment-pdq");
  await page.screenshot({ path: `../docs/screenshots/${info.project.name}-engagement.png`, fullPage: true });
  await actions.getByRole("button", { name: "Continue Expert Huddle" }).click();
  await expect(page.getByLabel("Or type your response")).not.toHaveValue("");
  await page.getByRole("button", { name: "Brief", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Key takeaways" })).toBeVisible();
  await page.getByRole("button", { name: "Question Graph", exact: true }).click();
  await expect(page.getByText("HCP QUESTION INTELLIGENCE", { exact: true })).toBeVisible();
  await expect(page.getByTestId("graph-unanswered")).toHaveText("1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("unsupported actions stay absent and unavailable profiles do not promise a connection", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => JSON.parse(sessionStorage.getItem("pulsepoint-demo-v1") || "[]").length === 2);
  await page.evaluate(() => {
    const huddles = JSON.parse(sessionStorage.getItem("pulsepoint-demo-v1") || "[]");
    huddles[0].sources = [];
    huddles[0].expert = null;
    sessionStorage.setItem("pulsepoint-demo-v1", JSON.stringify(huddles));
  });
  await page.reload();
  await page.getByRole("button", { name: /Treatment sequencing Sample case/ }).click();
  const actions = page.getByRole("region", { name: "Next Best Action" });
  await expect(actions).toContainText("No evidence or expert pathway has been supplied");
  await expect(actions.getByRole("button")).toHaveCount(0);
  await expect(actions.getByRole("link")).toHaveCount(0);
  await page.waitForFunction(() => JSON.parse(sessionStorage.getItem("pulsepoint-demo-v1") || "[]").length === 2);
  await page.evaluate(() => {
    const huddles = JSON.parse(sessionStorage.getItem("pulsepoint-demo-v1") || "[]");
    huddles[1].status = "ready";
    huddles[1].expert.available = false;
    sessionStorage.setItem("pulsepoint-demo-v1", JSON.stringify(huddles));
  });
  await page.reload();
  await page.getByRole("button", { name: /Side-effect management Sample case/ }).click();
  await expect(page.getByText("Not currently available.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Request Expert Connection", exact: true })).toBeDisabled();
});
