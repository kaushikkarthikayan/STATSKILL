import { useState } from "react";
import { api } from "../../api.js";
import CourseTopicPicker from "../../components/CourseTopicPicker.jsx";
import { Empty, ErrorBox, Field, Loading, useConfirm, useLoad, useToast } from "../../ui.jsx";
import { fmtDate, toLines } from "../../utils.js";
import { openResource } from "../Training.jsx";

const MAX_MB = 20;
const KINDS = [
  { id: "file", label: "PDF or DOCX file" },
  { id: "link", label: "External link" },
  { id: "note", label: "Written note" },
];
const BLANK = { course_id: "", topic_id: "", kind: "file", title: "", description: "", objectives: "", skill: "", difficulty: "", url: "", points: "", codes: "", published: true };

// "KEY: text" marks a key concept; any other line is a normal important point.
const toPoints = (text) =>
  toLines(text)
    .map((line) => {
      const key = /^key:/i.test(line);
      return { text: (key ? line.slice(4).trim() : line).slice(0, 500), is_key_concept: key };
    })
    .filter((point) => point.text.length >= 3);

function UploadForm({ courses, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK);
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((c) => ({ ...c, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!form.course_id) found.course = "Choose the course.";
    if (form.title.trim().length < 3) found.title = "Enter a title of at least 3 characters.";
    if (form.kind === "file") {
      if (!file) found.file = "Choose a PDF or DOCX file.";
      else if (!/\.(pdf|docx)$/i.test(file.name)) found.file = "Only PDF and DOCX files are accepted.";
      else if (file.size > MAX_MB * 1024 * 1024) found.file = `The file is larger than ${MAX_MB} MB.`;
    }
    if (form.kind === "link" && !/^https?:\/\/\S+\.\S+/.test(form.url.trim())) found.url = "Enter a link that starts with http:// or https://";
    if (form.kind === "note" && form.description.trim().length < 3) found.description = "Write the note text in the description.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      if (form.kind === "file") {
        const data = new FormData();
        data.append("file", file);
        data.append("title", form.title.trim());
        data.append("course_id", form.course_id);
        if (form.topic_id) data.append("topic_id", form.topic_id);
        data.append("description", form.description.trim());
        data.append("learning_objectives", form.objectives);
        if (form.skill.trim()) data.append("skill_parameter", form.skill.trim());
        if (form.difficulty) data.append("difficulty", form.difficulty);
        data.append("important_points", form.points);
        data.append("related_question_codes", form.codes);
        data.append("is_published", form.published ? "true" : "false");
        await api.upload("/resources/upload", data);
      } else {
        const created = await api.post("/resources", {
          title: form.title.trim(),
          resource_type: form.kind,
          course_id: Number(form.course_id),
          topic_id: form.topic_id ? Number(form.topic_id) : null,
          description: form.description.trim(),
          learning_objectives: toLines(form.objectives),
          skill_parameter: form.skill.trim() || null,
          difficulty: form.difficulty || null,
          external_url: form.kind === "link" ? form.url.trim() : null,
          is_published: form.published,
        });
        const points = toPoints(form.points);
        if (points.length) await api.post(`/resources/${created.id}/points`, { points });
      }
      toast.success("Study material saved.");
      setForm((c) => ({ ...BLANK, course_id: c.course_id, topic_id: c.topic_id, kind: c.kind }));
      setFile(null);
      setFileKey((n) => n + 1);
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card card--soft" onSubmit={submit} noValidate>
      <h3 className="card__title">Add study material</h3>
      <CourseTopicPicker
        courses={courses}
        courseId={form.course_id}
        topicId={form.topic_id}
        idPrefix="mat"
        onChange={(value) => setForm((c) => ({ ...c, ...value }))}
      />
      {errors.course && <p className="field__error">{errors.course}</p>}
      <div className="row" role="radiogroup" aria-label="Type of material" style={{ marginBottom: 14 }}>
        {KINDS.map((kind) => (
          <label className="check" key={kind.id}>
            <input type="radio" name="kind" checked={form.kind === kind.id} onChange={() => setForm((c) => ({ ...c, kind: kind.id }))} />
            {kind.label}
          </label>
        ))}
      </div>
      <Field label="Resource title" htmlFor="m-title" error={errors.title}>
        <input id="m-title" className="input" value={form.title} onChange={set("title")} />
      </Field>
      {form.kind === "file" && (
        <Field label={`File (PDF or DOCX, up to ${MAX_MB} MB)`} htmlFor="m-file" error={errors.file} hint="The file type is checked by its content, not just its name.">
          <input key={fileKey} id="m-file" type="file" accept=".pdf,.docx" onChange={(event) => setFile(event.target.files[0] || null)} />
        </Field>
      )}
      {form.kind === "link" && (
        <Field label="Link" htmlFor="m-url" error={errors.url}>
          <input id="m-url" className="input" value={form.url} onChange={set("url")} placeholder="https://" />
        </Field>
      )}
      <Field label={form.kind === "note" ? "Note text" : "Description"} htmlFor="m-desc" error={errors.description}>
        <textarea id="m-desc" className="textarea" style={{ minHeight: 90 }} value={form.description} onChange={set("description")} />
      </Field>
      <div className="form-row">
        <Field label="Skill parameter" htmlFor="m-skill">
          <input id="m-skill" className="input" value={form.skill} onChange={set("skill")} />
        </Field>
        <Field label="Difficulty" htmlFor="m-diff">
          <select id="m-diff" className="select" value={form.difficulty} onChange={set("difficulty")}>
            <option value="">Not set</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </Field>
      </div>
      <Field label="Learning objectives" htmlFor="m-obj" hint="One per line.">
        <textarea id="m-obj" className="textarea" style={{ minHeight: 70 }} value={form.objectives} onChange={set("objectives")} />
      </Field>
      <Field label="Important points" htmlFor="m-points" hint="One per line. Start a line with KEY: to mark a key concept.">
        <textarea id="m-points" className="textarea" style={{ minHeight: 90 }} value={form.points} onChange={set("points")} />
      </Field>
      {form.kind === "file" && (
        <Field label="Related MCQ question codes" htmlFor="m-codes" hint="Separate codes with commas. Each code must already exist.">
          <input id="m-codes" className="input" value={form.codes} onChange={set("codes")} />
        </Field>
      )}
      <label className="check" style={{ marginBottom: 14 }}>
        <input type="checkbox" checked={form.published} onChange={set("published")} />
        Visible to students now
      </label>
      <button className="btn btn--primary" disabled={busy}>
        {busy ? "Saving..." : "Save study material"}
      </button>
    </form>
  );
}

