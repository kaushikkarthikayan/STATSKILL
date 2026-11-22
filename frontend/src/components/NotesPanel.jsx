import { useRef, useState } from "react";
import { api } from "../api.js";
import { ErrorBox, Field, Loading, useConfirm, useLoad, useToast } from "../ui.jsx";
import { fmtDate } from "../utils.js";
import CourseTopicPicker from "./CourseTopicPicker.jsx";
import { Placeholder, Segmented } from "./Sketch.jsx";

const MAX_MB = 20;
const kb = (bytes) => (bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/* Private study notes: upload downloaded PDF or DOCX notes, or paste text, then open them as study material.
   When courseId / topicId are given, notes are saved to and listed for that topic only. */
export default function NotesPanel({ courses = [], fixed = null, defaultCourseId = "" }) {
  const toast = useToast();
  const confirm = useConfirm();
  const input = useRef(null);
  const [mode, setMode] = useState("file");
  const [scope, setScope] = useState({ course_id: fixed?.course_id ? String(fixed.course_id) : String(defaultCourseId || ""), topic_id: fixed?.topic_id ? String(fixed.topic_id) : "" });
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [open, setOpen] = useState(null);
  const query = fixed?.topic_id ? `?topic_id=${fixed.topic_id}` : "";
  const notes = useLoad(() => api.get(`/my-notes${query}`), [query]);

  const pick = (chosen) => {
    if (!chosen) return;
    if (!/\.(pdf|docx)$/i.test(chosen.name)) return toast.error("Choose a PDF or DOCX file.");
    if (chosen.size > MAX_MB * 1024 * 1024) return toast.error(`The file must be ${MAX_MB} MB or smaller.`);
    setFile(chosen);
    if (!title) setTitle(chosen.name.replace(/\.(pdf|docx)$/i, "").slice(0, 200));
    return undefined;
  };

  const save = async (event) => {
    event.preventDefault();
    if (title.trim().length < 2) return toast.error("Give the note a title.");
    if (mode === "file" && !file) return toast.error("Choose a file first.");
    if (mode === "text" && text.trim().length < 3) return toast.error("Write or paste some text.");
    setBusy(true);
    try {
      if (mode === "file") {
        const form = new FormData();
        form.append("file", file);
        form.append("title", title.trim());
        if (scope.course_id) form.append("course_id", scope.course_id);
        if (scope.topic_id) form.append("topic_id", scope.topic_id);
        await api.upload("/my-notes/upload", form);
      } else {
        await api.post("/my-notes/text", {
          title: title.trim(),
          text: text.trim(),
          course_id: scope.course_id ? Number(scope.course_id) : null,
          topic_id: scope.topic_id ? Number(scope.topic_id) : null,
        });
      }
      toast.success("Note saved. It is private to you.");
      setFile(null);
      setTitle("");
      setText("");
      if (input.current) input.current.value = "";
      notes.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const openFile = async (note) => {
    try {
      const response = await api.raw(`/my-notes/${note.id}/download`);
      const url = URL.createObjectURL(await response.blob());
      if (note.kind === "pdf") {
        if (!window.open(url, "_blank")) toast.error("Your browser blocked the new tab. Allow pop-ups and try again.");
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = note.original_filename || "note.docx";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const remove = async (note) => {
    const yes = await confirm({ title: "Delete this note?", message: `"${note.title}" will be removed for good.`, confirmLabel: "Delete", danger: true });
    if (!yes) return;
    try {
      await api.del(`/my-notes/${note.id}`);
      toast.success("Note deleted.");
      notes.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="stack">
      <form className="card" onSubmit={save} noValidate>
        <h2 className="card__title">Add your notes</h2>
        <Segmented
          name="note-mode"
          label="How to add the note"
          value={mode}
          onChange={setMode}
          options={[{ id: "file", label: "Upload a file" }, { id: "text", label: "Paste text" }]}
        />
        {!fixed && (
          <div style={{ marginTop: 14 }}>
            <CourseTopicPicker courses={courses} courseId={scope.course_id} topicId={scope.topic_id} idPrefix="note" onChange={(value) => setScope(value)} topicLabel="Topic (optional)" />
          </div>
        )}
        {mode === "file" ? (
          <label
            className={`dropzone ${over ? "is-over" : ""} ${file ? "has-file" : ""}`}
            data-cursor="click"
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              pick(e.dataTransfer.files?.[0]);
            }}
          >
            <input ref={input} className="sr-only" type="file" accept=".pdf,.docx" onChange={(e) => pick(e.target.files?.[0])} />
            <strong>{file ? file.name : "Drop your downloaded notes here"}</strong>
            <span className="muted small">{file ? `${kb(file.size)} · ready to save` : `or click to choose a PDF or DOCX (up to ${MAX_MB} MB)`}</span>
          </label>
        ) : (
          <Field label="Your note" htmlFor="note-text" hint={`${text.length} of 20000 characters`}>
            <textarea id="note-text" className="textarea" value={text} maxLength={20000} onChange={(e) => setText(e.target.value)} placeholder="Paste or type your notes" />
          </Field>
        )}
        <Field label="Title" htmlFor="note-title">
          <input id="note-title" className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="For example: Week 3 limits" />
        </Field>
        <button className="btn btn--primary" disabled={busy}>
          {busy ? "Saving..." : "Save note"}
        </button>
      </form>

      <div className="card">
        <h2 className="card__title">{fixed ? "Your notes for this topic" : "My notes"}</h2>
        {notes.loading && !notes.data && <Loading label="Loading your notes..." />}
        {notes.error && <ErrorBox error={notes.error} onRetry={notes.reload} />}
        {notes.data && notes.data.length === 0 && (
          <Placeholder title="No notes yet" pose="read">
            Upload notes you downloaded or paste your own, and they become private study material here.
          </Placeholder>
        )}
        {notes.data?.map((note) => (
          <div className="resource" key={note.id}>
            <div className="row row--between">
              <strong>{note.title}</strong>
              <span className="row">
                <span className="chip">{note.kind.toUpperCase()}</span>
                {note.topic && <span className="chip">{note.topic}</span>}
              </span>
            </div>
            <span className="muted small">
              {note.course || "No course"} · {fmtDate(note.created_at)}
              {note.size_bytes ? ` · ${kb(note.size_bytes)}` : ""}
            </span>
            {open === note.id && note.text && <span>{note.text}</span>}
            <div className="row">
              {note.kind === "text" ? (
                <button className="btn btn--sm btn--primary" onClick={() => setOpen(open === note.id ? null : note.id)} aria-expanded={open === note.id}>
                  {open === note.id ? "Hide" : "Read"}
                </button>
              ) : (
                <button className="btn btn--sm btn--primary" onClick={() => openFile(note)}>
                  {note.kind === "pdf" ? "Open PDF" : "Download"}
                </button>
              )}
              <button className="btn btn--sm btn--danger" onClick={() => remove(note)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
