import { describe, it, expect, vi, afterEach } from "vitest";
import { understandQuestion, synthesizeEvidence, rankExperts, synthesizeHuddle, validateClaims, type Generator } from "../lib/intelligence/agents";
import { makeHuddle, sources, expert, EXAMPLE_QUESTION, EXAMPLE_RESPONSE } from "../data/demo";
import { HuddleSchema } from "../types/huddle";
import { buildVoiceBrief } from "../lib/voiceBrief";
const offline: Generator = async () => { throw new Error("offline"); };
const question = makeHuddle(EXAMPLE_QUESTION).question;
const claim = { text: "This resource provides background for a literature review.", source_ids: [sources[0].id], supporting_quotes: [{ source_id: sources[0].id, quote: sources[0].snippet }] };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("intelligence services", () => {
  it("extracts useful context offline without pretending to use AI", async () => {
    const result = await understandQuestion("What changed recently in breast cancer clinical trials?", offline);
    expect(result.mode).toBe("fallback");
    expect(result.value.topic).toBe("Clinical trials");
    expect(result.value.intent).toBe("Clinical update");
    expect(result.value.keywords).toContain("trials");
  });
  it("keeps the original question even when the model rewrites it", async () => {
    const generate: Generator = async (_, schema) => schema.parse({ ...question, question: "rewritten", keywords: ["breast"] });
    expect((await understandQuestion(EXAMPLE_QUESTION, generate)).value.question).toBe(EXAMPLE_QUESTION);
  });
  it("rejects invented source IDs and quotations", () => {
    expect(() => validateClaims([{ ...claim, source_ids: ["invented"] }], sources)).toThrow();
    expect(() => validateClaims([{ ...claim, supporting_quotes: [{ source_id: sources[0].id, quote: "This is not in the supplied source." }] }], sources)).toThrow();
    expect(validateClaims([claim], sources)).toHaveLength(1);
  });
  it("falls back on invalid evidence and empty retrieval", async () => {
    const generate: Generator = async (_, schema) => schema.parse({ evidence_summary: [{ ...claim, source_ids: ["invented"] }], uncertainties: [] });
    const result = await synthesizeEvidence(question, sources, generate);
    expect(result.mode).toBe("fallback");
    expect(result.value.evidence_summary[0].text).toBe(sources[0].snippet);
    expect((await synthesizeEvidence(question, [], offline)).value.evidence_summary).toEqual([]);
  });
  it("ranks supplied experts without inventing availability", () => {
    const ranked = rankExperts(question, [{ ...expert, id: "unknown", available: undefined }, expert]);
    expect(ranked[0].expert.id).toBe(expert.id);
    expect(ranked[0].match_score).toBe(100);
    expect(ranked[1].availability).toBe(0);
    expect(rankExperts({ ...question, specialty: "Cardiology" }, [expert])).toEqual([]);
  });
  it("preserves expert opinion and per-claim attribution", async () => {
    const generate: Generator = async (_, schema) => schema.parse({ evidence_summary: [claim], key_takeaways: [claim], uncertainties: ["Applicability needs review."] });
    const result = await synthesizeHuddle(makeHuddle(EXAMPLE_QUESTION), EXAMPLE_RESPONSE, generate);
    expect(result.response).toBe(EXAMPLE_RESPONSE);
    expect(result.brief?.takeawaySourceIds).toEqual([[sources[0].id]]);
    expect(result.brief?.grounding?.[0].supporting_quotes).toEqual(claim.supporting_quotes);
    expect(result.brief?.synthesisLabel).toContain("AI synthesis");
    expect(HuddleSchema.safeParse(result).success).toBe(true);
  });
  it("supports backend source IDs and a short voice briefing in fallback", async () => {
    const result = await synthesizeHuddle({ ...makeHuddle(EXAMPLE_QUESTION), sources: [{ ...sources[0], id: "SRC-001" }] }, EXAMPLE_RESPONSE, offline);
    expect(result.brief?.takeawaySourceIds).toEqual([["SRC-001"]]);
    expect(result.brief?.synthesisLabel).toContain("fallback");
    const voice = buildVoiceBrief(result);
    expect(voice).toContain("Expert perspective, simulated");
    expect(voice.split(/\s+/).length).toBeLessThanOrEqual(140);
  });
  it("uses strict output, safety instructions, and no web tools", async () => {
    vi.stubEnv("PULSEPOINT_AI_ENABLED", "true"); vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify({ ...question, keywords: [] }) }] }] })));
    vi.stubGlobal("fetch", fetch);
    expect((await understandQuestion(EXAMPLE_QUESTION)).mode).toBe("ai");
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.text.format.strict).toBe(true);
    expect(body.store).toBe(false);
    expect(body.tools).toBeUndefined();
    expect(body.instructions).toContain("Do not diagnose");
  });
  it("handles refusals as local fallback", async () => {
    vi.stubEnv("PULSEPOINT_AI_ENABLED", "true"); vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "completed", output: [{ content: [{ type: "refusal", refusal: "no" }] }] }))));
    expect((await understandQuestion(EXAMPLE_QUESTION)).mode).toBe("fallback");
  });
});
