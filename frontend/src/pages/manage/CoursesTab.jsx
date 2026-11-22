import { useState } from "react";
import { api } from "../../api.js";
import { useAuth } from "../../auth.jsx";
import { Empty, Field, useConfirm, useLoad, useToast } from "../../ui.jsx";
import { toLines, toList } from "../../utils.js";

// "Weekly hours: 6" on each line becomes { "Weekly hours": "6" }.
function parseParameters(text) {
  const result = {};
  for (const line of toLines(text)) {
    const cut = line.indexOf(":");
    if (cut > 0 && line.slice(cut + 1).trim()) result[line.slice(0, cut).trim()] = line.slice(cut + 1).trim();
  }
  return result;
}

function CourseForm({ onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", description: "", level: "beginner", weeks: 8, skills: "", params: "", published: true });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (form.name.trim().length < 3) found.name = "Enter a course name of at least 3 characters.";
    const weeks = Number(form.weeks);
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 104) found.weeks = "Enter 1 to 104 weeks.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await api.post("/courses", {
        name: form.name.trim(),
        description: form.description.trim(),
        level: form.level,
        duration_weeks: weeks,
        required_skills: toList(form.skills),
        training_parameters: parseParameters(form.params),
        is_published: form.published,
      });
      toast.success("Course created.");
      setForm({ name: "", description: "", level: "beginner", weeks: 8, skills: "", params: "", published: true });
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card card--soft" onSubmit={submit} noValidate>
      <h3 className="card__title">New course</h3>
      <div className="form-row">
        <Field label="Course name" htmlFor="c-name" error={errors.name}>
          <input id="c-name" className="input" value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Level" htmlFor="c-level">
          <select id="c-level" className="select" value={form.level} onChange={set("level")}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </Field>
        <Field label="Length in weeks" htmlFor="c-weeks" error={errors.weeks}>
          <input id="c-weeks" className="input" type="number" min="1" max="104" value={form.weeks} onChange={set("weeks")} />
        </Field>
      </div>
      <Field label="Description" htmlFor="c-desc">
        <textarea id="c-desc" className="textarea" value={form.description} onChange={set("description")} />
      </Field>
      <div className="form-row">
        <Field label="Required skills" htmlFor="c-skills" hint="Separate with commas.">
          <input id="c-skills" className="input" value={form.skills} onChange={set("skills")} />
        </Field>
        <Field label="Training parameters" htmlFor="c-params" hint="One per line, for example: Weekly hours: 6">
          <textarea id="c-params" className="textarea" style={{ minHeight: 70 }} value={form.params} onChange={set("params")} />
        </Field>
      </div>
      <label className="check" style={{ marginBottom: 14 }}>
        <input type="checkbox" checked={form.published} onChange={set("published")} />
        Visible to students
      </label>
      <button className="btn btn--primary" disabled={busy}>
        {busy ? "Creating..." : "Create course"}
      </button>
    </form>
  );
}

function TopicForm({ courses, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ course_id: courses[0] ? String(courses[0].id) : "", name: "", skill_area: "", description: "", objectives: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!form.course_id) found.course_id = "Choose a course.";
    if (form.name.trim().length < 2) found.name = "Enter a topic name.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await api.post(`/courses/${form.course_id}/topics`, {
        name: form.name.trim(),
        skill_area: form.skill_area.trim() || "General",
        description: form.description.trim(),
        learning_objectives: toLines(form.objectives),
      });
      toast.success("Topic added.");
      setForm((current) => ({ ...current, name: "", skill_area: "", description: "", objectives: "" }));
      onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card card--soft" onSubmit={submit} noValidate>
      <h3 className="card__title">New topic</h3>
      <div className="form-row">
        <Field label="Course" htmlFor="t-course" error={errors.course_id}>
          <select id="t-course" className="select" value={form.course_id} onChange={set("course_id")}>
            <option value="">Choose a course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Topic name" htmlFor="t-name" error={errors.name}>
          <input id="t-name" className="input" value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Skill area" htmlFor="t-skill" hint="The skill this topic builds.">
          <input id="t-skill" className="input" value={form.skill_area} onChange={set("skill_area")} />
        </Field>
      </div>
      <Field label="Explanation" htmlFor="t-desc">
        <textarea id="t-desc" className="textarea" style={{ minHeight: 80 }} value={form.description} onChange={set("description")} />
      </Field>
      <Field label="Learning objectives" htmlFor="t-obj" hint="One per line.">
        <textarea id="t-obj" className="textarea" style={{ minHeight: 80 }} value={form.objectives} onChange={set("objectives")} />
      </Field>
      <button className="btn btn--primary" disabled={busy}>
        {busy ? "Adding..." : "Add topic"}
      </button>
    </form>
  );
}

