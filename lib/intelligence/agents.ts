import { z } from "zod";
import type { ClinicalQuestion, Evidence, Expert, Huddle } from "../../types/huddle";
import { completeHuddle, expert, makeHuddle, sources } from "../../data/demo";
import { structured } from "./provider";

export const UnderstandingSchema = z.object({ specialty: z.string(), condition: z.string(), topic: z.string(), intent: z.string(), question: z.string(), keywords: z.array(z.string()) });
export const ClaimSchema = z.object({ text: z.string(), source_ids: z.array(z.string()), supporting_quotes: z.array(z.object({ source_id: z.string(), quote: z.string() })) });
export const EvidenceOutputSchema = z.object({ evidence_summary: z.array(ClaimSchema), uncertainties: z.array(z.string()) });
export const SynthesisSchema = z.object({ evidence_summary: z.array(ClaimSchema), key_takeaways: z.array(ClaimSchema), uncertainties: z.array(z.string()) });
export type Claim = z.infer<typeof ClaimSchema>;
export type Generator = typeof structured;
const compact = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

export function validateClaims(claims: Claim[], evidence: Evidence[]) {
  if (claims.length > 8) throw new Error("Too many claims");
  for (const claim of claims) {
    if (!claim.text.trim() || claim.text.length > 1200 || !claim.source_ids.length || !claim.supporting_quotes.length) throw new Error("Unsupported claim");
    for (const id of claim.source_ids) {
      const source = evidence.find(item => item.id === id);
      const quotes = claim.supporting_quotes.filter(item => item.source_id === id);
      if (!source || !quotes.length || quotes.some(item => item.quote.trim().length < 12 || !compact(source.snippet).includes(compact(item.quote)))) throw new Error("Invalid evidence attribution");
    }
    if (claim.supporting_quotes.some(item => !claim.source_ids.includes(item.source_id))) throw new Error("Unlinked quotation");
  }
  // Exact quotations prove provenance, not semantic entailment or clinical correctness.
  return claims;
}

export function localUnderstanding(question: string): ClinicalQuestion {
  const base = makeHuddle(question).question;
  const topic = /side.effect|adverse|toxicit/i.test(question) ? "Side-effect management"
    : /trial|eligibil/i.test(question) ? "Clinical trials"
    : /biomarker|her2|genomic/i.test(question) ? "Biomarker testing"
    : /insurance|coverage|access/i.test(question) ? "Access & coverage" : base.topic;
  return { ...base, topic, intent: /recent|changed|latest|new evidence/i.test(question) ? "Clinical update" : base.intent,
    keywords: [...new Set(question.toLowerCase().match(/[a-z]{4,}/g) || [])].slice(0, 12) };
}
export async function understandQuestion(question: string, generate: Generator = structured) {
  try {
    const result = await generate("question_understanding", UnderstandingSchema, "Extract context without answering. Use Needs review or Not classified when unclear. Preserve the original question. Return at most 12 keywords.", { question });
    if ([result.specialty, result.condition, result.topic, result.intent].some(s => !s.trim() || s.length > 160)) throw new Error("Invalid context");
    return { value: { ...result, question, keywords: result.keywords.slice(0, 12) }, mode: "ai" as const };
  } catch { return { value: localUnderstanding(question), mode: "fallback" as const }; }
}

export async function synthesizeEvidence(question: ClinicalQuestion, evidence: Evidence[], generate: Generator = structured) {
  try {
    if (!evidence.length) throw new Error("No evidence");
    const value = await generate("evidence_summary", EvidenceOutputSchema, "Summarize only the supplied snippets. Include source IDs and exact supporting quotes. If snippets only describe a resource, describe its scope; do not infer clinical findings. State missing evidence.", { question, evidence });
    validateClaims(value.evidence_summary, evidence);
    if (!value.uncertainties.length) throw new Error("Missing uncertainty");
    return { value, mode: "ai" as const };
  } catch {
    return { value: { evidence_summary: evidence.map(source => ({ text: source.snippet, source_ids: [source.id], supporting_quotes: [{ source_id: source.id, quote: source.snippet }] })), uncertainties: [evidence.length ? "These supplied snippets do not establish current treatment changes or patient-specific applicability." : "No evidence supplied for this question."] }, mode: "fallback" as const };
  }
}

