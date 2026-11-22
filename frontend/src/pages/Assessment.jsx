import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, startAttempt } from "../api.js";
import { Choice, Segmented, Stepper } from "../components/Sketch.jsx";
import { BarList, Ring } from "../components/Charts.jsx";
import { Empty, ErrorBox, Field, Loading, useConfirm, useLoad, useToast } from "../ui.jsx";
import { KIND_LABEL, fmtDate, pct } from "../utils.js";

const OPTION_KEYS = "ABCDEF";
const MODES = [
  { id: "assessment", label: "Full assessment", help: "Mixes questions from every topic, so it measures your skills across the whole course." },
  { id: "practice", label: "Practice set", help: "Practise one topic or the whole course. Questions you have not seen come first." },
  { id: "revision", label: "Revision set", help: "Starts with questions you got wrong, in your weakest topics." },
];

export { startAttempt };

/* ---------- /assessment : set up a test, resume one, see recent results ---------- */
function StartForm({ courses, defaultCourseId }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    course_id: params.get("course") || (defaultCourseId ? String(defaultCourseId) : ""),
    mode: params.get("topics") ? "practice" : "assessment",
    topic_ids: (params.get("topics") || "").split(",").filter(Boolean).map(Number),
    difficulty: "",
    count: 10,
  });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const course = useLoad(() => (form.course_id ? api.get(`/courses/${form.course_id}`) : Promise.resolve(null)), [form.course_id]);
  const topics = course.data?.topics || [];
  const mode = MODES.find((item) => item.id === form.mode);

  const setCourse = (id) => setForm((c) => ({ ...c, course_id: String(id), topic_ids: [] }));
  const toggleTopic = (id) =>
    setForm((c) => ({ ...c, topic_ids: c.topic_ids.includes(id) ? c.topic_ids.filter((x) => x !== id) : [...c.topic_ids, id] }));

  const start = async (event) => {
    event.preventDefault();
    setProblem("");
    const count = Number(form.count);
    if (!form.course_id) return setProblem("Choose a course first.");
    if (!Number.isInteger(count) || count < 1 || count > 50) return setProblem("Choose between 1 and 50 questions.");
    setBusy(true);
    try {
      const id = await startAttempt({
        course_id: Number(form.course_id),
        mode: form.mode,
        topic_ids: form.topic_ids.length ? form.topic_ids : null,
        difficulty: form.difficulty || null,
        count,
      });
      navigate(`/assessment/${id}`);
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <form className="card" onSubmit={start} noValidate>
      <h2 className="card__title">Start a test</h2>
      {problem && (
        <div className="alert alert--error" role="alert" style={{ marginBottom: 14 }}>
          {problem}
        </div>
      )}
      <h3 className="label">1. Course</h3>
      <div className="choice-grid choice-grid--tight" role="radiogroup" aria-label="Course">
        {courses.map((item) => (
          <Choice key={item.id} type="radio" name="t-course" checked={String(item.id) === String(form.course_id)} onChange={() => setCourse(item.id)}>
            <strong className="choice__title">{item.name}</strong>
            <span className="small muted">{item.level}</span>
          </Choice>
        ))}
      </div>
      <h3 className="label">2. Type of test</h3>
      <div className="choice-grid choice-grid--tight" role="radiogroup" aria-label="Type of test">
        {MODES.map((item) => (
          <Choice key={item.id} type="radio" name="t-mode" checked={form.mode === item.id} onChange={() => setForm((c) => ({ ...c, mode: item.id }))}>
            <strong className="choice__title">{item.label}</strong>
            <span className="small">{item.help}</span>
          </Choice>
        ))}
      </div>
      <h3 className="label">3. Topics {course.loading ? "(loading...)" : "(none picked = every topic)"}</h3>
      <div className="choice-grid choice-grid--tight" role="group" aria-label="Topics">
        {topics.map((topic) => (
          <Choice key={topic.id} checked={form.topic_ids.includes(topic.id)} onChange={() => toggleTopic(topic.id)}>
            <strong className="choice__title">{topic.name}</strong>
            <span className="small muted">{topic.question_count} questions</span>
          </Choice>
        ))}
      </div>
      <h3 className="label">4. Difficulty</h3>
      <Segmented
        name="difficulty"
        label="Difficulty"
        value={form.difficulty}
        onChange={(v) => setForm((c) => ({ ...c, difficulty: v }))}
        options={[{ id: "", label: "Any" }, { id: "easy", label: "Easy" }, { id: "medium", label: "Medium" }, { id: "hard", label: "Hard" }]}
      />
      <h3 className="label">5. Number of questions</h3>
      <Stepper value={Number(form.count) || 10} onChange={(v) => setForm((c) => ({ ...c, count: v }))} min={1} max={50} presets={[5, 10, 20, 30]} label="questions" />
      <br />
      <button className="btn btn--primary" disabled={busy}>
        {busy ? "Preparing questions..." : "Start"}
      </button>
    </form>
  );
}

