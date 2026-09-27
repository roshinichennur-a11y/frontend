import { test, expect } from "@playwright/test";
test("intelligence service and full huddle voice fallback", async ({ page, request }) => {
  const invalid = await request.post("/api/intelligence", { data: { action: "create", question: "Sample question" } });
  expect(invalid.status()).toBe(400);
  const extracted = await request.post("/api/intelligence", { data: { action: "extract", question: "What changed recently in breast cancer clinical trials?", syntheticOnly: true } });
  expect(extracted.ok()).toBe(true);
  expect((await extracted.json()).value.topic).toBe("Clinical trials");
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { value: { cancel() {}, speak(utterance: { text: string; onend?: () => void }) { (window as unknown as {spoken: string}).spoken = utterance.text; setTimeout(() => utterance.onend?.(), 10); } } });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: class { text: string; constructor(text: string) { this.text = text; } } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Try a sample question/ }).click();
  await page.getByRole("button", { name: "Start huddle", exact: true }).click();
  await page.getByRole("button", { name: "Confirm context" }).click();
  await expect(page.getByRole("heading", { name: "Evidence context", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Request Expert Connection", exact: true }).click();
  await page.getByRole("button", { name: "Use simulated response" }).click();
  await page.getByRole("button", { name: "Create huddle brief" }).click();
  await page.getByRole("button", { name: "Play huddle", exact: true }).click();
  const spoken = await page.evaluate(() => (window as unknown as {spoken: string}).spoken);
  expect(spoken).toContain("Evidence context:");
  expect(spoken).toContain("Expert perspective, simulated:");
  expect(spoken).toContain("Uncertainty:");
  await page.getByText("Read voice briefing", { exact: true }).click();
  await expect(page.locator(".voice-transcript")).toContainText(spoken);
});

test("service outage preserves the typed question and allows completion", async ({ page }) => {
  await page.route("**/api/intelligence", route => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: /Try a sample question/ }).click();
  await page.getByRole("button", { name: "Start huddle", exact: true }).click();
  await expect(page.getByText(/Local fallback: intelligence service unavailable/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm context" }).click();
  await page.getByRole("button", { name: "Request Expert Connection", exact: true }).click();
  await page.getByRole("button", { name: "Use simulated response" }).click();
  await page.getByRole("button", { name: "Create huddle brief" }).click();
  await expect(page.getByRole("heading", { name: "Huddle Brief", exact: true })).toBeVisible();
});
