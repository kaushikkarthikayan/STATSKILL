import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Avatar, Stickman } from "../art/Characters.jsx";
import { DOODLES, DoodleField } from "../art/Doodles.jsx";
import { BadgeArt } from "../art/TopicArt.jsx";
import { LineChart, Ring, Sparkbars } from "../components/Charts.jsx";
import Icon from "../components/Icon.jsx";
import { Bubble, Placeholder, SectionTitle } from "../components/Sketch.jsx";
import { Confetti, Magnetic, ReactiveText, Reveal, Tilt } from "../fx/Effects.jsx";
import { useCountUp, useInView } from "../fx/motion.jsx";
import { THEME_COLORS, useProfile } from "../profile.jsx";
import { ErrorBox, Loading, useLoad } from "../ui.jsx";
import { KIND_LABEL, fmtDate, shortDate } from "../utils.js";

/* The coach reacts to the student's real progress: the pose and the sentence both come from the numbers. */
function coachFor(data) {
  if (!data.course) return { pose: "shrug", text: "Pick the course you are preparing for and I will build your plan!" };
  const percent = data.progress?.progress_percent ?? 0;
  if (percent >= 100) return { pose: "cheer", text: "Course complete! Every question mastered. Legend!" };
  if (percent >= 50) return { pose: "flex", text: `${Math.round(percent)}% mastered. Strong work, keep going!` };
  if (percent > 0) return { pose: "run", text: `${Math.round(percent)}% mastered. Keep running, you are getting there!` };
  if (data.stats.tests_submitted > 0) return { pose: "think", text: "You have started! Answer questions correctly to fill your progress." };
  return { pose: "wave", text: "Ready when you are! Take your first test and I will start tracking." };
}

const ACTIVITY_ICON = { test: "check", material: "book", book: "star", topic: "flag" };
const NEXT_ICON = { resume: "play", revise: "flame", start: "flag", study: "book", assess: "check" };

function StatSticker({ label, value, suffix = "", note, tone, delay = 0 }) {
  const [ref, seen] = useInView();
  const count = useCountUp(typeof value === "number" ? value : null, { active: seen });
  return (
    <Reveal delay={delay} from="zoom">
      <Tilt className={`stat-sticker stat-sticker--${tone}`}>
        <span ref={ref} className="stat-sticker__num display">
          {typeof value === "number" ? `${count}${suffix}` : "-"}
        </span>
        <span className="stat-sticker__label">{label}</span>
        <span className="stat-sticker__note">{note}</span>
      </Tilt>
    </Reveal>
  );
}

