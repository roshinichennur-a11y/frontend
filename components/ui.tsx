import {
  Activity,
  ArrowUpRight,
  Check,
  FileText,
  Info,
  LoaderCircle,
} from "lucide-react";
import type { Evidence, Huddle } from "@/types/huddle";
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <Activity size={21} strokeWidth={1.7} />
      </span>
      PULSEPOINT
    </span>
  );
}
export function LoadingState({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LoaderCircle className="spin" size={17} />
      {label}
    </span>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <Info size={18} />
      <span>{message}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}
export function EvidenceList({ sources, huddle }: { sources: Evidence[]; huddle?: Huddle }) {
  return (
    <div className="evidence-list">
      {sources.map((source, i) => (
        <article className="evidence-card" key={source.id}>
          <div className="source-number">0{i + 1}</div>
          <div className="source-content">
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">{source.type}</span>
              <span className="source-status">
                <Check size={12} />
                {source.verified ? "Source linked" : "Unverified"}
              </span>
            </div>
            <h3>
              <a
                href={/^https?:\/\//.test(source.url) ? source.url : undefined}
                target="_blank"
                rel="noreferrer"
              >
                {source.title}
                <ArrowUpRight size={17} />
              </a>
            </h3>
            <p>{source.snippet}</p>
            {huddle && <div className="source-relevance">
              <p><strong>Why shown:</strong> {source.relevance ? source.relevance.reason : huddle.intelligence?.evidenceClaims.some(claim => claim.source_ids.includes(source.id)) ? "Referenced in this huddle’s evidence context. Check the excerpt for applicability." : "Included in the supplied evidence set. Source-specific relevance has not been assessed."}</p>
              <p><strong>Question being explored:</strong> {huddle.question.question}</p>
            </div>}
            <div className="source-meta">
              <FileText size={13} />
              {source.publisher}
              <span>·</span>
              {source.date}
              {source.identifier && <span> · {source.identifier}</span>}
              {source.publication && <span> · {source.publication}</span>}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
export function FlowSteps({ step, onSelect, locked = false }: { step: number; simple?: boolean; onSelect?: (index: number) => void; locked?: boolean }) {
  return (
    <ol className="flow-steps simple-steps" aria-label="Huddle progress">
      {["Question", "Evidence", "Expert", "Brief"].map((label, i) => (
        <li
          key={label}
          className={i <= step ? "active" : ""}
          aria-current={i === step ? "step" : undefined}
        >
          {onSelect ? <button type="button" aria-current={i === step ? "step" : undefined} disabled={locked && i !== 0} onClick={() => onSelect(i)}>{label}</button> : label}
        </li>
      ))}
    </ol>
  );
}
