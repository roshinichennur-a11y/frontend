import { HuddleSchema, type Huddle, type ClinicalQuestion } from "../types/huddle";
import { makeHuddle, completeHuddle, sources, expert } from "../data/demo";
export const isLive = process.env.NEXT_PUBLIC_API_MODE === "live";
const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request(path: string, body: unknown): Promise<Huddle> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const result = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!result.ok)
      throw new Error(
        `The service returned ${result.status}. Please retry or switch to the demo.`,
      );
    const parsed = HuddleSchema.safeParse(await result.json());
    if (!parsed.success)
      throw new Error(
        "The service response does not match the agreed huddle format.",
      );
    return parsed.data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error(
        "The service took too long. Please retry or switch to the demo.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function intelligence(body: unknown, fallback: Huddle): Promise<Huddle> {
  if (typeof window === "undefined") return fallback;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const result = await fetch("/api/intelligence", { method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(body as object), syntheticOnly: true }) });
    if (!result.ok) throw new Error("Intelligence unavailable");
    return HuddleSchema.parse(await result.json());
  } catch {
    return { ...fallback, intelligence: { understanding: "fallback", evidence: "fallback", evidenceClaims: [], uncertainties: ["The intelligence service is unavailable."], routing: [], notice: "Local fallback: intelligence service unavailable. Your question and response are preserved." } };
  } finally { clearTimeout(timer); }
}

export const huddleApi = {
  async create(question: string, forceDemo = false): Promise<Huddle> {
    if (!question.trim() || question.length > 2000)
      throw new Error("Enter a question between 1 and 2,000 characters.");
    return isLive && !forceDemo
      ? request("/huddles", { question })
      : forceDemo ? makeHuddle(question.trim(), `demo-${crypto.randomUUID()}`) : intelligence({ action: "create", question: question.trim() }, makeHuddle(question.trim(), `demo-${crypto.randomUUID()}`));
  },
  async confirm(huddle: Huddle, context: ClinicalQuestion): Promise<Huddle> {
    const supported = /breast/i.test(context.condition) && /oncology/i.test(context.specialty);
    const fallback: Huddle = { ...huddle, question: context, status: "ready", response: null, brief: null,
      sources: huddle.demo && supported ? sources : [], expert: huddle.demo && supported ? expert : null, intelligence: undefined };
    return huddle.demo ? intelligence({ action: "context", huddle, context }, fallback) : fallback;
  },
  async requestExpert(huddle: Huddle): Promise<Huddle> {
    return huddle.demo
      ? { ...huddle, status: "pending" }
      : request(`/huddles/${encodeURIComponent(huddle.id)}/request`, {});
  },
  async respond(huddle: Huddle, response: string): Promise<Huddle> {
    if (response.trim().length < 20 || response.length > 4000)
      throw new Error(
        "Please enter a response between 20 and 4,000 characters.",
      );
    return huddle.demo
      ? intelligence({ action: "respond", huddle, response: response.trim() }, completeHuddle(huddle, response.trim()))
      : request(`/huddles/${encodeURIComponent(huddle.id)}/response`, {
          response: response.trim(),
        });
  },
};
