import type { Huddle } from "@/types/huddle";
import { enrichHuddle } from "@/lib/intelligence/engagement";

export function NextBestAction({ huddle, onExpert, busy }: { huddle: Huddle; onExpert: () => void; busy: boolean }) {
  const actions = huddle.next_best_actions ?? enrichHuddle(huddle).next_best_actions ?? [];
  const evidence = actions.filter(action => action.type === "evidence" && huddle.sources.some(source => source.id === action.source_id));
  const expertAction = actions.find(action => action.type === "expert" && action.expert_id === huddle.expert?.id);
  const resources = actions.flatMap(action => {
    if (action.type !== "resource") return [];
    const resource = huddle.resources?.find(item => item.id === action.resource_id);
    return resource ? [{ action, resource }] : [];
  });
  return <section className="brief-section next-best-action" id="next-best-action" aria-labelledby="next-action-title">
    <span className="eyebrow">FROM QUESTION TO ENGAGEMENT</span>
    <h3 id="next-action-title">Next Best Action</h3>
    <p>Use the evidence and expert context to choose your next step. These are engagement options, not treatment recommendations.</p>
    <div className="next-action-list">
      {evidence.length > 0 && <div className="next-action-row">
        <div><h4>Clinical Evidence</h4><p>{evidence.length} supplied {evidence.length === 1 ? "reference" : "references"} with question/context overlap. Review the original sources and their applicability.</p>
          <details><summary>Why these evidence actions?</summary>{evidence.map((action, index) => <p key={index}><strong>{action.title}</strong><br />{action.reason}</p>)}</details>
        </div>
        <a className="button secondary" href="#brief-sources">View Evidence</a>
      </div>}
      {expertAction && huddle.expert && <div className="next-action-row">
        <div><h4>Clinical Expert</h4><p>{huddle.expert.name} · {huddle.expert.specialty}</p><p className="small">{expertAction.reason}</p><p className="small">{huddle.expert.demo ? "Simulated huddle only. No connection to a real clinician is sent." : "Return to the existing huddle to review or add an expert perspective."}</p></div>
        <button className="button primary" disabled={busy} onClick={onExpert}>Continue Expert Huddle</button>
      </div>}
      {resources.map(({ action, resource }) => <div className="next-action-row" key={resource.id}>
        <div><h4>{resource.title}</h4><p>{action.reason}</p><p>{resource.description}</p>
          {resource.demo && <span className="pill">Sample resource</span>}
          {resource.category === "approved_product" && <p className="small">Approval status supplied by the catalog; not independently verified.</p>}
        </div>
        <a className="button secondary" href={resource.url} target="_blank" rel="noreferrer">{resource.category === "patient_access" ? "View Support Information" : "View Resource"}</a>
      </div>)}
      {!evidence.length && !expertAction && !resources.length && <p className="notice">No evidence or expert pathway has been supplied for this question. Review the question context before continuing; no resource or connection is being recommended.</p>}
    </div>
  </section>;
}
