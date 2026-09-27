import { test, expect } from "@playwright/test";
import { HuddleSchema } from "../../types/huddle";

test("existing API returns structured pathways from supplied records only", async ({ request }) => {
  const resource = { id: "test-access", title: "Sample support information", category: "patient_access", description: "Test-only resource, no eligibility confirmed.", url: "https://example.org/support", topics: ["Breast cancer"], specialties: ["Oncology"], demo: true };
  const response = await request.post("/api/intelligence", { data: { action: "create", syntheticOnly: true, question: "Where can I find patient support resources for breast cancer?", sources: [], profiles: [], resources: [resource] } });
  expect(response.ok()).toBe(true);
  const huddle = HuddleSchema.parse(await response.json());
  expect(huddle.sources).toEqual([]);
  expect(huddle.expert).toBeNull();
  expect(huddle.intent_context?.urgency).toBe("not_stated");
  expect(huddle.resources?.[0].id).toBe("test-access");
  expect(huddle.next_best_actions).toEqual([expect.objectContaining({ type: "resource", resource_id: "test-access" })]);
  const brief = await request.post("/api/intelligence", { data: { action: "respond", syntheticOnly: true, huddle, response: "A simulated perspective: review the supplied support resource and confirm its applicability." } });
  expect(brief.ok()).toBe(true);
  const completed = HuddleSchema.parse(await brief.json());
  expect(completed.brief?.next_best_actions).toEqual(completed.next_best_actions);
  const invalid = await request.post("/api/intelligence", { data: { action: "create", syntheticOnly: true, question: "Test question", resources: [{ ...resource, url: "javascript:alert(1)" }] } });
  expect(invalid.status()).toBe(400);
  expect(await invalid.text()).not.toContain("javascript:");
});

test("identifier screening applies before requests and session storage", async ({ page, request }) => {
  const direct = await request.post("/api/intelligence", { data: { action: "create", syntheticOnly: true, question: "Patient: Jane Doe, DOB: 01/02/1980. What breast cancer evidence should I review?" } });
  expect(direct.ok()).toBe(true);
  const output = HuddleSchema.parse(await direct.json());
  expect(output.privacy?.external_ai).toBe("blocked");
  expect(JSON.stringify(output)).not.toContain("Jane Doe");
  expect(JSON.stringify(output)).not.toContain("01/02/1980");
  const sent: string[] = [];
  page.on("request", req => { if (req.url().includes("/api/intelligence")) sent.push(req.postData() || ""); });
  await page.goto("/");
  await page.getByLabel("Clinical question", { exact: true }).fill("Patient: Jane Doe, email jane@example.org. What evidence should I review for breast cancer?");
  await page.getByRole("button", { name: "Start huddle", exact: true }).click();
  await expect(page.getByText(/Possible identifiers were removed/)).toBeVisible();
  expect(sent.length).toBeGreaterThan(0);
  expect(sent.join(" ")).not.toContain("jane@example.org");
  expect(sent.join(" ")).not.toContain("Jane Doe");
  const storage = await page.evaluate(() => sessionStorage.getItem("pulsepoint-demo-v1"));
  expect(storage).not.toContain("jane@example.org");
  expect(storage).not.toContain("Jane Doe");
  await page.getByRole("button", { name: "Confirm context" }).click();
  await expect(page.getByRole("heading", { name: /Evidence to explore/ })).toBeVisible();
});
