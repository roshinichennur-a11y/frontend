"use client";
import { useState } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import type { Huddle } from "@/types/huddle";

const normalize = (value: string) => value.trim().replace(/\s+/g, " ");
const key = (value: string) => normalize(value).toLowerCase();

export function QuestionGraph({ huddles, onOpen }: { huddles: Huddle[]; onOpen: (huddle: Huddle) => void }) {
  const [specialty, setSpecialty] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [unansweredOnly, setUnansweredOnly] = useState(false);
  const specialties = [...new Map(huddles.map(h => [key(h.question.specialty), normalize(h.question.specialty) || "Unclassified"])).entries()];
  const activeSpecialty = specialties.some(([id]) => id === specialty) ? specialty : "";
  const filtered = huddles.filter(h => !activeSpecialty || key(h.question.specialty) === activeSpecialty);
  const topics = new Map<string, { id: string; topic: string; questions: Huddle[] }>();
  for (const huddle of filtered) {
    const topic = normalize(huddle.question.topic) || "Unclassified";
    const id = key(topic);
    const group = topics.get(id) || { id, topic, questions: [] };
    group.questions.push(huddle);
    topics.set(id, group);
  }
  const data = [...topics.values()].sort((a, b) => b.questions.length - a.questions.length || a.topic.localeCompare(b.topic));
  const total = filtered.length;
  const unanswered = filtered.filter(h => h.status !== "complete").length;
  const leading = data[0];
  const activeTopic = data.find(row => row.id === selected) || leading;
  const questions = (activeTopic?.questions || []).filter(h => !unansweredOnly || h.status !== "complete");
  return <div className="graph-page">
    <div className="graph-toolbar">
      <div><span className="pill synthetic-badge">Current session</span>
        <p className="small muted">Counts reflect the huddles in this workspace, including the starter samples. Submissions, answers, edits, and deletions update these totals.</p>
      </div>
      <label className="select-label">Specialty
        <select value={activeSpecialty} onChange={event => { setSpecialty(event.target.value); setSelected(null); }}>
          <option value="">All specialties</option>
          {specialties.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
    </div>
    <div className="graph-metrics" aria-live="polite">
      <div><span className="eyebrow">QUESTIONS IN THIS SESSION</span><strong data-testid="graph-total">{total}</strong><p>Across {data.length} {data.length === 1 ? "topic" : "topics"}{activeSpecialty ? " in this specialty" : ""}</p></div>
      <div><span className="eyebrow">LEADING TOPIC</span><strong className="metric-text">{leading?.topic || "No questions yet"}</strong><p>{total ? `${Math.round((leading.questions.length / total) * 100)}% of selected questions` : "Start a huddle to see your first topic"}</p></div>
      <div><span className="eyebrow">UNANSWERED</span><strong data-testid="graph-unanswered">{unanswered}</strong><p>Questions without a completed expert response</p></div>
    </div>
    <section className="chart-panel live-question-chart" aria-label="Question topic graph">
      <div className="section-label"><div><span className="eyebrow">THE QUESTION LANDSCAPE</span><h2>What’s coming up most?</h2></div><span className="small muted">Current session</span></div>
      <p className="small muted">Click a bar to explore its questions below. Topic buttons below also work with your keyboard.</p>
      {data.length ? <div style={{ height: Math.max(240, data.length * 56 + 50), width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.map(row => ({ id: row.id, topic: row.topic, count: row.questions.length }))} layout="vertical" margin={{ left: 0, right: 25, top: 15, bottom: 10 }} barSize={26}>
            <CartesianGrid horizontal={false} stroke="#e8cde0" />
            <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#4c243b" }} />
            <YAxis type="category" dataKey="topic" width={140} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#4c243b" }} tickFormatter={value => value.length > 23 ? `${value.slice(0, 21)}…` : value} />
            <Tooltip cursor={{ fill: "#fbe3f7" }} contentStyle={{ borderRadius: 10, border: "1px solid #ac7b84", color: "#4c243b" }} />
            <Bar dataKey="count" name="Questions" fill="#54457f" radius={[0, 5, 5, 0]} isAnimationActive={false} cursor="pointer" onClick={(_, index) => { setSelected(data[index].id); setUnansweredOnly(false); }}>
              {data.map(row => <Cell key={row.id} fill={row.id === activeTopic?.id ? "#b84a62" : "#54457f"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div> : <p className="empty-state">Your graph will appear after you start a huddle.</p>}
    </section>
    <div className="graph-columns session-graph-columns">
      <section className="chart-panel">
        <div className="section-label"><div><span className="eyebrow">THE QUESTION LANDSCAPE</span><h2>Explore topics</h2></div></div>
        <p className="small muted">Select a topic to inspect its questions.</p>
        <div className="session-topic-list" role="group" aria-label="Topics">
          {data.map(row => <button key={row.id} className="session-topic" aria-pressed={activeTopic?.id === row.id} onClick={() => { setSelected(row.id); setUnansweredOnly(false); }}>
            <span className="session-topic-heading"><strong>{row.topic}</strong><span>{row.questions.length} {row.questions.length === 1 ? "question" : "questions"}</span></span>
            <span className="session-topic-track" aria-hidden="true"><span style={{ width: `${row.questions.length / leading.questions.length * 100}%` }} /></span>
            <span className="small">{row.questions.filter(h => h.status !== "complete").length} unanswered</span>
          </button>)}
          {!total && <p className="empty-state">No questions in this session. Start a huddle from My Huddles.</p>}
        </div>
      </section>
      <section className="chart-panel session-topic-detail" aria-label="Topic questions">
        <span className="eyebrow">QUESTIONS IN THIS TOPIC</span>
        <h2>{activeTopic?.topic || "Choose a topic"}</h2>
        <label className="session-unanswered-filter"><input type="checkbox" checked={unansweredOnly} onChange={event => setUnansweredOnly(event.target.checked)} /> Show unanswered only</label>
        <div aria-live="polite"><p className="small muted">{questions.length} {questions.length === 1 ? "question" : "questions"} shown</p></div>
        <ul className="session-question-list">
          {questions.map(huddle => <li key={huddle.id}>
            <span className="pill">{huddle.status === "complete" ? "Answered" : "Unanswered"}</span>
            <h3>{huddle.question.question}</h3>
            <p className="small muted">{huddle.question.specialty} · {huddle.question.intent}</p>
            <button className="button secondary" onClick={() => onOpen(huddle)}>{huddle.status === "complete" ? "Open brief" : "Open huddle"}</button>
          </li>)}
        </ul>
        {activeTopic && !questions.length && <p>No unanswered questions in this topic.</p>}
      </section>
    </div>
  </div>;
}