export default function CoursesTab({ courses, reloadCourses }) {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const togglePublished = async (course) => {
    try {
      await api.put(`/courses/${course.id}`, { is_published: !course.is_published });
      reloadCourses();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const removeCourse = async (course) => {
    const yes = await confirm({
      title: "Delete this course?",
      message: `"${course.name}" and all of its topics and questions will be deleted. This cannot be undone. A course that students have already tested in cannot be deleted; hide it instead.`,
      confirmLabel: "Delete course",
      danger: true,
    });
    if (!yes) return;
    try {
      await api.del(`/courses/${course.id}`);
      toast.success("Course deleted.");
      reloadCourses();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const removeTopic = async (topic) => {
    const yes = await confirm({ title: "Delete this topic?", message: `"${topic.name}" will be deleted. A topic that still has questions cannot be deleted.`, confirmLabel: "Delete topic", danger: true });
    if (!yes) return;
    try {
      await api.del(`/topics/${topic.id}`);
      toast.success("Topic deleted.");
      reloadCourses();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="stack">
      <CourseForm onSaved={reloadCourses} />
      {courses.length > 0 && <TopicForm key={courses.length} courses={courses} onSaved={reloadCourses} />}

      {courses.length === 0 ? (
        <Empty title="No courses yet">Create the first course above.</Empty>
      ) : (
        courses.map((course) => (
          <CourseCard key={course.id} course={course} isAdmin={user.role === "admin"} onToggle={togglePublished} onRemoveCourse={removeCourse} onRemoveTopic={removeTopic} />
        ))
      )}
    </div>
  );
}

function CourseCard({ course, isAdmin, onToggle, onRemoveCourse, onRemoveTopic }) {
  const detail = useLoad(() => api.get(`/courses/${course.id}`), [course.id, course.topic_count]);
  return (
    <div className="card">
      <div className="row row--between">
        <h3 className="card__title" style={{ margin: 0 }}>
          {course.name}
        </h3>
        <div className="manage-actions">
          <span className={`chip ${course.is_published ? "chip--ok" : ""}`}>{course.is_published ? "Visible" : "Hidden"}</span>
          <button className="btn btn--sm" onClick={() => onToggle(course)}>
            {course.is_published ? "Hide" : "Show"}
          </button>
          {isAdmin && (
            <button className="btn btn--sm btn--danger" onClick={() => onRemoveCourse(course)}>
              Delete
            </button>
          )}
        </div>
      </div>
      {detail.data &&
        (detail.data.topics.length === 0 ? (
          <p className="muted small" style={{ marginBottom: 0 }}>
            No topics yet.
          </p>
        ) : (
          <ul className="list list--plain" style={{ marginTop: 12 }}>
            {detail.data.topics.map((topic) => (
              <li key={topic.id} className="row row--between">
                <span>
                  {topic.name} <span className="muted small">· {topic.skill_area} · {topic.question_count} questions</span>
                </span>
                {isAdmin && (
                  <button className="btn btn--sm btn--danger" onClick={() => onRemoveTopic(topic)}>
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
