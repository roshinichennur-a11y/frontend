import type { Huddle } from "../types/huddle";
// Sentence-bound excerpts keep the written briefing short; playback duration varies by voice.
function excerpt(text: string, maxWords: number) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  let result = "";
  for (const sentence of sentences) {
    if (`${result} ${sentence}`.trim().split(/\s+/).length > maxWords) break;
    result += sentence.trim() + " ";
  }
  return result.trim();
}
export function buildVoiceBrief(huddle: Huddle): string {
  const mode = huddle.brief?.synthesisLabel.startsWith("AI") ? "AI-assisted" : "Local template";
  const evidence = excerpt(huddle.brief?.evidence[0] || "", 24) || "Review the supplied resources; no short evidence summary is available.";
  const perspective = excerpt(huddle.response || "", 20) || "Read the full expert response in the written brief.";
  const uncertainty = excerpt(huddle.brief?.uncertainty || "", 16) || "Source applicability and missing context still require review.";
  return `${mode} huddle briefing. PULSEPOINT has ${huddle.sources.length} supplied resources. ${huddle.expert ? (huddle.expert.demo ? "The matched expert is simulated." : "An expert profile is matched; credentials require verification.") : "No expert is matched."} Evidence context: ${evidence} Expert perspective${huddle.expert?.demo ? ", simulated" : ""}: ${perspective} Synthesis: compare the evidence and perspective before your next discussion. Uncertainty: ${uncertainty} This is not a diagnosis or treatment recommendation.`;
}
