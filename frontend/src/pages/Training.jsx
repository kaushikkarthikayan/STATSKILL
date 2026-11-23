import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, startAttempt } from "../api.js";
import { useAuth } from "../auth.jsx";
import CourseTopicPicker from "../components/CourseTopicPicker.jsx";
import Levels from "../components/Levels.jsx";
import NotesPanel from "../components/NotesPanel.jsx";
import { Empty, ErrorBox, Field, Loading, Tabs, useLoad, useToast } from "../ui.jsx";
import { STATUS_CHIP, STATUS_LABEL, pct } from "../utils.js";

/* ---------- pieces shared by the course page, the topic page and Manage content ---------- */
export async function openResource(resource, toast, onDone) {
  try {
    const response = await api.raw(`/resources/${resource.id}/download`);
    const type = response.headers.get("content-type") || "";
    if (type.includes("application/json")) {
      const body = await response.json();
      if (body.url && !window.open(body.url, "_blank", "noopener,noreferrer")) toast.error("Your browser blocked the new tab. Allow pop-ups for this site and try again.");
    } else {
      const url = URL.createObjectURL(await response.blob());
      if (resource.resource_type === "pdf") {
        if (!window.open(url, "_blank")) toast.error("Your browser blocked the new tab. Allow pop-ups for this site and try again.");
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = resource.original_filename || "study-material";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    onDone?.();
  } catch (error) {
    toast.error(error.message);
  }
}

export function ResourceItem({ resource, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const toggleDone = async () => {
    setBusy(true);
    try {
      await api.post(`/resources/${resource.id}/progress`, { completed: !resource.completed });
      onChanged();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="resource">
      <div className="row row--between">
        <strong>{resource.title}</strong>
        <span className="row">
          <span className="chip">{resource.resource_type.toUpperCase()}</span>
          {resource.difficulty && <span className="chip">{resource.difficulty}</span>}
          {resource.completed && <span className="chip chip--ok">Done</span>}
        </span>
      </div>
      {resource.description && <span>{resource.description}</span>}
      {resource.learning_objectives?.length > 0 && (
        <ul className="list small">
          {resource.learning_objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      )}
      <div className="row">
        {resource.resource_type !== "note" && (
          <button className="btn btn--sm btn--primary" onClick={() => openResource(resource, toast, onChanged)}>
            {resource.resource_type === "link" ? "Open link" : resource.resource_type === "pdf" ? "Open PDF" : "Download"}
          </button>
        )}
        <button className="btn btn--sm" onClick={toggleDone} disabled={busy} aria-pressed={Boolean(resource.completed)}>
          {resource.completed ? "Marked as done" : "Mark as done"}
        </button>
      </div>
    </div>
  );
}

export function BookItem({ book, onChanged }) {
  const toast = useToast();
  const toggle = async () => {
    try {
      if (book.saved) await api.del(`/books/${book.id}/save`);
      else await api.post(`/books/${book.id}/save`);
      onChanged();
    } catch (error) {
      toast.error(error.message);
    }
  };
  return (
    <div className="resource">
      <div className="row row--between">
        <strong>{book.title}</strong>
        {book.matches_weak_area && <span className="chip chip--warn">Matches a weak area</span>}
      </div>
      <span className="muted small">
        by {book.author}
        {book.topic ? ` · ${book.topic}` : ""}
      </span>
      {book.description && <span>{book.description}</span>}
      <div className="row">
        <a className="btn btn--sm btn--primary" href={book.url} target="_blank" rel="noopener noreferrer">
          Open book link
        </a>
        <button className="btn btn--sm" onClick={toggle} aria-pressed={book.saved}>
          {book.saved ? "Saved" : "Save book"}
        </button>
      </div>
    </div>
  );
}

// Staff add a book link. Students see the result straight away.
export function BookForm({ courses, fixed, onAdded }) {
  const toast = useToast();
  const [form, setForm] = useState({ course_id: fixed?.course_id ? String(fixed.course_id) : "", topic_id: fixed?.topic_id ? String(fixed.topic_id) : "", title: "", author: "", url: "", description: "", skill_tag: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (form.title.trim().length < 2) found.title = "Enter the book title.";
    if (form.author.trim().length < 2) found.author = "Enter the author.";
    if (!/^https?:\/\/\S+\.\S+/.test(form.url.trim())) found.url = "Enter a link that starts with http:// or https://";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await api.post("/books", {
        title: form.title.trim(),
        author: form.author.trim(),
        url: form.url.trim(),
        description: form.description.trim(),
        skill_tag: form.skill_tag.trim() || null,
        course_id: form.course_id ? Number(form.course_id) : null,
        topic_id: form.topic_id ? Number(form.topic_id) : null,
        is_published: true,
      });
      toast.success("Book added. Students can see it now.");
      setForm((current) => ({ ...current, title: "", author: "", url: "", description: "", skill_tag: "" }));
      onAdded();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card card--soft" onSubmit={submit} noValidate>
      <h3 className="card__title">Add a book link</h3>
      {!fixed && (
        <CourseTopicPicker
          courses={courses}
          courseId={form.course_id}
          topicId={form.topic_id}
          idPrefix="book"
          onChange={(value) => setForm((current) => ({ ...current, ...value }))}
        />
      )}
      <div className="form-row">
        <Field label="Title" htmlFor="book-title" error={errors.title}>
          <input id="book-title" className="input" value={form.title} onChange={set("title")} />
        </Field>
        <Field label="Author" htmlFor="book-author" error={errors.author}>
          <input id="book-author" className="input" value={form.author} onChange={set("author")} />
        </Field>
      </div>
      <Field label="Link to the book" htmlFor="book-url" error={errors.url} hint="A page where students can buy or read about the book.">
        <input id="book-url" className="input" value={form.url} onChange={set("url")} placeholder="https://" />
      </Field>
      <div className="form-row">
        <Field label="Short description" htmlFor="book-desc">
          <input id="book-desc" className="input" value={form.description} onChange={set("description")} />
        </Field>
        <Field label="Skill tag (optional)" htmlFor="book-skill">
          <input id="book-skill" className="input" value={form.skill_tag} onChange={set("skill_tag")} />
        </Field>
      </div>
      <button className="btn btn--primary" disabled={busy}>
        {busy ? "Adding..." : "Add book"}
      </button>
    </form>
  );
}

// Starts a practice, assessment or revision set.
function StartCard({ title, text, mode, courseId, topicId, fixedCount, button = "Start" }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState("");
  const [busy, setBusy] = useState(false);

  const begin = async (event) => {
    event.preventDefault();
    const amount = fixedCount || Number(count);
    if (!Number.isInteger(amount) || amount < 1 || amount > 50) {
      toast.error("Choose between 1 and 50 questions.");
      return;
    }
    setBusy(true);
    try {
      navigate(`/assessment/${await startAttempt({ course_id: courseId, mode, topic_id: topicId || null, difficulty: difficulty || null, count: amount })}`);
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={begin}>
      <h2 className="card__title">{title}</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        {text}
      </p>
      {!fixedCount && (
        <div className="form-row">
          <Field label="Difficulty" htmlFor={`${mode}-difficulty`}>
            <select id={`${mode}-difficulty`} className="select" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value="">Any difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="Number of questions" htmlFor={`${mode}-count`}>
            <input id={`${mode}-count`} className="input" type="number" min="1" max="50" value={count} onChange={(event) => setCount(event.target.value)} />
          </Field>
        </div>
      )}
      <button className="btn btn--primary" disabled={busy}>
        {busy ? "Preparing questions..." : button}
      </button>
    </form>
  );
}

/* ---------- /training : the course ---------- */
export function Training() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setParams] = useSearchParams();
  const picked = Number(searchParams.get("course")) || null;
  const setPicked = (id) => setParams({ course: String(id) });
  const [busy, setBusy] = useState("");
  const boot = useLoad(async () => {
    const [profile, courses] = await Promise.all([api.get("/profile"), api.get("/courses")]);
    return { profile, courses };
  }, []);
  const courses = boot.data?.courses || [];
  const courseId = picked ?? boot.data?.profile.current_course?.id ?? courses[0]?.id ?? null;
  const detail = useLoad(() => (courseId ? api.get(`/courses/${courseId}`) : Promise.resolve(null)), [courseId]);
  const resources = useLoad(() => (courseId ? api.get(`/resources?course_id=${courseId}`) : Promise.resolve([])), [courseId]);
  const books = useLoad(() => (courseId ? api.get(`/books?course_id=${courseId}&recommended=true`) : Promise.resolve([])), [courseId]);

  if (boot.loading) return <Loading label="Loading course training..." />;
  if (boot.error)
    return (
      <div className="page">
        <ErrorBox error={boot.error} onRetry={boot.reload} />
      </div>
    );
  if (courses.length === 0)
    return (
      <div className="page">
        <Empty title="No courses yet">An administrator needs to publish a course before training is available.</Empty>
      </div>
    );

  const quick = async (mode) => {
    setBusy(mode);
    try {
      navigate(`/assessment/${await startAttempt({ course_id: courseId, mode, count: 10 })}`);
    } catch (error) {
      toast.error(error.message);
      setBusy("");
    }
  };
  const course = detail.data;
  const params = course?.training_parameters ? Object.entries(course.training_parameters) : [];

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <span className="kicker">Course training</span>
          <h1 className="page-title">{course ? course.name : "Course"}</h1>
        </div>
        <div className="course-tabs" role="radiogroup" aria-label="Courses">
          {courses.map((item) => (
            <button key={item.id} type="button" role="radio" aria-checked={item.id === courseId} className={`chip chip--button course-tab ${item.id === courseId ? "is-on" : ""}`} onClick={() => setPicked(item.id)}>
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {detail.loading && <Loading label="Loading the course..." />}
      {detail.error && <ErrorBox error={detail.error} onRetry={detail.reload} />}
      {course && (
        <div className="stack">
          <div className="card card--lime">
            <h2 className="card__title">Course details</h2>
            <p style={{ marginTop: 0 }}>{course.description || "No description has been added yet."}</p>
            <div className="chips">
              <span className="chip">{course.level}</span>
              <span className="chip">{course.duration_weeks} weeks</span>
              {course.required_skills.map((skill) => (
                <span className="chip" key={skill}>
                  Skill: {skill}
                </span>
              ))}
            </div>
            {params.length > 0 && (
              <ul className="list small" style={{ marginTop: 14 }}>
                {params.map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {String(value)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="card__title">Choose your levels</h2>
            <Levels courseId={courseId} />
          </div>

          <div className="card">
            <h2 className="card__title">Practice and testing</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Ten questions each. Open a topic for topic-based sets, or use these for the whole course.
            </p>
            <div className="row">
              <button className="btn btn--primary" onClick={() => quick("assessment")} disabled={Boolean(busy)}>
                Skill assessment
              </button>
              <button className="btn btn--lime" onClick={() => quick("practice")} disabled={Boolean(busy)}>
                Practice test
              </button>
              <button className="btn" onClick={() => quick("revision")} disabled={Boolean(busy)}>
                Revision questions
              </button>
            </div>
          </div>

          <div className="grid grid--2">
            <div className="card">
              <h2 className="card__title">Learning resources</h2>
              {resources.loading ? (
                <Loading label="Loading resources..." />
              ) : resources.data?.length ? (
                resources.data.map((item) => <ResourceItem key={item.id} resource={item} onChanged={resources.reload} />)
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  No study material has been published for this course yet.
                </p>
              )}
            </div>
            <div className="card">
              <h2 className="card__title">Recommended books</h2>
              {books.loading ? (
                <Loading label="Loading books..." />
              ) : books.data?.length ? (
                books.data.map((item) => <BookItem key={item.id} book={item} onChanged={books.reload} />)
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  No books have been added for this course yet.
                </p>
              )}
              <p className="muted small" style={{ marginBottom: 0 }}>
                Books for your weak topics are listed first, once your results show them.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- /training/topic/:id : everything for one topic on one page ---------- */
const TABS = [
  { id: "mcq", label: "MCQ training" },
  { id: "material", label: "Study material" },
  { id: "points", label: "Important points" },
  { id: "understand", label: "Topic understanding" },
  { id: "books", label: "Books" },
  { id: "mynotes", label: "My notes" },
  { id: "assessment", label: "Assessment" },
  { id: "revision", label: "Revision" },
];

function TopicView({ id }) {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("mcq");
  const { loading, data, error, reload } = useLoad(() => api.get(`/training/topics/${id}`), [id]);

  if (loading && !data) return <Loading label="Loading the topic..." />;
  if (error)
    return (
      <div className="page">
        <ErrorBox error={error} onRetry={reload} />
        <p>
          <Link to="/training">Back to course training</Link>
        </p>
      </div>
    );

  const { topic, course, performance, active_question_count: questionCount } = data;
  const isStaff = user.role === "admin" || user.role === "content_creator";
  const toggleMark = async (pointId) => {
    try {
      await api.post(`/training/points/${pointId}/mark`);
      reload();
    } catch (problem) {
      toast.error(problem.message);
    }
  };
  const noQuestions = (
    <Empty title="No questions for this topic yet">{isStaff ? "Add some under Manage content." : "Ask an administrator to add questions."}</Empty>
  );

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <span className="kicker">
            <Link to="/training">{course.name}</Link> · {topic.skill_area}
          </span>
          <h1 className="page-title">{topic.name}</h1>
        </div>
        <div className="row">
          {performance && (
            <span className={`chip ${STATUS_CHIP[performance.status] || ""}`}>
              {STATUS_LABEL[performance.status]}
              {performance.accuracy_percent !== null && ` · ${pct(performance.accuracy_percent)} of ${performance.seen} answers`}
            </span>
          )}
          <span className="chip">{questionCount} questions</span>
        </div>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "mcq" &&
        (questionCount === 0 ? (
          noQuestions
        ) : (
          <StartCard
            title="Topic MCQ practice"
            text="Questions you have not seen come first. If the topic runs out of new questions you are told, and any repeats are labelled. Answers and explanations appear after you submit."
            mode="practice"
            courseId={course.id}
            topicId={topic.id}
            button="Start practice"
          />
        ))}

      {tab === "material" && (
        <div className="card">
          <h2 className="card__title">Study material</h2>
          {data.resources.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No study material has been published for this topic yet.
            </p>
          ) : (
            data.resources.map((item) => <ResourceItem key={item.id} resource={item} onChanged={reload} />)
          )}
        </div>
      )}

      {tab === "points" && (
        <div className="card">
          <h2 className="card__title">Important points</h2>
          {data.points.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No important points have been added for this topic yet. They come from the study material.
            </p>
          ) : (
            data.resources
              .filter((resource) => data.points.some((point) => point.resource_id === resource.id))
              .map((resource) => (
                <div key={resource.id} style={{ marginBottom: 14 }}>
                  <span className="kicker">From: {resource.title}</span>
                  {data.points
                    .filter((point) => point.resource_id === resource.id)
                    .map((point) => (
                      <div className={`point ${point.is_key_concept ? "point--key" : ""}`} key={point.id}>
                        <button
                          className="mark-star"
                          onClick={() => toggleMark(point.id)}
                          aria-pressed={point.marked}
                          aria-label={point.marked ? "Remove from my important notes" : "Mark as important"}
                        >
                          {point.marked ? "★" : "☆"}
                        </button>
                        <span>
                          {point.is_key_concept && <strong>Key concept: </strong>}
                          {point.text}
                        </span>
                      </div>
                    ))}
                </div>
              ))
          )}
        </div>
      )}

      {tab === "understand" && (
        <div className="stack">
          <div className="card">
            <h2 className="card__title">What this topic covers</h2>
            <p style={{ marginTop: 0 }}>{topic.description || "No explanation has been added yet."}</p>
            {topic.learning_objectives.length > 0 && (
              <>
                <h3 className="label">Learning objectives</h3>
                <ul className="list">
                  {topic.learning_objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          {questionCount > 0 && (
            <StartCard
              title="Quick knowledge check"
              text="Three short questions to see whether the ideas have landed."
              mode="practice"
              courseId={course.id}
              topicId={topic.id}
              fixedCount={3}
              button="Check my understanding"
            />
          )}
        </div>
      )}

      {tab === "books" && (
        <div className="stack">
          <div className="card">
            <h2 className="card__title">Books for this topic</h2>
            {data.books.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No books have been added for this topic yet.
              </p>
            ) : (
              data.books.map((book) => <BookItem key={book.id} book={book} onChanged={reload} />)
            )}
          </div>
          {isStaff && <BookForm fixed={{ course_id: course.id, topic_id: topic.id }} onAdded={reload} />}
        </div>
      )}

      {tab === "mynotes" && <NotesPanel fixed={{ course_id: course.id, topic_id: topic.id }} />}

      {tab === "assessment" &&
        (questionCount === 0 ? (
          noQuestions
        ) : (
          <StartCard
            title="Topic assessment"
            text="Answer questions on this topic to measure your understanding. Your result is saved and feeds your progress report."
            mode="assessment"
            courseId={course.id}
            topicId={topic.id}
            button="Start assessment"
          />
        ))}

      {tab === "revision" &&
        (questionCount === 0 ? (
          noQuestions
        ) : (
          <div className="stack">
            <div className="card card--lime">
              <p style={{ margin: 0 }}>
                {performance && performance.seen > 0
                  ? `Your results so far: ${performance.correct} of ${performance.seen} correct (${pct(performance.accuracy_percent)}). Revision starts with the questions you missed.`
                  : "You have not answered questions in this topic yet, so revision will start with new questions."}
              </p>
            </div>
            <StartCard
              title="Topic revision"
              text="A set built from your earlier results, with explanations after you submit."
              mode="revision"
              courseId={course.id}
              topicId={topic.id}
              button="Start revision"
            />
          </div>
        ))}
    </div>
  );
}

export function TopicPage() {
  const { topicId } = useParams();
  return <TopicView key={topicId} id={topicId} />;
}

