import type { Huddle } from "@/types/huddle";

export function NextBestAction({ huddle, onExpert, busy }: { huddle: Huddle; onExpert: () => void; busy: boolean }) {
  return <section className="brief-section next-best-action" id="next-best-action" aria-labelledby="next-action-title">
    <span className="eyebrow">FROM QUESTION TO ENGAGEMENT</span>
    <h3 id="next-action-title">Next Best Action</h3>
    <p>Use the evidence and expert context to choose your next step. These are engagement options, not treatment recommendations.</p>
    <div className="next-action-list">
      {huddle.sources.length > 0 && <div className="next-action-row">
        <div><h4>Clinical Evidence</h4><p>{huddle.sources.length} supplied {huddle.sources.length === 1 ? "reference" : "references"} for your {huddle.question.topic.toLowerCase()} discussion. Review the original sources and their applicability.</p></div>
        <a className="button secondary" href="#brief-sources">View Evidence</a>
      </div>}
      {huddle.expert && <div className="next-action-row">
        <div><h4>Clinical Expert</h4><p>{huddle.expert.name} · {huddle.expert.specialty}</p><p className="small">{huddle.expert.demo ? "Simulated huddle only. No connection to a real clinician is sent." : "Return to the existing huddle to review or add an expert perspective."}</p></div>
        <button className="button primary" disabled={busy} onClick={onExpert}>Continue Expert Huddle</button>
      </div>}
      {!huddle.sources.length && !huddle.expert && <p className="notice">No evidence or expert pathway has been supplied for this question. Review the question context before continuing; no resource or connection is being recommended.</p>}
    </div>
  </section>;
}