function ContinueCard({ data }) {
  const target = data.continue;
  let content;
  if (!data.course) {
    content = (
      <>
        <h3 className="continue__title">Choose your course</h3>
        <p>Your dashboard, progress and recommendations follow the course you are preparing for.</p>
        <Link className="btn btn--primary" to="/profile">
          Set up my profile
          <Icon name="arrow" size={18} />
        </Link>
      </>
    );
  } else if (!target) {
    content = (
      <>
        <h3 className="continue__title">Nothing to continue yet</h3>
        <p>This course has no questions yet. Check back soon, or explore the study material.</p>
        <Link className="btn btn--primary" to="/training">
          Open course training
        </Link>
      </>
    );
  } else if (target.type === "attempt") {
    content = (
      <>
        <span className="kicker">You left a test open</span>
        <h3 className="continue__title">Finish your {target.label.toLowerCase()}</h3>
        <p>
          {target.answered} of {target.total} questions answered.
        </p>
        <Link className="btn btn--primary" to={`/assessment/${target.attempt_id}`}>
          Resume the test
          <Icon name="arrow" size={18} />
        </Link>
      </>
    );
  } else {
    const resuming = target.type === "topic";
    content = (
      <>
        <span className="kicker">{resuming ? "Continue where you stopped" : "Good place to begin"}</span>
        <h3 className="continue__title">{target.name}</h3>
        <p>{resuming ? `${Math.round(target.progress_percent || 0)}% of this topic mastered so far.` : "A fresh topic with questions waiting for you."}</p>
        <Link className="btn btn--primary" to={`/training/topic/${target.topic_id}`}>
          {resuming ? "Continue topic" : "Start topic"}
          <Icon name="arrow" size={18} />
        </Link>
      </>
    );
  }
  return <section className="card card--accent continue">{content}</section>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { loading, data, error, reload } = useLoad(() => api.get("/learning/overview"), []);

  if (loading) return <Loading label="Loading your dashboard..." />;
  if (error)
    return (
      <div className="page">
        <ErrorBox error={error} onRetry={reload} />
      </div>
    );

  const firstName = user.full_name.split(" ")[0];
  const coach = coachFor(data);
  const accent = THEME_COLORS[profile?.theme] || THEME_COLORS.lime;
  const stats = data.stats;
  const progress = data.progress;
  const earned = data.achievements.filter((badge) => badge.earned).length;
  const scores = (data.assessments || [])
    .slice()
    .reverse()
    .map((item) => ({
      label: shortDate(item.submitted_at),
      value: item.score_percent,
      detail: `${item.correct} of ${item.questions} correct · ${KIND_LABEL[item.kind] || item.kind}`,
    }));
  const topicByName = Object.fromEntries((data.topics || []).map((topic) => [topic.name, topic]));

  return (
    <div className="page page--wide dash">
      <section className="dash-hero paper">
        <DoodleField items={DOODLES.dashboard} />
        <Avatar id={profile?.avatar || "scholar"} bg={accent} size={84} className="dash-hero__me" title={`${firstName}'s avatar`} />
        <span className="pill">Dashboard</span>
        <h1 className="dash-hero__title display">
          <ReactiveText text={`Hey, ${firstName}!`} radius={170} />
        </h1>
        <p className="dash-hero__sub">
          {data.course ? (
            <>
              Today's mission: <strong>{data.course.name}</strong>
            </>
          ) : (
            "Let's get your learning plan started."
          )}
        </p>
        <div className="dash-hero__coach">
          <Bubble tone="white" side="right">
            {coach.text}
          </Bubble>
          <div className="dash-hero__figure">
            <Stickman pose={coach.pose} size={130} />
            {coach.pose === "cheer" && <Confetti pieces={36} />}
          </div>
        </div>
        <div className="row row--center">
          <Magnetic>
            <Link className="btn btn--primary btn--lg" to="/assessment">
              Take a test
              <Icon name="arrow" size={20} />
            </Link>
          </Magnetic>
          <Magnetic>
            <Link className="btn btn--lg" to="/training">
              Open training
            </Link>
          </Magnetic>
        </div>
      </section>

      <div className="stat-strip">
        <StatSticker
          tone="lime"
          label="Course progress"
          value={progress ? Math.round(progress.progress_percent ?? 0) : null}
          suffix="%"
          note={progress ? `${progress.mastered_questions} of ${progress.total_questions} questions mastered` : "Choose a course first"}
        />
        <StatSticker
          tone="sky"
          delay={90}
          label="Accuracy"
          value={stats.accuracy_percent === null ? null : Math.round(stats.accuracy_percent)}
          suffix="%"
          note={stats.answers ? `${stats.correct} of ${stats.answers} answers correct` : "No answers yet"}
        />
        <StatSticker tone="pink" delay={180} label="Tests taken" value={stats.tests_submitted} note={stats.tests_submitted ? "Submitted so far" : "Your first one is waiting"} />
        <StatSticker
          tone="sun"
          delay={270}
          label="Day streak"
          value={stats.streak_days}
          note={stats.best_streak_days ? `Best streak: ${stats.best_streak_days} day${stats.best_streak_days === 1 ? "" : "s"}` : "Test on consecutive days"}
        />
      </div>

      <div className="grid grid--2 dash__row">
        <Reveal from="left">
          <ContinueCard data={data} />
        </Reveal>
        <Reveal from="right">
          <section className="card">
            <SectionTitle doodle="flag">Up next</SectionTitle>
            {!data.up_next || data.up_next.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Choose a course to see suggested next steps. They come from your own answers, not a calendar.
              </p>
            ) : (
              <ul className="next-list">
                {data.up_next.map((item) => (
                  <li key={`${item.kind}-${item.title}`}>
                    <Link to={item.link} className="next-item">
                      <span className="next-item__icon">
                        <Icon name={NEXT_ICON[item.kind] || "arrow"} size={18} />
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </span>
                      <Icon name="arrow" size={18} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Reveal>
      </div>

      <section className="dash__block">
        <SectionTitle doodle="book">Your courses</SectionTitle>
        {data.courses.length === 0 ? (
          <Placeholder title="No courses yet" pose="sleep">
            An administrator needs to publish a course before you can start learning.
          </Placeholder>
        ) : (
          <div className="grid grid--3">
            {data.courses.map((course, index) => (
              <Reveal key={course.id} delay={index * 90}>
                <Tilt className={`card course-card ${data.course?.id === course.id ? "is-current" : ""}`}>
                  {data.course?.id === course.id && <span className="course-card__flag">Your course</span>}
                  <div className="course-card__top">
                    <Ring value={course.progress_percent ?? 0} label="mastered" size={104} />
                    <div>
                      <h3 className="course-card__name">{course.name}</h3>
                      <div className="chips">
                        <span className="chip">{course.level}</span>
                        <span className="chip">{course.duration_weeks} weeks</span>
                      </div>
                    </div>
                  </div>
                  <p className="muted small" style={{ margin: "10px 0" }}>
                    {course.topics_completed} of {course.topics_total} topics completed
                    {course.selected_topics ? ` · ${course.selected_topics} in your plan` : ""}
                  </p>
                  <Link className="btn btn--sm btn--primary" to={`/training?course=${course.id}`}>
                    Open course
                    <Icon name="arrow" size={16} />
                  </Link>
                </Tilt>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid--2 dash__row">
        <Reveal>
          <section className="card">
            <SectionTitle doodle="zigzag">Assessment overview</SectionTitle>
            {scores.length === 0 ? (
              <div className="mini-empty">
                <Stickman pose="shrug" size={70} />
                <p className="muted">No submitted tests in this course yet. Your scores will appear here as a chart.</p>
                <Link className="btn btn--sm btn--primary" to="/assessment">
                  Start a test
                </Link>
              </div>
            ) : (
              <>
                <LineChart points={scores} height={210} />
                <p className="muted small" style={{ marginBottom: 0 }}>
                  Latest: <strong>{Math.round(scores[scores.length - 1].value)}%</strong> · {scores.length} recent test{scores.length === 1 ? "" : "s"}
                </p>
              </>
            )}
          </section>
        </Reveal>
        <Reveal delay={120}>
          <section className="card">
            <SectionTitle doodle="bolt">This week</SectionTitle>
            <Sparkbars days={stats.last_7_days} />
            <p className="muted small" style={{ marginBottom: 0 }}>
              Tests you submitted in the last 7 days.
            </p>
          </section>
        </Reveal>
      </div>

      <div className="grid grid--2 dash__row">
        <Reveal>
          <section className="card">
            <SectionTitle doodle="pencil">Recent activity</SectionTitle>
            {data.activity.length === 0 ? (
              <div className="mini-empty">
                <Stickman pose="sleep" size={70} />
                <p className="muted">Nothing here yet. Take a test, open study material or pick a topic and it will show up.</p>
              </div>
            ) : (
              <ol className="timeline">
                {data.activity.map((item, index) => (
                  <li key={`${item.kind}-${item.at}-${index}`}>
                    <Link to={item.link} className="timeline__item">
                      <span className={`timeline__dot timeline__dot--${item.kind}`}>
                        <Icon name={ACTIVITY_ICON[item.kind] || "star"} size={16} />
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {item.detail} · {fmtDate(item.at)}
                        </small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </Reveal>
        <Reveal delay={120}>
          <section className="card">
            <SectionTitle doodle="bulb">Recommended topics</SectionTitle>
            {!data.recommended_topics || data.recommended_topics.length === 0 ? (
              <div className="mini-empty">
                <Stickman pose="think" size={70} />
                <p className="muted">
                  Recommendations appear once your answers show where you need practice. They are never guessed.
                </p>
              </div>
            ) : (
              <ul className="rec-list">
                {data.recommended_topics.map((name) => (
                  <li key={name}>
                    <Link className="rec-chip" to={topicByName[name] ? `/training/topic/${topicByName[name].id}` : "/training"}>
                      <Icon name="flame" size={18} />
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Reveal>
      </div>

      <section className="dash__block">
        <SectionTitle doodle="star">
          Achievements <small className="muted">({earned} of {data.achievements.length})</small>
        </SectionTitle>
        <div className="badges">
          {data.achievements.map((badge, index) => (
            <Reveal key={badge.id} delay={index * 60} from="zoom">
              <Tilt className={`badge-card ${badge.earned ? "is-earned" : "is-locked"}`}>
                <BadgeArt id={badge.id} earned={badge.earned} size={78} />
                <strong>{badge.title}</strong>
                <small>{badge.earned ? badge.description : badge.hint || badge.description}</small>
                {badge.earned && <span className="badge-card__ribbon">Earned</span>}
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
