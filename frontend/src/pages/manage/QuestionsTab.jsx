import { useState } from "react";
import { api } from "../../api.js";
import CourseTopicPicker from "../../components/CourseTopicPicker.jsx";
import { Empty, ErrorBox, Field, Loading, useConfirm, useLoad, useToast } from "../../ui.jsx";

const PAGE_SIZE = 15;
const KEYS = "ABCDEF";

function QuestionForm({ courses, editing, onSaved, onCancel }) {
  const toast = useToast();
  const [courseId, setCourseId] = useState(editing ? String(editing.course_id) : "");
  const [form, setForm] = useState(() =>
    editing
      ? {
          topic_id: String(editing.topic_id),
          skill: editing.skill,
          difficulty: editing.difficulty,
          text: editing.text,
          options: [...editing.options, ...Array(Math.max(0, 4 - editing.options.length)).fill("")],
          correct: editing.correct_index,
          explanation: editing.explanation || "",
          is_active: editing.is_active,
        }
      : { topic_id: "", skill: "", difficulty: "medium", text: "", options: ["", "", "", ""], correct: 0, explanation: "", is_active: true }
  );
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((c) => ({ ...c, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  const setOption = (index) => (event) => setForm((c) => ({ ...c, options: c.options.map((o, n) => (n === index ? event.target.value : o)) }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!form.topic_id) found.topic = "Choose the topic this question belongs to.";
    if (form.text.trim().length < 5) found.text = "Write the question (at least 5 characters).";
    const trimmed = form.options.map((o) => o.trim());
    const last = trimmed.reduce((position, o, index) => (o ? index : position), -1);
    const options = trimmed.slice(0, last + 1);
    if (options.length < 2) found.options = "Enter at least two answer options.";
    else if (options.some((o) => !o)) found.options = "Fill the options in order, with no empty option in between.";
    else if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) found.options = "Options must be different from each other.";
    else if (Number(form.correct) >= options.length) found.options = "Mark one of the filled options as the correct answer.";
    setErrors(found);
    if (Object.keys(found).length) return;

    const body = {
      topic_id: Number(form.topic_id),
      skill: form.skill.trim() || "General",
      difficulty: form.difficulty,
      text: form.text.trim(),
      options,
      correct_index: Number(form.correct),
      explanation: form.explanation.trim(),
    };
    setBusy(true);
    try {
      if (editing) await api.put(`/questions/${editing.id}`, { ...body, is_active: form.is_active });
      else await api.post("/questions", body);
      toast.success(editing ? "Question updated." : "Question added.");
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card card--soft" onSubmit={submit} noValidate>
      <h3 className="card__title">{editing ? `Edit question ${editing.code}` : "New question"}</h3>
      <CourseTopicPicker
        courses={courses}
        courseId={courseId}
        topicId={form.topic_id}
        topicRequired
        idPrefix="qform"
        onChange={({ course_id, topic_id }) => {
          setCourseId(course_id);
          setForm((c) => ({ ...c, topic_id }));
        }}
      />
      {errors.topic && <p className="field__error">{errors.topic}</p>}
      <div className="form-row">
        <Field label="Skill parameter" htmlFor="q-skill" hint="The skill this question checks.">
          <input id="q-skill" className="input" value={form.skill} onChange={set("skill")} />
        </Field>
        <Field label="Difficulty" htmlFor="q-diff">
          <select id="q-diff" className="select" value={form.difficulty} onChange={set("difficulty")}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </Field>
      </div>
      <Field label="Question" htmlFor="q-text" error={errors.text}>
        <textarea id="q-text" className="textarea" style={{ minHeight: 80 }} value={form.text} onChange={set("text")} />
      </Field>
      <fieldset style={{ border: 0, padding: 0, margin: "0 0 14px" }}>
        <legend className="label">Answer options (select the correct one)</legend>
        {form.options.map((option, index) => (
          <div className="row" key={index} style={{ marginBottom: 8, flexWrap: "nowrap" }}>
            <input
              type="radio"
              name="correct"
              aria-label={`Option ${KEYS[index]} is the correct answer`}
              checked={Number(form.correct) === index}
              onChange={() => setForm((c) => ({ ...c, correct: index }))}
              style={{ width: 20, height: 20, accentColor: "var(--green)" }}
            />
            <span className="option__key">{KEYS[index]}</span>
            <input className="input" aria-label={`Option ${KEYS[index]}`} value={option} onChange={setOption(index)} />
          </div>
        ))}
        {form.options.length < 6 && (
          <button type="button" className="link-btn" onClick={() => setForm((c) => ({ ...c, options: [...c.options, ""] }))}>
            Add another option
          </button>
        )}
        {errors.options && <p className="field__error">{errors.options}</p>}
      </fieldset>
      <Field label="Explanation shown after submitting" htmlFor="q-exp">
        <textarea id="q-exp" className="textarea" style={{ minHeight: 70 }} value={form.explanation} onChange={set("explanation")} />
      </Field>
      {editing && (
        <label className="check" style={{ marginBottom: 14 }}>
          <input type="checkbox" checked={form.is_active} onChange={set("is_active")} />
          Active (students can receive this question)
        </label>
      )}
      <div className="row">
        <button className="btn btn--primary" disabled={busy}>
          {busy ? "Saving..." : editing ? "Save changes" : "Add question"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function ImportBox({ onDone }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setProblem("");
    let rows;
    try {
      rows = JSON.parse(text);
    } catch {
      setProblem("That is not valid JSON. Paste a list of questions between [ and ].");
      return;
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      setProblem("Paste a non-empty list of questions.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.post("/questions/import", rows);
      toast.success(`${result.message} Created ${result.created}, updated ${result.updated}.`);
      setText("");
      onDone();
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="card card--soft">
      <summary style={{ cursor: "pointer", fontWeight: 800 }}>Import many questions (JSON)</summary>
      <p className="muted small">
        Each item needs: code, topic_id, text, options (a list), correct_index, difficulty, skill and explanation. Importing a code that already exists updates that question instead of creating a duplicate.
      </p>
      {problem && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: 10 }}>
          {problem}
        </div>
      )}
      <textarea className="textarea" aria-label="Questions as JSON" value={text} onChange={(event) => setText(event.target.value)} placeholder='[{"code": "MY-001", "topic_id": 1, "text": "...", "options": ["A", "B"], "correct_index": 0, "difficulty": "easy", "skill": "General", "explanation": "..."}]' />
      <button className="btn btn--primary" style={{ marginTop: 10 }} onClick={run} disabled={busy || !text.trim()}>
        {busy ? "Importing..." : "Import"}
      </button>
    </details>
  );
}

export default function QuestionsTab({ courses }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [filters, setFilters] = useState({ course_id: "", topic_id: "", difficulty: "", q: "" });
  const [draft, setDraft] = useState("");
  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState(null); // null, "new", or the question being edited
  const [bump, setBump] = useState(0);

  const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
  Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
  const list = useLoad(() => api.get(`/questions?${params}`), [params.toString(), bump]);

  const refresh = () => setBump((n) => n + 1);
  const remove = async (question) => {
    const yes = await confirm({
      title: "Delete this question?",
      message: `${question.code}: "${question.text.slice(0, 80)}". If students have already answered it, it is deactivated instead, so their past results stay correct.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!yes) return;
    try {
      const result = await api.del(`/questions/${question.id}`);
      toast.success(result.message);
      refresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="stack">
      {mode ? (
        <QuestionForm
          key={mode === "new" ? "new" : mode.id}
          courses={courses}
          editing={mode === "new" ? null : mode}
          onCancel={() => setMode(null)}
          onSaved={() => {
            setMode(null);
            refresh();
          }}
        />
      ) : (
        <div>
          <button className="btn btn--primary" onClick={() => setMode("new")}>
            Add a question
          </button>
        </div>
      )}
      <ImportBox onDone={refresh} />

      <form
        className="card card--soft"
        onSubmit={(event) => {
          event.preventDefault();
          setOffset(0);
          setFilters((c) => ({ ...c, q: draft.trim() }));
        }}
      >
        <h3 className="card__title">Filter</h3>
        <CourseTopicPicker
          courses={courses}
          courseId={filters.course_id}
          topicId={filters.topic_id}
          topicLabel="Topic"
          idPrefix="qfilter"
          onChange={({ course_id, topic_id }) => {
            setOffset(0);
            setFilters((c) => ({ ...c, course_id, topic_id }));
          }}
        />
        <div className="form-row">
          <Field label="Difficulty" htmlFor="qf-diff">
            <select
              id="qf-diff"
              className="select"
              value={filters.difficulty}
              onChange={(event) => {
                setOffset(0);
                setFilters((c) => ({ ...c, difficulty: event.target.value }));
              }}
            >
              <option value="">Any</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="Search the question text or code" htmlFor="qf-q">
            <input id="qf-q" className="input" value={draft} onChange={(event) => setDraft(event.target.value)} />
          </Field>
        </div>
        <button className="btn btn--sm btn--primary">Apply search</button>
      </form>

      {list.loading && !list.data && <Loading label="Loading questions..." />}
      {list.error && <ErrorBox error={list.error} onRetry={list.reload} />}
      {list.data &&
        (list.data.items.length === 0 ? (
          <Empty title="No questions match">Change the filters, or add a question above.</Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Question</th>
                    <th>Topic</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((question) => (
                    <tr key={question.id}>
                      <td>{question.code}</td>
                      <td>{question.text.length > 90 ? `${question.text.slice(0, 90)}...` : question.text}</td>
                      <td>{question.topic}</td>
                      <td>{question.difficulty}</td>
                      <td>
                        <span className={`chip ${question.is_active ? "chip--ok" : ""}`}>{question.is_active ? "Active" : "Inactive"}</span>
                        {question.is_sample && <span className="chip chip--warn">Sample</span>}
                      </td>
                      <td>
                        <div className="manage-actions">
                          <button className="btn btn--sm" onClick={() => setMode(question)}>
                            Edit
                          </button>
                          <button className="btn btn--sm btn--danger" onClick={() => remove(question)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row row--between">
              <span className="muted small">
                Showing {offset + 1} to {offset + list.data.items.length} of {list.data.total}
              </span>
              <span className="row">
                <button className="btn btn--sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                  Previous
                </button>
                <button className="btn btn--sm" disabled={offset + PAGE_SIZE >= list.data.total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                  Next
                </button>
              </span>
            </div>
          </>
        ))}
    </div>
  );
}
