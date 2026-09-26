import { ArrowUpRight, CheckCircle2, Clock3, Layers } from "lucide-react";
import type { Huddle } from "@/types/huddle";

export function WorkspaceOverview({
  huddles,
  onShowGraph,
}: {
  huddles: Huddle[];
  onShowGraph: () => void;
}) {
  const completed = huddles.filter((h) => h.status === "complete").length;
  const pending = huddles.filter((h) => h.status === "pending").length;
  const rate = huddles.length
    ? Math.round((completed / huddles.length) * 100)
    : 0;
  return (
    <section className="workspace-overview" aria-labelledby="overview-title">
      <div className="overview-heading">
        <h2 id="overview-title">Huddle overview</h2>
        <button className="text-button" onClick={onShowGraph}>
          Question intelligence <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="overview-grid">
        <div
          className="completion-gauge"
          role="img"
          aria-label={`${rate}% of huddles complete`}
        >
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="48" className="gauge-track" />
            <circle
              cx="60"
              cy="60"
              r="48"
              className="gauge-progress"
              pathLength="100"
              strokeDasharray={`${rate} 100`}
            />
          </svg>
          <div>
            <strong>
              {rate}
              <small>%</small>
            </strong>
            <span>Complete</span>
          </div>
        </div>
        <div className="overview-summary">
          <span className="overview-kicker">YOUR WORKSPACE AT A GLANCE</span>
          <p>
            <strong>{huddles.length} huddles</strong> in this workspace.{" "}
            <strong>{completed} completed</strong> with evidence and an expert
            perspective brought together.
          </p>
          <span className="overview-note">
            Workspace activity only · not a clinical quality score
          </span>
        </div>
        <div className="overview-stat">
          <span className="stat-icon">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <strong>{completed}</strong>
            <span>Completed huddles</span>
          </div>
        </div>
        <div className="overview-stat">
          <span className="stat-icon blue">
            <Clock3 size={18} />
          </span>
          <div>
            <strong>{pending}</strong>
            <span>Awaiting expert response</span>
          </div>
        </div>
      </div>
      <div className="overview-caption">
        <Layers size={13} /> Question → Evidence → Expert → Brief
      </div>
    </section>
  );
}
