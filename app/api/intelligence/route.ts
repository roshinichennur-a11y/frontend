import { z } from "zod";
import { HuddleSchema, QuestionSchema, EvidenceSchema, ExpertSchema, ResourceSchema } from "@/types/huddle";
import { createIntelligentHuddle, prepareContext, sampleContext, synthesizeHuddle, synthesizeEvidence, understandQuestion, rankExperts } from "@/lib/intelligence/agents";
import { expert } from "@/data/demo";
import { screenData, privacyStatus } from "@/lib/privacy";
import { buildVoiceBrief } from "@/lib/voiceBrief";

export const runtime = "nodejs";
const Context = QuestionSchema.extend({ question: z.string().trim().min(1).max(2000), specialty: z.string().trim().min(1).max(160), condition: z.string().trim().min(1).max(160), topic: z.string().trim().min(1).max(160), intent: z.string().trim().min(1).max(160) });
const Input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), question: z.string().trim().min(1).max(2000), sources: z.array(EvidenceSchema).max(20).optional(), profiles: z.array(ExpertSchema).max(50).optional(), resources: z.array(ResourceSchema).max(30).optional() }),
  z.object({ action: z.literal("context"), huddle: HuddleSchema, context: Context, sources: z.array(EvidenceSchema).max(20).optional(), profiles: z.array(ExpertSchema).max(50).optional(), resources: z.array(ResourceSchema).max(30).optional() }),
  z.object({ action: z.literal("respond"), huddle: HuddleSchema, response: z.string().trim().min(20).max(4000) }),
  z.object({ action: z.literal("extract"), question: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("evidence"), context: Context, sources: z.array(EvidenceSchema).max(20) }),
  z.object({ action: z.literal("experts"), context: Context, profiles: z.array(ExpertSchema).max(50) }),
]);
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "JSON required" }, { status: 415 });
  const origin = request.headers.get("origin");
  if (origin) {
    let allowed = false;
    try {
      const incoming = new URL(origin);
      const local = new URL(request.url);
      allowed = incoming.origin === local.origin || (incoming.host === request.headers.get("host") && incoming.protocol === local.protocol);
    } catch { /* Reject malformed origins. */ }
    if (!allowed) return Response.json({ error: "Origin not allowed" }, { status: 403 });
  }
  try {
    const raw = await request.text();
    if (raw.length > 100000) return Response.json({ error: "Input too large" }, { status: 413 });
    const body = JSON.parse(raw);
    if (body.syntheticOnly !== true) return Response.json({ error: "Use synthetic demonstration data only" }, { status: 400 });
    const input = Input.parse(screenData(body).value);
    const privacy = privacyStatus(body);
    let result;
    switch (input.action) {
      case "create": result = await createIntelligentHuddle(input.question, undefined, input); break;
      case "extract": result = await understandQuestion(input.question); break;
      case "evidence": result = await synthesizeEvidence(input.context, input.sources); break;
      case "experts": result = rankExperts(input.context, input.profiles); break;
      case "context": result = await prepareContext(input.huddle, { ...input.context, question: input.huddle.question.question }, input.sources ?? sampleContext(input.context), input.profiles ?? [expert], undefined, input.resources ?? input.huddle.resources ?? []); break;
      case "respond": {
        result = await synthesizeHuddle(input.huddle, input.response);
        result.brief!.voiceScript = buildVoiceBrief(result);
        break;
      }
    }
    if (result && typeof result === "object" && !Array.isArray(result) && privacy.detected) result = { ...result, privacy };
    return Response.json(screenData(result).value, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Invalid intelligence request. Check the question and supplied data." }, { status: 400 }); }
}
