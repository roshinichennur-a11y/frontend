"use client";
import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Headphones,
  Pause,
  ArrowUpRight,
  ShieldCheck,
  Info,
} from "lucide-react";
import type { Huddle } from "@/types/huddle";
import { buildVoiceBrief } from "@/lib/voiceBrief";
import { NextBestAction } from "./NextBestAction";
import { ExpertDetails } from "./ExpertDetails";

export function HuddleBrief({ huddle, onExpert, busy }: { huddle: Huddle; onExpert: () => void; busy: boolean }) {
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );
  if (!huddle.brief)
    return <section className="understanding-panel"><h2>Your brief is not ready yet</h2><p>Open Expert to add a response and create the brief. You can review Question and Evidence while you wait.</p></section>;
  const brief = huddle.brief;
  const voiceScript = brief.voiceScript || buildVoiceBrief(huddle);
  const text = `PULSEPOINT — CLINICAL HUDDLE BRIEF\n${brief.synthesisLabel}\n\nQUESTION\n${huddle.question.question}\n\nEVIDENCE\n${brief.evidence.join("\n")}\n\nEXPERT PERSPECTIVE${huddle.expert?.demo ? " (FICTIONAL EXPERT)" : ""}\n${huddle.response}\n\nKEY TAKEAWAYS\n${brief.takeaways.map((t, i) => `• ${t}\n${huddle.sources.filter(s => brief.takeawaySourceIds?.[i]?.includes(s.id)).map(s => `${s.title}: ${s.url}`).join("\n")}`).join("\n")}\n\nUNCERTAINTY\n${brief.uncertainty}\n\nNEXT BEST ACTION\n${huddle.sources.length ? "Review the supplied evidence references below." : "No evidence pathway supplied."}\n${huddle.expert ? `Continue the huddle with ${huddle.expert.name}${huddle.expert.demo ? " (simulated; no real clinician is contacted)" : ""}.` : "No expert pathway supplied."}\nEngagement options, not treatment recommendations.\n\nSOURCES\n${huddle.sources.map((s) => `${s.title}\n${s.url}`).join("\n\n")}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Brief copied to clipboard.");
    } catch {
      setNotice("Clipboard is unavailable. Use Download brief instead.");
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "pulsepoint-huddle-brief.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function speak() {
    if (!("speechSynthesis" in window)) {
      setNotice(
        "Audio playback is unavailable in this browser. The full response is shown below.",
      );
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      voiceScript,
    );
    utterance.rate = 1.05;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setNotice("Audio could not play. Read the response below.");
    };
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    } catch {
      setSpeaking(false);
      setNotice("Audio could not play. Open Read voice briefing for the full narration.");
    }
  }
  return (
    <div className="brief-layout">
      <article className="brief-paper">
        <div className="brief-masthead">
          <span className="eyebrow">PULSEPOINT / CLINICAL HUDDLE BRIEF</span>
          <span className="complete-label">
            <Check size={14} /> Huddle complete
          </span>
        </div>
        <div className="brief-question">
          <span className="eyebrow">CLINICAL QUESTION</span>
          <h2>{huddle.question.question}</h2>
          <p><strong>Intent:</strong> {huddle.question.intent} · <strong>Information needed:</strong> {huddle.question.topic}</p>
          <div className="flex flex-wrap gap-2">
            <span className="pill">{huddle.question.specialty}</span>
            <span className="pill">{huddle.question.topic}</span>
          </div>
          <a className="button secondary brief-action-jump" href="#next-best-action">Choose your next step</a>
        </div>
        <section className="brief-section">
          <div className="brief-section-heading">
            <h3>Key Evidence</h3>
            <span className="tiny-tag">{brief.synthesisLabel.startsWith("AI") ? "AI SUMMARY · REVIEW SOURCES" : "SUPPLIED SOURCE CONTEXT"}</span>
          </div>
          {brief.evidence.map((line, index) => (
            <div key={index}><p>{line}</p><div className="inline-citations">{huddle.sources.filter(source => brief.evidenceSourceIds?.[index]?.includes(source.id)).map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</div></div>
          ))}
          <div className="inline-citations">
            {huddle.sources.map((s, i) => (
              <a key={s.id} href={s.url} target="_blank" rel="noreferrer">
                [{i + 1}] {s.publisher}
                <ArrowUpRight size={12} />
              </a>
            ))}
          </div>
        </section>
        <section className="brief-section">
          <div className="brief-section-heading">
            <h3>Expert perspective</h3>
            <span className="tiny-tag">
              {huddle.expert?.demo ? "SIMULATED OPINION" : "EXPERT OPINION"}
            </span>
          </div>
          <blockquote>{huddle.response}</blockquote>
          <ExpertDetails huddle={huddle} />
          <div className="expert-byline">
            <span className="avatar small-avatar">
              {huddle.expert?.initials}
            </span>
            <span>
              {huddle.expert?.name}
              <small>
                {huddle.expert?.demo
                  ? "Fictional expert"
                  : huddle.expert?.specialty}
              </small>
            </span>
          </div>
        </section>
        <section className="brief-section takeaways">
          <div className="brief-section-heading">
            <h3>Key takeaways</h3>
            <span className="tiny-tag">
              {brief.synthesisLabel.startsWith("AI") ? "AI SYNTHESIS" : "TEMPLATE SYNTHESIS"}
            </span>
          </div>
          <ul>
            {brief.takeaways.map((t, index) => {
              const references = huddle.sources.filter(source => brief.takeawaySourceIds?.[index]?.includes(source.id));
              return <li key={`${index}-${t}`}>
                <Check size={16} />
                <div><p>{t}</p>
                  <div className="inline-citations" aria-label={`References for takeaway ${index + 1}`}>
                    {references.map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={12} /></a>)}
                  </div>
                  {!!brief.grounding?.[index]?.supporting_quotes.length && <details><summary>See supporting excerpts</summary>{brief.grounding[index].supporting_quotes.map((item, i) => <blockquote key={i}>{item.quote}</blockquote>)}</details>}
                  <small>{references.length ? (huddle.demo ? "Suggested reading for this takeaway · not a verified clinical conclusion" : "Linked evidence") : "No supporting source linked to this takeaway."}</small>
                </div>
              </li>;
            })}
          </ul>
        </section>
        <section className="uncertainty">
          <Info size={20} />
          <div>
            <h3>What remains uncertain</h3>
            <p>{brief.uncertainty}</p>
          </div>
        </section>
        {!!huddle.resources?.length && <section className="brief-section"><h3>Relevant resources</h3>{huddle.resources.map(resource => <p key={resource.id}><a href={resource.url} target="_blank" rel="noreferrer">{resource.title}</a> — {resource.description}{resource.demo ? " (sample resource)" : ""}</p>)}</section>}
        {huddle.resources?.some(resource => resource.category === "patient_access") && <section className="brief-section"><h3>Patient-access considerations</h3>{huddle.resources.filter(resource => resource.category === "patient_access").map(resource => <p key={resource.id}>{resource.description} No eligibility, coverage, or enrollment is confirmed.</p>)}</section>}
        <NextBestAction huddle={huddle} onExpert={onExpert} busy={busy} />
        <section className="brief-section sources-section" id="brief-sources" tabIndex={-1}>
          <h3>Sources & references</h3>
          <ol>
            {huddle.sources.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                  <ArrowUpRight size={14} />
                </a>
                <small>
                  {s.publisher} · {s.date}
                </small>
              </li>
            ))}
          </ol>
        </section>
        <footer className="brief-footer">
          <ShieldCheck size={15} />
          {brief.synthesisLabel}
        </footer>
      </article>
      <aside className="brief-aside">
        <div className="eyebrow">YOUR ENGAGEMENT PATHWAY</div>
        <h3>
          Keep the context.
          <br />
          Carry it forward.
        </h3>
        <p>Evidence, perspective, and uncertainty in one place.</p>
        <button className="button primary full" onClick={download}>
          <Download size={16} /> Download brief
        </button>
        <button className="button secondary full" onClick={copy}>
          <Copy size={16} /> Copy brief
        </button>
        <div className="audio-card">
          <Headphones size={23} />
          <h4>Listen to your huddle</h4>
          <p>
            Synthetic voice briefing, approximately 45–60 seconds. Playback speed varies by device.
          </p>
          <button className="text-button" onClick={speak}>
            {speaking ? <Pause size={15} /> : <Headphones size={15} />}{" "}
            {speaking ? "Stop playback" : "Play huddle"}
          </button>
          <details className="voice-transcript"><summary>Read voice briefing</summary><p>{voiceScript}</p></details>
        </div>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
      </aside>
    </div>
  );
}
