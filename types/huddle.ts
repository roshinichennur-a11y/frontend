import { z } from "zod";
export const QuestionSchema = z.object({
  specialty: z.string(),
  condition: z.string(),
  topic: z.string(),
  intent: z.string(),
  question: z.string(),
  keywords: z.array(z.string()).optional(),
});
export const EvidenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  type: z.string(),
  date: z.string(),
  snippet: z.string(),
  url: z
    .url()
    .refine(
      (url) => /^https?:\/\//.test(url),
      "Source URLs must use HTTP or HTTPS",
    ),
  verified: z.boolean(),
  identifier: z.string().optional(),
  publication: z.string().optional(),
  relevance: z.object({ score: z.number(), matched_terms: z.array(z.string()), reason: z.string() }).optional(),
});
export const ExpertSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  specialty: z.string(),
  expertise: z.array(z.string()),
  credentials: z.array(z.string()).optional(),
  available: z.boolean().optional(),
  match: z.number().min(0).max(100),
  demo: z.boolean(),
});
export const IntentContextSchema = z.object({
  clinical_area: z.string().nullable(), question_type: z.string().nullable(), intent: z.string(),
  information_need: z.string().nullable(), resource_need: z.array(z.enum(["evidence", "educational", "approved_product", "patient_access", "expert", "follow_up"])),
  expertise_needed: z.array(z.string()), urgency: z.enum(["explicit_time_sensitive", "not_stated"]), uncertainties: z.array(z.string()),
});
export const ResourceSchema = z.object({
  id: z.string(), title: z.string(), category: z.enum(["educational", "approved_product", "patient_access"]),
  description: z.string(), url: z.url().refine(url => /^https?:\/\//.test(url)),
  topics: z.array(z.string()), specialties: z.array(z.string()), demo: z.boolean(),
  source_id: z.string().optional(), approval_status: z.enum(["approved", "not_provided"]).optional(),
  match_reason: z.string().optional(),
});
export const NextActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("evidence"), title: z.string(), reason: z.string(), source_id: z.string() }),
  z.object({ type: z.literal("expert"), title: z.string(), reason: z.string(), expert_id: z.string() }),
  z.object({ type: z.literal("resource"), title: z.string(), reason: z.string(), resource_id: z.string() }),
]);
export const GroundedClaimSchema = z.object({ text: z.string(), source_ids: z.array(z.string()), supporting_quotes: z.array(z.object({ source_id: z.string(), quote: z.string() })) });
export const BriefSchema = z.object({
  evidence: z.array(z.string()),
  takeaways: z.array(z.string()),
  takeawaySourceIds: z.array(z.array(z.string())).optional(),
  uncertainty: z.string(),
  synthesisLabel: z.string(),
  evidenceSourceIds: z.array(z.array(z.string())).optional(),
  grounding: z.array(GroundedClaimSchema).optional(),
  voiceScript: z.string().optional(),
  intent_context: IntentContextSchema.optional(),
  resources: z.array(ResourceSchema).optional(),
  next_best_actions: z.array(NextActionSchema).optional(),
});
export const HuddleSchema = z.object({
  id: z.string(),
  intelligence: z.object({
    understanding: z.enum(["ai", "fallback"]), evidence: z.enum(["ai", "fallback"]),
    evidenceClaims: z.array(GroundedClaimSchema), uncertainties: z.array(z.string()),
    routing: z.array(z.object({ expertId: z.string(), specialty_match: z.number(), condition_match: z.number(), topic_match: z.number(), availability: z.number(), match_score: z.number(), reason: z.string().optional() })),
    notice: z.string(),
  }).optional(),
  intent_context: IntentContextSchema.optional(),
  resources: z.array(ResourceSchema).optional(),
  next_best_actions: z.array(NextActionSchema).optional(),
  experts: z.array(ExpertSchema).optional(),
  privacy: z.object({ detected: z.boolean(), categories: z.array(z.string()), external_ai: z.enum(["blocked", "allowed"]), notice: z.string() }).optional(),
  createdAt: z.string(),
  status: z.enum(["ready", "pending", "complete"]),
  question: QuestionSchema,
  sources: z.array(EvidenceSchema),
  expert: ExpertSchema.nullable(),
  response: z.string().nullable(),
  brief: BriefSchema.nullable(),
  demo: z.boolean(),
});
export type ClinicalQuestion = z.infer<typeof QuestionSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Expert = z.infer<typeof ExpertSchema>;
export type Huddle = z.infer<typeof HuddleSchema>;
export type View =
  "home" | "understanding" | "evidence" | "expert" | "brief" | "graph";

export type Resource = z.infer<typeof ResourceSchema>;
export type NextAction = z.infer<typeof NextActionSchema>;
export type IntentContext = z.infer<typeof IntentContextSchema>;