export function AssessmentHome() {
  const { loading, data, error, reload } = useLoad(async () => {
    const [courses, profile, attempts] = await Promise.all([api.get("/courses"), api.get("/profile"), api.get("/assessments")]);
    return { courses, profile, attempts };
  }, []);

  if (loading) return <Loading label="Loading assessments..." />;
  if (error)
    return (
      <div className="page">
        <ErrorBox error={error} onRetry={reload} />
      </div>
    );

  const { courses, profile, attempts } = data;
  const unfinished = attempts.find((attempt) => attempt.status === "in_progress");
  const recent = attempts.filter((attempt) => attempt.status === "submitted").slice(0, 5);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <span className="kicker">Assessment</span>
          <h1 className="page-title">Test your skills</h1>
          <p className="lead">Answer multiple-choice questions. Your score, strong areas and missing skills are worked out from your answers.</p>
        </div>
      </div>

      <div className="stack">
        {unfinished && (
          <div className="alert alert--warn row row--between">
            <span>
              You have an unfinished {KIND_LABEL[unfinished.kind]?.toLowerCase()} from {fmtDate(unfinished.started_at)}.
            </span>
            <Link className="btn btn--sm btn--primary" to={`/assessment/${unfinished.attempt_id}`}>
              Resume it
            </Link>
          </div>
        )}

        {courses.length === 0 ? (
          <Empty title="No courses yet">An administrator needs to publish a course before you can take a test.</Empty>
        ) : (
          <StartForm courses={courses} defaultCourseId={profile.current_course?.id} />
        )}

        <div className="card">
          <h2 className="card__title">Recent results</h2>
          {recent.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Your submitted tests will be listed here with their scores.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Submitted</th>
                    <th>Score</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recent.map((attempt) => (
                    <tr key={attempt.attempt_id}>
                      <td>{KIND_LABEL[attempt.kind]}</td>
                      <td>{fmtDate(attempt.submitted_at)}</td>
                      <td>
                        {pct(attempt.score_percent)} ({attempt.correct_count}/{attempt.question_count})
                      </td>
                      <td>
                        <Link className="btn btn--sm" to={`/assessment/${attempt.attempt_id}`}>
                          View results
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- /assessment/:id : answer the questions ---------- */
function Runner({ attempt, onSubmitted }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [index, setIndex] = useState(() => {
    const firstOpen = attempt.questions.findIndex((q) => q.selected_index === null);
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [answers, setAnswers] = useState(() => Object.fromEntries(attempt.questions.map((q) => [q.position, q.selected_index])));
  const [busy, setBusy] = useState(false);

  const total = attempt.questions.length;
  const question = attempt.questions[index];
  const selected = answers[question.position];
  const answered = Object.values(answers).filter((value) => value !== null && value !== undefined).length;

  // Saved as soon as it is picked. Picking the same option again clears the answer.
  const choose = async (optionIndex) => {
    const previous = answers[question.position];
    const next = previous === optionIndex ? null : optionIndex;
    setAnswers((current) => ({ ...current, [question.position]: next }));
    try {
      await api.put(`/assessments/${attempt.attempt_id}/answers/${question.position}`, { selected_index: next });
    } catch (error) {
      setAnswers((current) => ({ ...current, [question.position]: previous }));
      toast.error(error.message);
    }
  };

  const submit = async () => {
    const open = total - answered;
    const yes = await confirm({
      title: "Submit this test?",
      message: open
        ? `${open} question${open === 1 ? " is" : "s are"} unanswered and will count as incorrect. You cannot change answers after submitting.`
        : "You cannot change your answers after submitting.",
      confirmLabel: "Submit",
    });
    if (!yes) return;
    setBusy(true);
    try {
      onSubmitted(await api.post(`/assessments/${attempt.attempt_id}/submit`));
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <span className="kicker">{KIND_LABEL[attempt.kind]}</span>
          <h1 className="page-title">
            Question {index + 1} of {total}
          </h1>
        </div>
        <span className="chip">
          {answered} of {total} answered
        </span>
      </div>

      <div className="stack">
        {attempt.pool_note && (
          <div className="alert alert--warn" role="status">
            {attempt.pool_note}
          </div>
        )}
        <div className="bar" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}>
          <div className="bar__fill" style={{ width: `${(answered / total) * 100}%` }} />
        </div>

        <div className="card qcard">
          <div className="qmeta">
            <span className="chip">{question.topic}</span>
            <span className="chip">{question.difficulty}</span>
            {question.is_repeat && <span className="chip chip--warn">Repeat question</span>}
          </div>
          <p className="qtext">{question.text}</p>
          <div className="options" role="radiogroup" aria-label="Answer options">
            {question.options.map((text, i) => (
              <button
                type="button"
                key={i}
                role="radio"
                aria-checked={selected === i}
                className={`option ${selected === i ? "selected" : ""}`}
                onClick={() => choose(i)}
              >
                <span className="option__key">{OPTION_KEYS[i]}</span>
                <span>{text}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="qnav" aria-label="Jump to a question">
          {attempt.questions.map((q, i) => (
            <button
              key={q.position}
              className={`${i === index ? "current" : ""} ${answers[q.position] !== null && answers[q.position] !== undefined ? "done" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Question ${i + 1}${answers[q.position] !== null && answers[q.position] !== undefined ? ", answered" : ""}`}
              aria-current={i === index}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="runner-actions">
          <button className="btn" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
            Previous
          </button>
          <div className="row">
            {index < total - 1 && (
              <button className="btn btn--lime" onClick={() => setIndex((i) => i + 1)}>
                Next
              </button>
            )}
            <button className="btn btn--primary" onClick={submit} disabled={busy}>
              {busy ? "Submitting..." : "Submit test"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- results of a submitted test ---------- */
function Results({ attempt }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const reviseNow = async () => {
    setBusy(true);
    try {
      navigate(`/assessment/${await startAttempt({ course_id: attempt.course_id, mode: "revision", count: 10 })}`);
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  const rows = attempt.topic_breakdown.map((topic) => ({
    label: topic.topic,
    value: topic.accuracy_percent,
    note: `${topic.correct} of ${topic.total} correct${topic.unanswered ? `, ${topic.unanswered} unanswered` : ""}`,
    status: topic.status,
  }));
  const chips = (names, tone) =>
    names.length ? (
      <div className="chips">
        {names.map((name) => (
          <span className={`chip ${tone}`} key={name}>
            {name}
          </span>
        ))}
      </div>
    ) : (
      <p className="muted" style={{ margin: 0 }}>
        None in this test.
      </p>
    );

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <span className="kicker">{KIND_LABEL[attempt.kind]} results</span>
          <h1 className="page-title">Your score</h1>
          <p className="lead">Submitted {fmtDate(attempt.submitted_at)}. This result is saved to your account.</p>
        </div>
        <div className="row">
          <Link className="btn" to="/assessment">
            Back to assessments
          </Link>
          <Link className="btn btn--primary" to="/progress">
            Progress report
          </Link>
        </div>
      </div>

      <div className="stack">
        {attempt.pool_note && (
          <div className="alert alert--warn" role="status">
            {attempt.pool_note}
          </div>
        )}

        <div className="grid grid--2">
          <div className="card card--lime">
            <div className="row" style={{ gap: 24 }}>
              <Ring value={attempt.score_percent} label="score" size={150} />
              <div className="grid" style={{ gap: 6 }}>
                <span>
                  <strong>{attempt.correct_count}</strong> correct
                </span>
                <span>
                  <strong>{attempt.incorrect_count}</strong> incorrect
                </span>
                <span>
                  <strong>{attempt.unanswered_count}</strong> unanswered
                </span>
                <span className="muted">{attempt.question_count} questions in total</span>
              </div>
            </div>
          </div>
          <div className="card">
            <h2 className="card__title">Topic-wise performance</h2>
            <BarList rows={rows} />
          </div>
        </div>

        <div className="grid grid--3">
          <div className="card">
            <h2 className="card__title">Strong areas</h2>
            {chips(attempt.strong_areas, "chip--ok")}
          </div>
          <div className="card">
            <h2 className="card__title">Weak areas</h2>
            {chips(attempt.weak_areas, "chip--warn")}
          </div>
          <div className="card">
            <h2 className="card__title">Missing skills</h2>
            {chips(attempt.missing_skills, "chip--bad")}
          </div>
        </div>

        <div className="card">
          <h2 className="card__title">Suggested improvement areas</h2>
          {attempt.suggestions.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Nothing needs attention from this test. Keep practising to stay sharp.
            </p>
          ) : (
            <>
              <ul className="list">
                {attempt.suggestions.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
              <div className="row" style={{ marginTop: 16 }}>
                <button className="btn btn--primary" onClick={reviseNow} disabled={busy}>
                  {busy ? "Preparing..." : "Start a revision set"}
                </button>
                <Link className="btn" to="/training">
                  Open course training
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h2 className="card__title">Review your answers</h2>
          <div className="review">
            {attempt.questions.map((q) => (
              <div className="review__item" key={q.position}>
                <div className="qmeta">
                  <span className="chip">Q{q.position}</span>
                  <span className="chip">{q.topic}</span>
                  {q.is_repeat && <span className="chip chip--warn">Repeat question</span>}
                  <span className={`chip ${q.is_correct ? "chip--ok" : "chip--bad"}`}>
                    {q.selected_index === null ? "Unanswered" : q.is_correct ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <p className="qtext">{q.text}</p>
                <div className="options">
                  {q.options.map((text, i) => {
                    const isCorrect = i === q.correct_index;
                    const isMine = i === q.selected_index;
                    return (
                      <div key={i} className={`option ${isCorrect ? "correct" : isMine ? "wrong" : ""}`} style={{ cursor: "default" }}>
                        <span className="option__key">{OPTION_KEYS[i]}</span>
                        <span>
                          {text}
                          {isCorrect ? " (correct answer)" : ""}
                          {isMine && !isCorrect ? " (your answer)" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div className="explain">
                    <strong>Explanation: </strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttemptView({ id }) {
  const { loading, data, error, reload } = useLoad(() => api.get(`/assessments/${id}`), [id]);
  const [submitted, setSubmitted] = useState(null);

  if (loading) return <Loading label="Loading your test..." />;
  if (error)
    return (
      <div className="page">
        <ErrorBox error={error} onRetry={reload} />
        <p>
          <Link to="/assessment">Back to assessments</Link>
        </p>
      </div>
    );

  const attempt = submitted || data;
  return attempt.status === "submitted" ? <Results attempt={attempt} /> : <Runner attempt={attempt} onSubmitted={setSubmitted} />;
}

export function AttemptPage() {
  const { attemptId } = useParams();
  return <AttemptView key={attemptId} id={attemptId} />;
}
