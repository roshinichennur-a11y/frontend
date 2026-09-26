"use client";
import { useState } from "react";
import type { ClinicalQuestion, Huddle } from "@/types/huddle";

export function QuestionUnderstanding({ huddle, onConfirm }: {
  huddle: Huddle; onConfirm: (context: ClinicalQuestion) => void;
}) {
  const [context, setContext] = useState(huddle.question);
  const fields = ["specialty", "condition", "topic", "intent"] as const;
  const changed = fields.some(field => context[field].trim() !== huddle.question[field]);
  return <form className="understanding-panel" onSubmit={event => {
    event.preventDefault();
    onConfirm({ ...context, ...Object.fromEntries(fields.map(field => [field, context[field].trim()])) });
  }}>
    <h2>Review your question’s context</h2>
    <p>Correct any details before continuing. Your confirmed context stays with this huddle.</p>
    <blockquote>{huddle.question.question}</blockquote>
    <div className="extraction-grid">
      {fields.map(field => <label className="extraction-item" key={field}>
        <span className="field-label">{field[0].toUpperCase() + field.slice(1)}</span>
        <input required maxLength={160} value={context[field]}
          onChange={event => setContext({ ...context, [field]: event.target.value })} />
      </label>)}
    </div>
    {changed && (huddle.response || huddle.brief) && <p className="notice">Confirming changed context clears the previous response and brief so the next conversation uses the corrected details.</p>}
    <div className="panel-actions"><button className="button primary" type="submit"
      disabled={fields.some(field => !context[field].trim())}>Confirm context</button></div>
  </form>;
}
