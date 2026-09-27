import type { ClinicalQuestion, Evidence, Huddle, IntentContext, NextAction, Resource } from "../../types/huddle";
const clean = (text: string) => text.trim().toLowerCase();
const unknown = (value: string) => /^(needs review|not classified|general question|unknown)$/i.test(value);
const stop = new Set(["what", "which", "this", "that", "with", "from", "about", "should", "could", "would", "have", "review", "question", "evidence", "clinical", "information", "needed", "needs", "general", "classified", "recently", "changed", "resources"]);

export function extractIntent(context: ClinicalQuestion): IntentContext {
  const text = context.question;
  const resource_need: IntentContext["resource_need"] = [];
  if (/evidence|research|study|studies|trial|changed|update|guideline/i.test(text)) resource_need.push("evidence");
  if (/educat|learn|explain|overview/i.test(text)) resource_need.push("educational");
  if (/approved|product information|labeling|label information/i.test(text)) resource_need.push("approved_product");
  if (/insurance|coverage|reimburs|access|patient support|afford|cost/i.test(text)) resource_need.push("patient_access");
  if (/expert|specialist|\bMSL\b|connect|consult/i.test(text)) resource_need.push("expert");
  if (/follow.up|follow up|clarif/i.test(text)) resource_need.push("follow_up");
  return { clinical_area: unknown(context.specialty) ? null : context.specialty,
    question_type: /changed|recent|latest|new evidence/i.test(text) ? "Clinical update" : resource_need.length ? "Information / engagement request" : null,
    intent: context.intent, information_need: unknown(context.topic) ? null : context.topic,
    resource_need, expertise_needed: resource_need.includes("expert") && !unknown(context.specialty) ? [context.specialty] : [],
    urgency: /\burgent(?:ly)?\b|\bas soon as possible\b|\bASAP\b|\bneed.{0,30}\btoday\b/i.test(text.replace(/\b(?:not urgent|no urgency|not an emergency)\b/gi, "")) ? "explicit_time_sensitive" : "not_stated",
    uncertainties: ["Urgency reflects wording only, not clinical triage.", ...(!resource_need.length ? ["Resource need is not explicit; confirm the intent with the HCP."] : []), ...(unknown(context.condition) ? ["No condition has been established from the question."] : [])] };
}
export function rankEvidence(context: ClinicalQuestion, evidence: Evidence[]): Evidence[] {
  const terms = [...new Set(`${context.topic} ${context.condition} ${context.question}`.toLowerCase().match(/[a-z]{4,}/g) || [])].filter(word => !stop.has(word));
  return [...new Map(evidence.map(source => [source.id, source])).values()].map(source => {
    const title = clean(source.title), snippet = clean(source.snippet);
    const matches = terms.filter(word => new RegExp(`\\b${word}\\b`, "i").test(`${title} ${snippet}`));
    const score = matches.reduce((sum, term) => sum + (new RegExp(`\\b${term}\\b`, "i").test(title) ? 2 : 1), 0);
    return { ...source, relevance: { score, matched_terms: matches,
      reason: matches.length ? `Source text overlaps the question/context: ${matches.join(", ")}. Text overlap is not a clinical applicability assessment.` : "No specific textual overlap was found. Review this supplied reference before using it." } };
  }).sort((a, b) => b.relevance.score - a.relevance.score);
}
export function matchResources(context: ClinicalQuestion, resources: Resource[]): Resource[] {
  const intent = extractIntent(context);
  return [...new Map(resources.map(resource => [resource.id, resource])).values()].flatMap(resource => {
    if (resource.category === "approved_product" && resource.approval_status !== "approved") return [];
    if (!intent.resource_need.includes(resource.category)) return [];
    const overlaps = resource.topics.filter(topic => [context.condition, context.topic].some(value => clean(value) === clean(topic)));
    const specialty = resource.specialties.some(value => clean(value) === clean(context.specialty));
    if (!overlaps.length && !specialty) return [];
    return [{ ...resource, match_reason: `Requested resource category: ${resource.category.replace(/_/g, " ")}. Supplied metadata matches ${overlaps.length ? overlaps.join(", ") : context.specialty}.${resource.demo ? " Sample resource only." : ""}` }];
  });
}
export function nextBestActions(huddle: Huddle): NextAction[] {
  const actions: NextAction[] = [];
  for (const source of huddle.sources) if ((source.relevance?.score || 0) > 0) actions.push({ type: "evidence", title: `Review ${source.title}`, reason: source.relevance!.reason, source_id: source.id });
  const expert = huddle.expert;
  if (expert && (expert.available !== false || huddle.status === "complete")) {
    const overlaps = expert.expertise.filter(topic => [huddle.question.topic, huddle.question.condition].some(value => clean(topic) === clean(value)));
    if (overlaps.length && clean(expert.specialty) === clean(huddle.question.specialty)) actions.push({ type: "expert", title: huddle.status === "complete" ? "Continue Expert Huddle" : "Request Expert Connection", reason: `${expert.specialty} and ${overlaps.join(", ")} match supplied question context.${expert.demo ? " Simulated profile; no real clinician is contacted." : " Availability is not an appointment confirmation."}`, expert_id: expert.id });
  }
  for (const resource of huddle.resources || []) if (resource.match_reason) actions.push({ type: "resource", title: resource.title, reason: resource.match_reason, resource_id: resource.id });
  return actions;
}
export function enrichHuddle(huddle: Huddle, candidates: Resource[] = huddle.resources || []): Huddle {
  const value = { ...huddle, intent_context: extractIntent(huddle.question), sources: rankEvidence(huddle.question, huddle.sources), resources: matchResources(huddle.question, candidates).filter(resource => !resource.source_id || huddle.sources.some(source => source.id === resource.source_id)) };
  const next_best_actions = nextBestActions(value);
  return { ...value, next_best_actions, brief: value.brief ? { ...value.brief, intent_context: value.intent_context, resources: value.resources, next_best_actions } : null };
}