export function rankExperts(question: ClinicalQuestion, profiles: Expert[]) {
  return profiles.map(profile => {
    const specialty_match = compact(profile.specialty) === compact(question.specialty) ? 1 : 0;
    const condition_match = profile.expertise.some(s => compact(s) === compact(question.condition)) ? 1 : 0;
    const topic_match = profile.expertise.some(s => compact(s) === compact(question.topic)) ? 1 : 0;
    const availability = profile.available === true ? 1 : 0;
    return { expert: profile, specialty_match, condition_match, topic_match, availability,
      match_score: specialty_match * 35 + condition_match * 35 + topic_match * 20 + availability * 10 };
  }).filter(row => row.specialty_match && row.condition_match).sort((a, b) => b.match_score - a.match_score || a.expert.id.localeCompare(b.expert.id));
}

export async function prepareContext(huddle: Huddle, context: ClinicalQuestion, evidence: Evidence[], profiles: Expert[], generate: Generator = structured): Promise<Huddle> {
  const summary = await synthesizeEvidence(context, evidence, generate);
  const ranked = rankExperts(context, profiles);
  const selected = ranked[0];
  return { ...huddle, question: context, status: "ready", response: null, brief: null, sources: evidence,
    expert: selected ? { ...selected.expert, match: selected.match_score } : null,
    intelligence: { understanding: huddle.intelligence?.understanding || "fallback", evidence: summary.mode,
      evidenceClaims: summary.value.evidence_summary, uncertainties: summary.value.uncertainties,
      routing: ranked.map(({ expert: profile, ...scores }) => ({ expertId: profile.id, ...scores })),
      notice: summary.mode === "fallback" ? "Local fallback: supplied source descriptions, not an AI clinical assessment." : "AI summary of supplied snippets. Review citations and uncertainty." } };
}
export const sampleContext = (question: ClinicalQuestion) => /breast/i.test(question.condition) && /oncology/i.test(question.specialty) ? sources : [];
export async function createIntelligentHuddle(question: string, generate: Generator = structured): Promise<Huddle> {
  const understood = await understandQuestion(question, generate);
  const huddle = makeHuddle(question, `demo-${crypto.randomUUID()}`);
  huddle.intelligence = { understanding: understood.mode, evidence: "fallback", evidenceClaims: [], uncertainties: [], routing: [], notice: "" };
  return prepareContext(huddle, understood.value, sampleContext(understood.value), [expert], generate);
}

export async function synthesizeHuddle(huddle: Huddle, response: string, generate: Generator = structured): Promise<Huddle> {
  const fallback = completeHuddle(huddle, response);
  if (huddle.sources.length && (huddle.sources.length !== 3 || huddle.sources.some(source => !["nci-pdq", "nci-trials", "nci-breast"].includes(source.id)))) {
    fallback.brief = { evidence: huddle.sources.map(source => source.snippet), evidenceSourceIds: huddle.sources.map(source => [source.id]),
      takeaways: huddle.sources.map(source => `For your ${huddle.question.topic.toLowerCase()} discussion, review ${source.title}. Supplied context: ${source.snippet}`),
      takeawaySourceIds: huddle.sources.map(source => [source.id]), uncertainty: "These supplied excerpts require source and clinical review. No independent validation or patient-specific assessment was performed.", synthesisLabel: "Template-based fallback · not clinical advice" };
  }
  try {
    if (!huddle.sources.length) throw new Error("No source-grounded synthesis available");
    const value = await generate("huddle_synthesis", SynthesisSchema, "Produce a concise educational brief. Expert response stays a separate opinion section. Use it to focus the takeaways, but cite only supplied evidence. Do not cite expert opinion as evidence. Include uncertainty. Return at most 5 takeaways.", { question: huddle.question, evidence: huddle.sources, expert_response: response });
    validateClaims(value.evidence_summary, huddle.sources);
    validateClaims(value.key_takeaways, huddle.sources);
    if (!value.key_takeaways.length || !value.uncertainties.length) throw new Error("Incomplete synthesis");
    return { ...fallback, brief: { evidence: value.evidence_summary.map(c => c.text), evidenceSourceIds: value.evidence_summary.map(c => c.source_ids),
      takeaways: value.key_takeaways.map(c => c.text), takeawaySourceIds: value.key_takeaways.map(c => c.source_ids),
      uncertainty: value.uncertainties.join(" "), synthesisLabel: "AI synthesis of supplied evidence · expert opinion shown separately · not clinical advice",
      grounding: value.key_takeaways, voiceScript: "" }, };
  } catch { return { ...fallback, brief: { ...fallback.brief!, synthesisLabel: "Template-based fallback · not clinical advice" } }; }
}
