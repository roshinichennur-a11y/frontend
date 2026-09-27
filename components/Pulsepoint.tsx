"use client";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  Home,
  Info,
  Network,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { HuddleSchema, type Huddle, type View } from "@/types/huddle";
import { initialHuddles, makeHuddle, completeHuddle, sources, expert } from "@/data/demo";
import { HuddleActions } from "./HuddleActions";
import { huddleApi, isLive } from "@/lib/api";
import { Brand, ErrorState, EvidenceList, FlowSteps, LoadingState } from "./ui";
import { QuestionInput } from "./QuestionInput";
import { ExpertResponse } from "./ExpertResponse";
import { HuddleBrief } from "./HuddleBrief";
import { QuestionGraph } from "./QuestionGraph";
import { HuddleProgress } from "./HuddleProgress";
import { QuestionUnderstanding } from "./QuestionUnderstanding";
import { ExpertDetails } from "./ExpertDetails";
import type { ClinicalQuestion } from "@/types/huddle";

const SESSION_KEY = "pulsepoint-demo-v1";
const viewTitles: Record<View, string> = {
  home: "My Huddles",
  understanding: "Question Understanding",
  evidence: "Evidence & Expert",
  expert: "Expert Workspace",
  brief: "Huddle Brief",
  graph: "Question Graph",
};

