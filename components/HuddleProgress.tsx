import { Activity } from "lucide-react";

export const huddleStages = ["Understanding question", "Finding evidence", "Matching expert", "Huddle ready"];

export function HuddleProgress({ step }: { step: number }) {
  return <div className="huddle-progress-overlay">
    <section className="huddle-progress-panel" aria-label="Preparing your huddle">
      <div className="progress-emblem"><Activity size={30} /></div>
      <p className="eyebrow">YOUR HUDDLE IS COMING TOGETHER</p>
      <h2 role="status" aria-live="polite" aria-atomic="true">{huddleStages[step]}</h2>
      <div className="huddle-progress-track" aria-hidden="true"><span style={{width: `${(step + 1) * 25}%`}} /></div>
      <ol className="huddle-stage-list">{huddleStages.map((stage, index) => <li key={stage} className={index <= step ? "reached" : ""} aria-current={index === step ? "step" : undefined}><span aria-hidden="true">{index + 1}</span>{stage}</li>)}</ol>
      <p className="progress-caption">Bringing your question, sources, and expert match into one place.</p>
    </section>
  </div>;
}
