import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { BarList, LineChart, Ring } from "../components/Charts.jsx";
import { Empty, ErrorBox, Loading, useLoad, useToast } from "../ui.jsx";
import { KIND_LABEL, STATUS_LABEL, fmtDate, pct } from "../utils.js";
import { startAttempt } from "../api.js";
import { DonutChart } from "../components/Charts.jsx";
import { BadgeArt } from "../art/TopicArt.jsx";
import { Reveal } from "../fx/Effects.jsx";

const REC_LABEL = {
  missing_skill: "Missing skill",
  weak_area: "Weak area",
  revision: "Revision",
  study_material: "Study material",
  book: "Book",
};
const REC_CHIP = { missing_skill: "chip--bad", weak_area: "chip--warn", revision: "chip--ok", study_material: "", book: "" };

function shortDate(value) {
  const date = new Date(/Z|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function Names({ rows, tone, empty }) {
  if (!rows.length)
    return (
      <p className="muted" style={{ margin: 0 }}>
        {empty}
      </p>
    );
  return (
    <div className="chips">
      {rows.map((row) => (
        <span className={`chip ${tone}`} key={row.topic_id}>
          {row.topic}
          {row.accuracy_percent !== null && ` · ${Math.round(row.accuracy_percent)}%`}
        </span>
      ))}
    </div>
  );
}

export default function Progress() {
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const { loading, data, error, reload } = useLoad(() => api.get("/progress/report"), []);

  if (loading) return <Loading label="Building your report..." />;
  if (error?.status === 400)
    return (
      <div className="page">
        <Empty
          title="Choose your course first"
          action={
            <Link className="btn btn--primary" to="/profile">
              Go to my profile
            </Link>
          }
        >
          {error.message}
        </Empty>
      </div>
    );
  if (error)
    return (
      <div className="page">
        <ErrorBox error={error} onRetry={reload} />
      </div>
    );

  const { student, course, overall, topics, strong_areas, weak_areas, missing_skills, not_assessed_topics, training, improvement, recommendations } = data;
  const history = data.assessment_history;
  const noData = overall.questions_seen === 0;

  const refresh = async () => {
    setBusy("refresh");
    try {
      await api.post("/recommendations/refresh");
      toast.success("Recommendations updated from your latest results.");
      await reload();
    } catch (problem) {
      toast.error(problem.message);
    } finally {
      setBusy("");
    }
  };

  const revise = async (topicId) => {
    setBusy(`revise-${topicId}`);
    try {
      navigate(`/assessment/${await startAttempt({ course_id: course.id, mode: "revision", topic_id: topicId, count: 10 })}`);
    } catch (problem) {
      toast.error(problem.message);
      setBusy("");
    }
  };

  const points = improvement.points.map((point) => ({ label: shortDate(point.submitted_at), value: point.score_percent }));

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <span className="kicker">Progress report</span>
          <h1 className="page-title">{course.name}</h1>
          <p className="lead">
            {student.full_name} · {student.email}
            {student.college ? ` · ${student.college}` : ""}
            {student.graduation_year ? ` · class of ${student.graduation_year}` : ""}
          </p>
        </div>
        <Link className="btn btn--primary" to="/assessment">
          Take another test
        </Link>
      </div>

      {noData && (
        <div className="alert alert--warn" style={{ marginBottom: 18 }}>
          You have not answered any questions in this course yet. Take an assessment and this report will fill in with your real results.
        </div>
      )}

      <div className="stack">
        <div className="grid grid--2">
          <div className="card card--lime">
            <h2 className="card__title">Overall performance</h2>
            <div className="row" style={{ gap: 24 }}>
              <Ring value={overall.accuracy_percent} label="correct" size={150} />
              <div className="grid" style={{ gap: 6 }}>
                <span>
                  Questions answered: <strong>{overall.questions_seen}</strong>
                </span>
                <span>
                  Correct: <strong>{overall.correct}</strong>
                </span>
                <span>
                  Tests submitted: <strong>{overall.tests_submitted}</strong>
                </span>
                <span>
                  Latest assessment: <strong>{pct(overall.latest_assessment_score)}</strong>
                </span>
              </div>
            </div>
          </div>
          <div className="card">
            <h2 className="card__title">Topic-wise performance</h2>
            <BarList
              rows={topics.map((topic) => ({
                label: topic.topic,
                value: topic.accuracy_percent,
                note: topic.seen ? `${topic.correct} of ${topic.seen} answers correct · ${topic.skill_area}` : topic.skill_area,
                status: topic.status,
              }))}
            />
            <p className="muted small" style={{ marginBottom: 0 }}>
              A topic is only called strong or weak after at least 3 answers. Unanswered questions count as incorrect.
            </p>
          </div>
        </div>

        <Reveal>
          <div className="grid grid--2">
            <div className="card">
              <h2 className="card__title">Topic completion</h2>
              <DonutChart
                centerValue={Math.round(data.completion.progress_percent || 0)}
                centerLabel="of questions mastered"
                emptyText="No questions yet"
                segments={[
                  { id: "c", label: "Completed", value: data.completion.topics_completed, color: "#5ED38A", unit: "topics" },
                  { id: "p", label: "In progress", value: data.completion.topics_in_progress, color: "#FFD60A", unit: "topics" },
                  { id: "n", label: "Not started", value: data.completion.topics_not_started, color: "#D9D6CC", unit: "topics" },
                ]}
              />
            </div>
            <div className="card">
              <h2 className="card__title">Completed and pending topics</h2>
              <ul className="list list--plain">
                {data.topic_overview.map((t) => (
                  <li key={t.id} className="row row--between">
                    <span>{t.number}. {t.name}</span>
                    <span className={`chip ${t.state === "completed" ? "chip--ok" : t.state === "in_progress" ? "chip--warn" : ""}`}>
                      {t.state === "completed" ? "Completed" : t.state === "in_progress" ? `${Math.round(t.progress_percent || 0)}% done` : "Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <div className="grid grid--2">
          <div className="card">
            <h2 className="card__title">Milestones</h2>
            {data.milestones.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Milestones appear as you submit tests.</p>
            ) : (
              <ol className="timeline">
                {data.milestones.map((m, i) => (
                  <li key={i}>
                    <div className="timeline__item">
                      <span className="timeline__dot timeline__dot--test">{i + 1}</span>
                      <span><strong>{m.title}</strong><small>{m.detail} · {fmtDate(m.at)}</small></span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="card">
            <h2 className="card__title">Badges</h2>
            <div className="badges badges--small">
              {data.achievements.map((b) => (
                <div key={b.id} className={`badge-card ${b.earned ? "is-earned" : "is-locked"}`}>
                  <BadgeArt id={b.id} earned={b.earned} size={60} />
                  <strong>{b.title}</strong>
                  <small>{b.earned ? "Earned" : b.hint || b.description}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid--3">
          <div className="card">
            <h2 className="card__title">Strong areas</h2>
            <Names rows={strong_areas} tone="chip--ok" empty="No strong topic yet: it takes 70% or more across at least 3 answers." />
          </div>
          <div className="card">
            <h2 className="card__title">Weak areas</h2>
            <Names rows={weak_areas} tone="chip--warn" empty="No weak topic found." />
          </div>
          <div className="card">
            <h2 className="card__title">Missing skills</h2>
            <Names rows={missing_skills} tone="chip--bad" empty="None found: a missing skill is under 50% across at least 3 answers." />
            {not_assessed_topics.length > 0 && (
              <p className="muted small" style={{ marginBottom: 0 }}>
                Not assessed yet: {not_assessed_topics.map((topic) => topic.topic).join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid--2">
          <div className="card">
            <h2 className="card__title">Improvement over time</h2>
            {points.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Submit a full assessment to start the chart.
              </p>
            ) : (
              <>
                <LineChart points={points} />
                <p className="muted small" style={{ marginBottom: 0 }}>
                  {improvement.change_percent_points === null
                    ? "Take a second full assessment to see the change."
                    : `Change since your first assessment: ${improvement.change_percent_points > 0 ? "+" : ""}${improvement.change_percent_points} percentage points.`}
                </p>
              </>
            )}
          </div>
          <div className="card">
            <h2 className="card__title">Training completion</h2>
            {training.published_materials === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No study material has been published for this course yet.
              </p>
            ) : (
              <>
                <p style={{ marginTop: 0 }}>
                  <strong>{training.completed_materials}</strong> of <strong>{training.published_materials}</strong> materials marked done ({pct(training.completion_percent)})
                </p>
                <div className="bar" role="progressbar" aria-label="Training completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(training.completion_percent || 0)}>
                  <div className="bar__fill" style={{ width: `${training.completion_percent || 0}%` }} />
                </div>
              </>
            )}
            <p className="muted small" style={{ marginBottom: 0 }}>
              Saved books for this course: {training.saved_books}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="row row--between">
            <h2 className="card__title" style={{ margin: 0 }}>
              Recommendations
            </h2>
            <button className="btn btn--sm" onClick={refresh} disabled={busy === "refresh"}>
              {busy === "refresh" ? "Updating..." : "Refresh from my results"}
            </button>
          </div>
          {recommendations.length === 0 ? (
            <p className="muted" style={{ marginBottom: 0 }}>
              {noData
                ? "Recommendations are built from your answers, so there are none yet."
                : "No topic needs attention right now. Recommendations appear when a topic scores under 70% across at least 3 answers."}
            </p>
          ) : (
            <ul className="list list--plain" style={{ marginTop: 14 }}>
              {recommendations.map((rec) => (
                <li className="resource" key={rec.id}>
                  <div className="row">
                    <span className={`chip ${REC_CHIP[rec.kind] || ""}`}>{REC_LABEL[rec.kind] || rec.kind}</span>
                    <strong>{rec.evidence?.topic}</strong>
                  </div>
                  <span>{rec.message}</span>
                  <span className="muted small">
                    Based on {rec.evidence?.correct} of {rec.evidence?.seen} correct ({pct(rec.evidence?.accuracy_percent)}) · {fmtDate(rec.created_at)}
                  </span>
                  <div className="row">
                    {rec.kind === "revision" ? (
                      <button className="btn btn--sm btn--primary" onClick={() => revise(rec.topic_id)} disabled={busy === `revise-${rec.topic_id}`}>
                        Start revision
                      </button>
                    ) : (
                      rec.topic_id && (
                        <Link className="btn btn--sm" to={`/training/topic/${rec.topic_id}`}>
                          Open topic
                        </Link>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="card__title">Assessment history</h2>
          {history.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              No submitted tests for this course yet.
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
                  {[...history].reverse().map((item) => (
                    <tr key={item.attempt_id}>
                      <td>{KIND_LABEL[item.kind]}</td>
                      <td>{fmtDate(item.submitted_at)}</td>
                      <td>
                        {pct(item.score_percent)} ({item.correct}/{item.questions})
                      </td>
                      <td>
                        <Link className="btn btn--sm" to={`/assessment/${item.attempt_id}`}>
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
