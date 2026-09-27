"use client";
import { useState } from "react";
import type { ClinicalQuestion, Huddle } from "@/types/huddle";

export function QuestionUnderstanding({ huddle, onConfirm, busy }: {
  huddle: Huddle; busy: boolean; onConfirm: (context: ClinicalQuestion) => void;
}) {
  const [context, setContext] = useState(huddle.question);
  const fields = ["specialty", "condition", "topic", "intent"] as const;
  const labels = { specialty: "Clinical area", condition: "Relevant context", topic: "Information needed", intent: "Intent" };
  const changed = fields.some(field => context[field].trim() !== huddle.question[field]);
  return <form className="understanding-panel" onSubmit={event => {
    event.preventDefault();
    onConfirm({ ...context, ...Object.fromEntries(fields.map(field => [field, context[field].trim()])) });
  }}>
    <h2>Understanding your question</h2>
    <p>Correct any details before continuing. Your confirmed context stays with this huddle.</p>
    <p className="small muted">{huddle.intelligence?.understanding === "ai" ? "AI-extracted context · confirm or correct the fields below" : "Local classification · confirm or correct the fields below"}</p>
    <blockquote>{huddle.question.question}</blockquote>
    {!!huddle.question.keywords?.length && <p className="small muted">Keywords: {huddle.question.keywords.join(", ")}</p>}
    <div className="extraction-grid">
      {fields.map(field => <label className="extraction-item" key={field}>
        <span className="field-label">{labels[field]}</span>
        <input aria-label={field[0].toUpperCase() + field.slice(1)} disabled={busy} required maxLength={160} value={context[field]}
          onChange={event => setContext({ ...context, [field]: event.target.value })} />
      </label>)}
    </div>
    {changed && (huddle.response || huddle.brief) && <p className="notice">Confirming changed context clears the previous response and brief so the next conversation uses the corrected details.</p>}
    <div className="panel-actions"><button className="button primary" type="submit"
      disabled={busy || fields.some(field => !context[field].trim())}>{busy ? "Confirming context…" : "Confirm context"}</button></div>
  </form>;
}