export function Pulsepoint() {
  const [view, setView] = useState<View>("home");
  const [question, setQuestion] = useState("");
  const [huddles, setHuddles] = useState<Huddle[]>(initialHuddles);
  const [current, setCurrent] = useState<Huddle | null>(null);
  const [busy, setBusy] = useState(false);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [progressStep, setProgressStep] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [help, setHelp] = useState(false);
  const [forceDemo, setForceDemo] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = HuddleSchema.array().safeParse(JSON.parse(saved));
        if (parsed.success) setHuddles(parsed.data.filter((h) => h.demo).map(h => ({
          ...h,
          expert: h.expert?.id === expert.id ? { ...h.expert, credentials: expert.credentials } : h.expert,
          sources: h.sources.map(source => ({ ...source, snippet: source.snippet.replace(/\bdemo\b/gi, "sample") })),
          response: h.response?.replace("For this demo,", "For this sample case,") ?? null,
          brief: h.brief ? {
            ...h.brief,
            ...(!h.brief.takeawaySourceIds ? completeHuddle(h, h.response || "").brief : {}),
            synthesisLabel: h.brief.synthesisLabel.replace(/\bdemo\s*/gi, ""),
            evidence: h.brief.evidence.map(line => line.replace(/\bdemo\b/gi, "sample collection")),
            takeaways: h.brief.takeawaySourceIds ? h.brief.takeaways : completeHuddle(h, h.response || "").brief!.takeaways,
          } : null,
        })));
      }
    } catch {
      /* Session storage can be unavailable in private browsers. */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) {
      try {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify(huddles.filter((h) => h.demo).slice(0, 30)),
        );
      } catch {
        /* The in-memory demo remains usable. */
      }
    }
  }, [huddles, hydrated]);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);
  useEffect(() => {
    if (help) helpDialog.current?.showModal();
    else helpDialog.current?.close();
  }, [help]);
  function navigate(next: View) {
    if (busy) return;
    setError("");
    setView(next);
  }
  function save(huddle: Huddle) {
    setCurrent(huddle);
    setHuddles((old) =>
      [huddle, ...old.filter((h) => h.id !== huddle.id)].slice(0, 30),
    );
  }
  async function confirmContext(context: ClinicalQuestion) {
    if (!current || busy) return;
    const changed = JSON.stringify(context) !== JSON.stringify(current.question);
    if (!changed) { setView("evidence"); return; }
    setBusy(true);
    setError("");
    try {
      const updated = await huddleApi.confirm(current, context);
      setResponseDrafts(old => ({ ...old, [current.id]: "" }));
      save(updated);
      setView("evidence");
    } catch { setError("Context could not be saved. Please try again."); }
    finally { setBusy(false); }
  }
  function newHuddle() {
    if (busy) return;
    setCurrent(null);
    setQuestion("");
    setError("");
    setView("home");
    setTimeout(() => document.getElementById("clinical-question")?.focus(), 0);
  }
  async function create(demo = forceDemo) {
    setBusy(true);
    setProgressStep(0);
    setError("");
    try {
      const huddle = await huddleApi.create(question, demo);
      const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500;
      for (let step = 0; step < 4; step++) {
        setProgressStep(step);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      save(huddle);
      setView("understanding");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn’t prepare your huddle. Please try again.",
      );
    } finally {
      setProgressStep(null);
      setBusy(false);
    }
  }
  async function requestExpert() {
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      save(await huddleApi.requestExpert(current));
      setView("expert");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The request could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function respond(text: string) {
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      save(await huddleApi.respond(current, text));
      setView("brief");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The brief could not be completed. Your response is still here.",
      );
    } finally {
      setBusy(false);
    }
  }
  function open(huddle: Huddle) {
    setCurrent(huddle);
    setError("");
    setView(
      huddle.status === "complete"
        ? "brief"
        : huddle.status === "pending"
          ? "expert"
          : "evidence",
    );
  }
  const filtered = huddles.filter(
    (h) =>
      (filter === "all" || h.status === filter) &&
      `${h.question.topic} ${h.question.question}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const demoMode = !isLive || forceDemo;

  return (
    <div className="app-shell">
      {progressStep !== null && <HuddleProgress step={progressStep} />}
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          className="brand-link"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
          aria-label="PULSEPOINT home"
        >
          <Brand />
        </a>
        <div className="workspace-label">
          <span className="workspace-symbol">P</span>
          <div>
            Clinical workspace
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          <button
            className={view === "home" ? "active" : ""}
            onClick={() => navigate("home")}
            disabled={busy}
          >
            <Home size={18} /> My Huddles
            <span className="nav-count">{huddles.length}</span>
          </button>
          <button
            className={view === "expert" ? "active" : ""}
            onClick={() => {
              const pending = huddles.find((h) => h.status === "pending");
              if (pending) open(pending);
              else navigate("expert");
            }}
            disabled={busy}
          >
            <Users size={18} /> Expert Workspace
            {huddles.some((h) => h.status === "pending") && (
              <span className="pending-dot" />
            )}
          </button>
          <button
            className={view === "graph" ? "active" : ""}
            onClick={() => navigate("graph")}
            disabled={busy}
          >
            <Network size={18} /> Question Graph
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="help-button" onClick={() => setHelp(true)}>
            <CircleHelp size={17} /> About this demo <ArrowUpRight size={14} />
          </button>
          <div className="user-profile">
            <span className="avatar">HC</span>
            <div>
              HCP workspace<small>Clinician view</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <button onClick={() => navigate("home")} disabled={busy}>Workspace</button><ChevronRight size={13} />
            {view !== "home" && view !== "graph" && <><button onClick={() => navigate("home")} disabled={busy}>My Huddles</button><ChevronRight size={13} /></>}
            <span aria-current="page">{viewTitles[view]}</span>
          </nav>
          <div className="topbar-actions">
            <button
              className="button secondary compact"
              onClick={newHuddle}
              disabled={busy}
            >
              <Plus size={15} /> New huddle
            </button>
          </div>
        </header>
        <main id="main-content" className={`main-content view-${view}`}>
          {view === "home" ? (
            <>
              <div className="page-intro">
                <h1 ref={heading} tabIndex={-1}>{viewTitles[view]}</h1>
                <p>
                  The clinical question you couldn’t ask in 30 seconds.
                  <br className="desktop-break" /> Bring it here. We’ll help you
                  find the next conversation.
                </p>
              </div>
              <div className="home-grid">
                <QuestionInput
                  value={question}
                  onChange={setQuestion}
                  onSubmit={() => void create()}
                  busy={busy}
                />
              </div>
              {error && (
                <ErrorState message={error} retry={() => void create()} />
              )}
              {error && isLive && (
                <button
                  className="button secondary"
                  onClick={() => {
                    setForceDemo(true);
                    void create(true);
                  }}
                >
                  Use sample workflow
                </button>
              )}
              <section className="recent-section">
                <div className="section-label">
                  <div>
                    <span className="eyebrow">PICK UP THE CONVERSATION</span>
                    <h2>Huddle timeline</h2>
                  </div>
                  <label className="search-field">
                    <Search size={15} />
                    <input
                      aria-label="Search huddles"
                      placeholder="Search huddles"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
                <div
                  className="recent-filters"
                  role="group"
                  aria-label="Filter huddles"
                >
                  {[
                    { key: "all", label: "All huddles" },
                    { key: "complete", label: "Completed" },
                    { key: "pending", label: "Awaiting response" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      aria-pressed={filter === item.key}
                      className={filter === item.key ? "active" : ""}
                      onClick={() => setFilter(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="huddle-table">
                  <div className="table-header">
                    <span>CLINICAL QUESTION</span>
                    <span>STATUS</span>
                    <span>SPECIALTY</span>
                    <span />
                  </div>
                  {filtered.map((h) => (
                    <div className="huddle-entry" key={h.id}>
                    <button
                      key={h.id}
                      className={`huddle-row timeline-${h.status}`}
                      onClick={() => open(h)}
                      disabled={busy}
                    >
                      <span className="timeline-date">
                        {new Date(h.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        })}
                      </span>
                      <span className="huddle-name">
                        <span className="document-icon">
                          <FileText size={19} />
                        </span>
                        <span>
                          {h.question.topic}
                          <small>
                            {h.demo ? "Sample case" : "Connected huddle"} ·{" "}
                            {h.sources.length} sources
                          </small>
                        </span>
                      </span>
                      <span className={`status ${h.status}`}>
                        {h.status === "complete" ? (
                          <Check size={13} />
                        ) : (
                          <Clock3 size={13} />
                        )}{" "}
                        {h.status === "complete"
                          ? "Huddle complete"
                          : h.status === "pending"
                            ? "Awaiting expert"
                            : "Ready to review"}
                      </span>
                      <span className="timeline-question">
                        {h.question.question}
                      </span>
                      <span className="specialty-cell">
                        {h.question.specialty}
                      </span>
                      <ArrowUpRight size={17} />
                    </button>
                    <HuddleActions huddle={h} disabled={busy} onEdit={text => {
                      const updated = { ...makeHuddle(text, h.id), createdAt: h.createdAt };
                      setHuddles(old => old.map(item => item.id === h.id ? updated : item));
                      if(current?.id === h.id) setCurrent(updated);
                    }} onDelete={() => {
                      setHuddles(old => old.filter(item => item.id !== h.id));
                      if(current?.id === h.id) setCurrent(null);
                    }} />
                    </div>
                  ))}
                  {!filtered.length && (
                    <div className="empty-state">
                      <Search size={24} />
                      <h3>No huddles found</h3>
                      <p>Try another search or start a new question.</p>
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="subpage-heading">
                <div>
                  <button
                    className="back-button"
                    onClick={() => navigate("home")}
                    disabled={busy}
                  >
                    <ArrowLeft size={14} /> My Huddles
                  </button>
                  {view !== "brief" && <span className="eyebrow">
                    {view === "graph"
                      ? "THE BIGGER PICTURE"
                      : "CONTEXT MAKES THE DIFFERENCE"}
                  </span>}
                  <h1 ref={heading} tabIndex={-1}>{viewTitles[view]}</h1>
                  <p>
                    {view === "graph"
                      ? "Turn individual questions into a shared understanding of what matters."
                      : view === "brief"
                        ? "Your question, the evidence, and an expert perspective—all in one place."
                        : view === "expert"
                          ? "A focused question deserves a thoughtful response."
                          : "A little structure makes room for a more useful conversation."}
                  </p>
                </div>
                {view !== "graph" && (
                  <FlowSteps
                    simple={view === "expert" || view === "brief"}
                    locked={busy || view === "understanding"}
                    onSelect={current ? index => navigate((["understanding", "evidence", "expert", "brief"] as View[])[index]) : undefined}
                    step={
                      view === "understanding"
                        ? 0
                        : view === "evidence"
                          ? 1
                          : view === "expert"
                            ? 2
                            : 3
                    }
                  />
                )}
              </div>
              {error && <ErrorState message={error} />}
              {current?.intelligence?.notice && view !== "graph" && <p className="notice" role="status">{current.intelligence.notice}</p>}
              {view === "understanding" && current && (
                <QuestionUnderstanding key={current.id + JSON.stringify(current.question)} huddle={current} busy={busy} onConfirm={confirmContext} />
              )}
              {view === "evidence" && current && (
                <>
                  <div className="question-strip">
                    <span className="eyebrow">YOUR QUESTION</span>
                    <p>{current.question.question}</p>
                  </div>
                  <div className="two-column">
                    <section>
                      <div className="section-label">
                        <h2>
                          Evidence to explore{" "}
                          <span className="count-tag">
                            {current.sources.length}
                          </span>
                        </h2>
                        <span className="small muted">
                          {current.demo
                            ? "Curated resources"
                            : "Retrieved sources"}
                        </span>
                      </div>
                      {!!current.intelligence?.evidenceClaims.length && <section className="expert-details">
                        <h3>Evidence context</h3>
                        {current.intelligence.evidenceClaims.map((claim, index) => <div key={index}><p>{claim.text}</p><div className="inline-citations">{current.sources.filter(s => claim.source_ids.includes(s.id)).map(s => <a key={s.id} href={s.url} target="_blank" rel="noreferrer">{s.title}</a>)}</div></div>)}
                        <p>{current.intelligence.uncertainties.join(" ")}</p>
                      </section>}
                      {current.sources.length ? (
                        <EvidenceList sources={current.sources} />
                      ) : (
                        <div className="empty-state">
                          <BookOpen size={28} />
                          <h3>No matching evidence available</h3>
                          <p>
                            The sample collection covers breast cancer. Use
                            the sample question to explore the complete flow.
                          </p>
                          <button
                            className="button secondary"
                            onClick={newHuddle}
                          >
                            Start another question
                          </button>
                        </div>
                      )}
                      <p className="source-disclaimer">
                        <Info size={15} />
                        Source links are reference material, not a
                        patient-specific recommendation.
                      </p>
                    </section>
                    <aside className="expert-card">
                      <span className="eyebrow">YOUR EXPERT MATCH</span>
                      {current.expert ? (
                        <>
                          <div className="expert-card-profile">
                            <span className="avatar expert-avatar">
                              {current.expert.initials}
                            </span>
                            <h2>{current.expert.name}</h2>
                            <p>{current.expert.specialty}</p>
                            <span className="pill">
                              {current.expert.demo
                                ? "Fictional profile"
                                : "Matched expert"}
                            </span>
                          </div>
                          <div className="match-score">
                            <strong>
                              {current.expert.match}
                              <span>%</span>
                            </strong>
                            <div>
                              Relevance match
                              <small>
                                Relevance score, not medical certainty
                              </small>
                            </div>
                          </div>
                          <div className="expert-tags">
                            {current.expert.expertise.map((t) => (
                              <span key={t}>{t}</span>
                            ))}
                          </div>
                          <ExpertDetails huddle={current} />
                          <div className="expert-context">
                            <Check size={16} />
                            <p>
                              {current.expert.demo
                                ? "A simulated expert is ready for this huddle."
                                : "Request an expert perspective on this question."}
                            </p>
                          </div>
                          <button
                            className="button primary full"
                            onClick={requestExpert}
                            disabled={busy}
                          >
                            {busy ? (
                              <LoadingState label="Preparing request" />
                            ) : (
                              <>
                                Request huddle <ArrowRight size={16} />
                              </>
                            )}
                          </button>
                          <p className="small muted centered">
                            {current.demo
                              ? "Opens the expert workspace"
                              : "Sends to your connected service"}
                          </p>
                        </>
                      ) : (
                        <div className="empty-state">
                          <Users size={28} />
                          <h3>No expert match</h3>
                          <p>There is no seeded expert for this question.</p>
                        </div>
                      )}
                    </aside>
                  </div>
                </>
              )}
              {view === "expert" &&
                (current?.status === "pending" ||
                  current?.status === "complete") && (
                  <ExpertResponse
                    key={current.id}
                    huddle={current}
                    draft={responseDrafts[current.id] ?? current.response ?? ""}
                    onDraftChange={text => setResponseDrafts(old => ({ ...old, [current.id]: text }))}
                    busy={busy}
                    onSubmit={(text) => void respond(text)}
                  />
                )}
              {view === "expert" &&
                !(
                  current?.status === "pending" ||
                  current?.status === "complete"
                ) && (
                  <div className="empty-state">
                    <Users size={32} />
                    <h2>No huddle requests yet</h2>
                    <p>
                      Start a question and request an expert huddle to try this
                      workspace.
                    </p>
                    <button className="button primary" onClick={newHuddle}>
                      Start a huddle <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              {view === "brief" && current && (
                <HuddleBrief key={current.id} huddle={current} />
              )}
              {view === "graph" && <QuestionGraph huddles={huddles} onOpen={open} />}
            </>
          )}
          <footer className="page-footer">
            <span>
              <Activity size={14} /> PULSEPOINT
            </span>
            <span>
              {demoMode
                ? "Sample content. Not for clinical use."
                : "Integration preview. Not for clinical use."}
            </span>
            <button onClick={() => setHelp(true)}>
              About this demo <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>
      <dialog
        ref={helpDialog}
        onCancel={() => setHelp(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setHelp(false);
        }}
        className="help-dialog"
      >
        <div className="dialog-heading">
          <Brand />
          <button
            className="icon-button"
            aria-label="Close about dialog"
            onClick={() => setHelp(false)}
          >
            <X size={20} />
          </button>
        </div>
        <h2>A clinical conversation, reimagined.</h2>
        <p>
          PULSEPOINT connects questions, evidence,
          and expert perspectives.
        </p>
        <ul>
          <li>
            Use synthetic questions only; never enter real patient information.
          </li>
          <li>
            Expert profiles are fictional. The graph counts this session’s huddles, including starter samples. Sample briefs use
            templates when AI is unavailable. Optional AI uses only supplied evidence snippets.
          </li>
          <li>
            Source links point to public NCI resources. Summaries are
            descriptive and not clinical advice.
          </li>
          <li>
            Sample huddles stay in this browser tab’s session storage. Live
            huddles are not stored there.
          </li>
          <li>
            Voice input uses your browser’s speech service. Playback is
            synthetic speech.
          </li>
        </ul>
        <button
          className="button secondary"
          onClick={() => {
            setHuddles(initialHuddles);
            setCurrent(null);
            setQuestion("");
            setView("home");
            setHelp(false);
          }}
        >
          Reset sample data
        </button>
      </dialog>
    </div>
  );
}