export default function MaterialTab({ courses }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { loading, data, error, reload } = useLoad(() => api.get("/resources"), []);
  const courseName = (id) => courses.find((course) => course.id === id)?.name || "-";

  const togglePublished = async (resource) => {
    try {
      await api.put(`/resources/${resource.id}`, { is_published: !resource.is_published });
      reload();
    } catch (problem) {
      toast.error(problem.message);
    }
  };

  const remove = async (resource) => {
    const yes = await confirm({
      title: "Delete this study material?",
      message: `"${resource.title}" will be removed for all students, together with its important points and any completion marks. This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!yes) return;
    try {
      await api.del(`/resources/${resource.id}`);
      toast.success("Study material deleted.");
      reload();
    } catch (problem) {
      toast.error(problem.message);
    }
  };

  return (
    <div className="stack">
      <UploadForm courses={courses} onSaved={reload} />
      {loading && <Loading label="Loading study material..." />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data &&
        (data.length === 0 ? (
          <Empty title="No study material yet">Add a file, link or note above.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Course</th>
                  <th>Topic</th>
                  <th>Added</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((resource) => (
                  <tr key={resource.id}>
                    <td>{resource.title}</td>
                    <td>{resource.resource_type.toUpperCase()}</td>
                    <td>{courseName(resource.course_id)}</td>
                    <td>{resource.topic || "-"}</td>
                    <td>{fmtDate(resource.created_at)}</td>
                    <td>
                      <span className={`chip ${resource.is_published ? "chip--ok" : ""}`}>{resource.is_published ? "Visible" : "Hidden"}</span>
                    </td>
                    <td>
                      <div className="manage-actions">
                        {resource.resource_type !== "note" && (
                          <button className="btn btn--sm" onClick={() => openResource(resource, toast)}>
                            Open
                          </button>
                        )}
                        <button className="btn btn--sm" onClick={() => togglePublished(resource)}>
                          {resource.is_published ? "Hide" : "Show"}
                        </button>
                        <button className="btn btn--sm btn--danger" onClick={() => remove(resource)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
