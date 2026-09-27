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
});
export const HuddleSchema = z.object({
  id: z.string(),
  intelligence: z.object({
    understanding: z.enum(["ai", "fallback"]), evidence: z.enum(["ai", "fallback"]),
    evidenceClaims: z.array(GroundedClaimSchema), uncertainties: z.array(z.string()),
    routing: z.array(z.object({ expertId: z.string(), specialty_match: z.number(), condition_match: z.number(), topic_match: z.number(), availability: z.number(), match_score: z.number() })),
    notice: z.string(),
  }).optional(),
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
