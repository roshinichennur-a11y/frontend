"use client";
import { useEffect, useRef, useState } from "react";
import type { Huddle } from "@/types/huddle";

export function HuddleActions({ huddle, onEdit, onDelete, disabled }: { huddle: Huddle; onEdit: (text: string) => void; onDelete: () => void; disabled: boolean }) {
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const [text, setText] = useState(huddle.question.question);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (mode) dialog.current?.showModal(); else dialog.current?.close(); }, [mode]);
  function edit() { setText(huddle.question.question); setMode("edit"); }
  return <>
    <div className="huddle-actions">
      <button type="button" onClick={edit} disabled={disabled || !huddle.demo} title={!huddle.demo ? "Editing connected huddles requires backend support" : undefined}>Edit question</button>
      <button type="button" className="delete-huddle" onClick={() => setMode("delete")} disabled={disabled}>Delete</button>
    </div>
    <dialog ref={dialog} className="help-dialog edit-huddle-dialog" aria-label={mode === "edit" ? "Edit huddle question" : "Delete huddle"} onCancel={() => setMode(null)}>
      {mode && <form onSubmit={e => { e.preventDefault(); if(mode === "edit") { if(!text.trim() || text.length > 2000) return; onEdit(text.trim()); } else onDelete(); setMode(null); }}>
        <h2>{mode === "edit" ? "Edit question" : "Delete this huddle?"}</h2>
        {mode === "edit" ? <>
          <p>Update your question below. Saving refreshes the evidence and expert match, and clears the previous response and brief so they don’t refer to an outdated question.</p>
          <label className="field-label" htmlFor={`edit-${huddle.id}`}>Question</label>
          <textarea id={`edit-${huddle.id}`} value={text} onChange={e => setText(e.target.value)} maxLength={2000} rows={6} required autoFocus />
          <p className="small">{text.length}/2,000 characters</p>
        </> : <><p>This removes the huddle and its brief from this workspace. This cannot be undone here.</p><blockquote>{huddle.question.question}</blockquote></>}
        <div className="panel-actions"><button type="button" className="button secondary" onClick={() => setMode(null)}>Cancel</button><button className="button primary" type="submit" disabled={mode === "edit" && (!text.trim() || text.trim() === huddle.question.question)}>{mode === "edit" ? "Save question" : "Delete huddle"}</button></div>
      </form>}
    </dialog>
  </>;
}
