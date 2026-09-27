import { describe, it, expect, vi, afterEach } from "vitest";
import { extractIntent, rankEvidence, matchResources, enrichHuddle } from "../lib/intelligence/engagement";
import { createIntelligentHuddle, synthesizeHuddle, understandQuestion, prepareContext, type Generator } from "../lib/intelligence/agents";
import { structured } from "../lib/intelligence/provider";
import { screenText, screenData } from "../lib/privacy";
import { makeHuddle, sources, expert, EXAMPLE_QUESTION, EXAMPLE_RESPONSE } from "../data/demo";
import { HuddleSchema, type Resource } from "../types/huddle";
import { z } from "zod";
const offline: Generator = async () => { throw new Error("offline"); };
const context = { ...makeHuddle(EXAMPLE_QUESTION).question, topic: "Clinical trials", question: "What breast cancer trial information and patient support resources can I review?" };
const resource: Resource = { id: "fixture-access", title: "Sample support resource", category: "patient_access", description: "Test-only support information; not an enrollment service.", url: "https://example.org/test-support", topics: ["Breast cancer"], specialties: ["Oncology"], demo: true };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("engagement pipeline", () => {
  it("extracts requests without inventing urgency, diagnoses or resources", () => {
    const intent = extractIntent(context);
    expect(intent.resource_need).toEqual(["evidence", "patient_access"]);
    expect(intent.urgency).toBe("not_stated");
    expect(extractIntent({ ...context, question: "This is not urgent. I need evidence." }).urgency).toBe("not_stated");
    expect(extractIntent({ ...context, question: "I urgently need evidence." }).urgency).toBe("explicit_time_sensitive");
    expect(makeHuddle("I have a question about breast pain.").question.condition).toBe("Not classified");
  });
  it("ranks supplied trial evidence without fabricating citations or deleting provenance", () => {
    const result = rankEvidence(context, sources);
    expect(result[0].id).toBe("nci-trials");
    expect(result[0].relevance?.reason).toContain("trial");
    expect(result.every(s => sources.some(original => original.url === s.url && original.id === s.id))).toBe(true);
    expect(rankEvidence(context, [])).toEqual([]);
  });
  it("matches supplied catalogs only and requires catalog approval for product resources", () => {
    expect(matchResources(context, [])).toEqual([]);
    expect(matchResources(context, [resource])[0].match_reason).toContain("patient access");
    expect(matchResources({ ...context, specialty: "Cardiology", condition: "Arrhythmia", topic: "Rhythm monitoring" }, [{ ...resource, specialties: [] }])).toEqual([]);
    const product = { ...resource, category: "approved_product" as const };
    const request = { ...context, question: "Where is approved product information for breast cancer?" };
    expect(matchResources(request, [product])).toEqual([]);
    expect(matchResources(request, [{ ...product, approval_status: "approved" }])).toHaveLength(1);
  });
  it("generates multiple traceable actions and a brief using the same action structure", async () => {
    const huddle = await prepareContext(makeHuddle(context.question), context, sources, [expert], offline, [resource]);
    expect(huddle.next_best_actions?.some(a => a.type === "evidence")).toBe(true);
    expect(huddle.next_best_actions?.some(a => a.type === "expert")).toBe(true);
    expect(huddle.next_best_actions?.some(a => a.type === "resource" && a.resource_id === resource.id)).toBe(true);
    expect(huddle.intelligence?.routing[0].reason).toContain("Oncology");
    const completed = await synthesizeHuddle(huddle, EXAMPLE_RESPONSE, offline);
    expect(completed.brief?.next_best_actions).toEqual(completed.next_best_actions);
    expect(completed.response).toBe(EXAMPLE_RESPONSE);
    expect(HuddleSchema.safeParse(completed).success).toBe(true);
  });
  it("handles empty inputs, removes orphan references and does not promise unavailable experts", async () => {
    const empty = await createIntelligentHuddle(EXAMPLE_QUESTION, offline, { sources: [], profiles: [], resources: [] });
    expect(empty.next_best_actions).toEqual([]);
    expect(empty.experts).toEqual([]);
    expect((await synthesizeHuddle(empty, EXAMPLE_RESPONSE, offline)).brief).not.toBeNull();
    const unavailable = enrichHuddle({ ...empty, expert: { ...expert, available: false } });
    expect(unavailable.next_best_actions).toEqual([]);
    expect(enrichHuddle({ ...empty, question: context }, [{ ...resource, source_id: "invented" }]).resources).toEqual([]);
  });
});
describe("privacy boundaries", () => {
  it("redacts known identifier patterns in text and nested data without changing clinical terms", () => {
    const raw = "Patient: Jane Doe, DOB: 01/02/1980, MRN: ABC1234, jane@example.org, 404-555-0101, 123-45-6789, 123 Main Street. Breast cancer HER2.";
    const checked = screenText(raw);
    expect(checked.detected).toBe(true);
    for (const identifier of ["Jane Doe", "01/02/1980", "ABC1234", "jane@example.org", "404-555-0101", "123-45-6789", "123 Main Street"]) expect(checked.value).not.toContain(identifier);
    expect(checked.value).toContain("Breast cancer HER2");
    expect(screenData({ nested: [{ message: raw }] }).value.nested[0].message).toBe(checked.value);
    expect(screenText(EXAMPLE_QUESTION).detected).toBe(false);
  });
  it("does not call even an injected model for flagged questions or replies", async () => {
    const spy = vi.fn();
    const generator: Generator = async () => { spy(); throw new Error("Must not run"); };
    const huddle = await createIntelligentHuddle("Patient: Jane Doe has breast cancer. Email jane@example.org.", generator);
    expect(spy).not.toHaveBeenCalled();
    expect(huddle.question.question).not.toContain("Jane Doe");
    expect(huddle.privacy?.external_ai).toBe("blocked");
    const reply = await synthesizeHuddle(makeHuddle(EXAMPLE_QUESTION), "Please contact patient Jane Doe at jane@example.org for context.", generator);
    expect(spy).not.toHaveBeenCalled();
    expect(reply.response).not.toContain("jane@example.org");
    expect(reply.privacy?.detected).toBe(true);
  });
  it("blocks the external provider before any fetch and keeps ordinary errors usable", async () => {
    vi.stubEnv("PULSEPOINT_AI_ENABLED", "true"); vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(structured("test", z.object({ value: z.string() }), "test", { question: "Email jane@example.org" })).rejects.toThrow("identifiers");
    expect(fetch).not.toHaveBeenCalled();
    const result = await understandQuestion(EXAMPLE_QUESTION, offline);
    expect(result.mode).toBe("fallback");
  });
});
