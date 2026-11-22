import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, startAttempt } from "../api.js";
import { TopicArt, assignTopicArt } from "../art/TopicArt.jsx";
import { Stickman } from "../art/Characters.jsx";
import { Confetti, Reveal, Tilt } from "../fx/Effects.jsx";
import { ErrorBox, Loading, useLoad, useToast } from "../ui.jsx";
import { Meter } from "./Charts.jsx";
import { Choice, Placeholder, StateSticker } from "./Sketch.jsx";

/* Topics shown as game levels: three distinct states, pick/unpick, details, and per-topic progress from real answers. */
export default function Levels({ courseId }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { loading, data, error, reload } = useLoad(() => api.get(`/learning/topics?course_id=${courseId}`), [courseId]);
  const [topics, setTopics] = useState([]);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState("");
  useEffect(() => setTopics(data?.topics || []), [data]);
  const art = useMemo(() => assignTopicArt(topics), [topics]);

  if (loading && !data) return <Loading label="Loading levels..." />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!topics.length) return <Placeholder title="No topics yet">No topics have been added to this course yet.</Placeholder>;

  const picked = topics.filter((t) => t.selected);
  const toggle = async (topic) => {
    const selected = !topic.selected;
    setTopics((list) => list.map((t) => (t.id === topic.id ? { ...t, selected } : t)));
    try {
      await api.put(`/learning/topics/${topic.id}/selection`, { selected });
    } catch (e) {
      setTopics((list) => list.map((t) => (t.id === topic.id ? { ...t, selected: !selected } : t)));
      toast.error(e.message);
    }
  };
  const setAll = async (all) => {
    const ids = all ? topics.map((t) => t.id) : [];
    setTopics((list) => list.map((t) => ({ ...t, selected: all })));
    try {
      await api.put("/learning/selection", { course_id: courseId, topic_ids: ids });
    } catch (e) {
      toast.error(e.message);
      reload();
    }
  };
  const practise = async (topic, mode) => {
    setBusy(`${mode}${topic.id}`);
    try {
      navigate(`/assessment/${await startAttempt({ course_id: courseId, mode, topic_id: topic.id, count: 10 })}`);
    } catch (e) {
      toast.error(e.message);
      setBusy("");
    }
  };
  const current = topics.find((t) => t.state === "in_progress") || topics.find((t) => t.state === "not_started");
  const p = data.progress;

  return (
    <div className="stack">
      <div className="level-track" aria-label="Course map">
        {topics.map((t) => (
          <a key={t.id} href={`#level-${t.id}`} className={`level-node level-node--${t.state}`} title={`${t.number}. ${t.name}: ${t.state.replace("_", " ")}`}>
            {current?.id === t.id && <Stickman pose="run" size={42} className="level-node__me" />}
            <span>{t.number}</span>
          </a>
        ))}
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        {p.topics_completed} completed · {p.topics_in_progress} in progress · {p.topics_not_started} not started · course {Math.round(p.progress_percent || 0)}% mastered
      </p>
      <div className="row levels-bar">
        <button className="btn btn--sm" onClick={() => setAll(true)}>Select all</button>
        <button className="btn btn--sm btn--ghost" onClick={() => setAll(false)} disabled={!picked.length}>Clear</button>
        <span className="muted small">{picked.length} topic{picked.length === 1 ? "" : "s"} in your plan</span>
        <Link
          className={`btn btn--sm btn--primary ${picked.length ? "" : "is-off"}`}
          aria-disabled={!picked.length}
          to={picked.length ? `/assessment?course=${courseId}&topics=${picked.map((t) => t.id).join(",")}` : "#"}
          onClick={(e) => !picked.length && e.preventDefault()}
        >
          Test my picks
        </Link>
      </div>
      <div className="grid grid--3">
        {topics.map((t, i) => (
          <Reveal key={t.id} delay={(i % 3) * 80}>
            <Tilt as="article" id={`level-${t.id}`} className={`card level level--${t.state}`}>
              {t.state === "completed" && <Confetti pieces={14} />}
              <div className="level__top">
                <span className="level__num display">LEVEL {String(t.number).padStart(2, "0")}</span>
                <StateSticker state={t.state} />
              </div>
              <TopicArt kind={art[t.id]} size={150} />
              <h3 className="level__name">{t.name}</h3>
              <span className="kicker">{t.skill_area}</span>
              <Meter value={t.progress_percent ?? 0} label={`${t.name} mastery`} />
              <small className="muted">{t.mastered} of {t.question_count} questions mastered</small>
              <Choice checked={t.selected} onChange={() => toggle(t)} className="level__pick">
                <span>{t.selected ? "In my plan" : "Add to my plan"}</span>
              </Choice>
              <div className="row">
                <button className="btn btn--sm" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>
                  {open === t.id ? "Hide details" : "Details"}
                </button>
                <Link className="btn btn--sm btn--primary" to={`/training/topic/${t.id}`}>
                  {t.state === "not_started" ? "Start" : t.state === "completed" ? "Review" : "Continue"}
                </Link>
              </div>
              {open === t.id && (
                <div className="level__details">
                  <p style={{ margin: 0 }}>{t.description || "No description yet."}</p>
                  {t.learning_objectives.length > 0 && (
                    <ul className="list small">{t.learning_objectives.map((o) => <li key={o}>{o}</li>)}</ul>
                  )}
                  <p className="small" style={{ margin: 0 }}>
                    Accuracy: {t.accuracy_percent === null ? "no answers yet" : `${Math.round(t.accuracy_percent)}% of ${t.answers} answers`} · Study material: {t.materials_done}/{t.materials_total} done
                  </p>
                  <div className="row">
                    <button className="btn btn--sm btn--lime" disabled={!t.question_count || !!busy} onClick={() => practise(t, "practice")}>Practise 10</button>
                    {t.seen > 0 && <button className="btn btn--sm" disabled={!!busy} onClick={() => practise(t, "revision")}>Revise</button>}
                  </div>
                </div>
              )}
            </Tilt>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
