import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Avatar, Stickman } from "../art/Characters.jsx";
import { DOODLES, Doodle, DoodleField } from "../art/Doodles.jsx";
import { Ring } from "../components/Charts.jsx";
import Icon from "../components/Icon.jsx";
import { Choice, PageHead, SectionTitle } from "../components/Sketch.jsx";
import { Confetti, Reveal } from "../fx/Effects.jsx";
import { THEME_COLORS, applyTheme, useProfile } from "../profile.jsx";
import { Empty, ErrorBox, Field, Loading, useLoad, useToast } from "../ui.jsx";
import { KIND_LABEL, fmtDate, pct } from "../utils.js";

const STEPS = [
  { id: "avatar", title: "Pick your character", short: "Character" },
  { id: "about", title: "About you", short: "About" },
  { id: "course", title: "Your course", short: "Course" },
  { id: "interests", title: "What are you into?", short: "Interests" },
  { id: "style", title: "How you like to learn", short: "Style" },
  { id: "theme", title: "Pick your theme", short: "Theme" },
];
const MISSING_STEP = { avatar: 0, name: 1, college: 1, graduation_year: 1, bio: 1, course: 2, interests: 3, preferences: 4, theme: 5 };
const MISSING_TEXT = {
  avatar: "Pick a character",
  name: "Add your name",
  college: "Add your college",
  graduation_year: "Add your graduation year",
  bio: "Write a short bio",
  course: "Choose a course",
  interests: "Pick some interests",
  preferences: "Choose how you learn",
  theme: "Pick a theme",
};
const CARD_DOODLES = ["star", "bolt", "heart", "sparkle", "bulb", "pencil", "music", "flag", "book", "check"];

const stepDone = (saved, index) => {
  const missing = saved.completion.missing;
  if (index === 0) return !missing.includes("avatar");
  if (index === 1) return !["name", "college", "graduation_year", "bio"].some((key) => missing.includes(key));
  if (index === 2) return !missing.includes("course");
  if (index === 3) return !missing.includes("interests");
  if (index === 4) return !missing.includes("preferences");
  return !missing.includes("theme");
};

function draftFrom(profile) {
  return {
    avatar: profile.avatar || "",
    theme: profile.theme || "",
    full_name: profile.full_name,
    college: profile.college || "",
    graduation_year: profile.graduation_year ?? "",
    current_course_id: profile.current_course?.id ?? "",
    interests: profile.interests || [],
    bio: profile.bio || "",
    learning_preferences: profile.learning_preferences || [],
  };
}

function toggleIn(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/* ---------- the six steps ---------- */
function AvatarStep({ draft, setDraft, options }) {
  const accent = THEME_COLORS[draft.theme] || THEME_COLORS.lime;
  return (
    <div className="avatar-grid" role="radiogroup" aria-label="Characters">
      {options.avatars.map((avatar) => (
        <Choice key={avatar.id} type="radio" name="avatar" checked={draft.avatar === avatar.id} onChange={() => setDraft((d) => ({ ...d, avatar: avatar.id }))} className="choice--avatar">
          <Avatar id={avatar.id} size={92} bg={accent} />
          <strong>{avatar.label}</strong>
        </Choice>
      ))}
    </div>
  );
}

function AboutStep({ draft, setDraft, errors, email }) {
  const set = (key) => (event) => setDraft((d) => ({ ...d, [key]: event.target.value }));
  return (
    <div>
      <div className="form-row">
        <Field label="Full name" htmlFor="full_name" error={errors.full_name}>
          <input id="full_name" className="input" value={draft.full_name} onChange={set("full_name")} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="email" hint="Your email is your login and cannot be changed here.">
          <input id="email" className="input" value={email} disabled />
        </Field>
      </div>
      <div className="form-row">
        <Field label="College or school" htmlFor="college">
          <input id="college" className="input" value={draft.college} onChange={set("college")} />
        </Field>
        <Field label="Graduation year" htmlFor="year" error={errors.graduation_year}>
          <input id="year" className="input" inputMode="numeric" value={draft.graduation_year} onChange={set("graduation_year")} placeholder="2027" />
        </Field>
      </div>
      <Field label="About you" htmlFor="bio" hint={`${draft.bio.length} of 1000 characters`}>
        <textarea id="bio" className="textarea" value={draft.bio} onChange={set("bio")} maxLength={1000} placeholder="What are you studying for, and what do you want to get better at?" />
      </Field>
    </div>
  );
}

function CourseStep({ draft, setDraft, courses }) {
  return (
    <div>
      <div className="choice-grid" role="radiogroup" aria-label="Courses">
        {courses.map((course, index) => (
          <Choice key={course.id} type="radio" name="course" checked={Number(draft.current_course_id) === course.id} onChange={() => setDraft((d) => ({ ...d, current_course_id: course.id }))}>
            <Doodle name={CARD_DOODLES[index % CARD_DOODLES.length]} size={34} />
            <strong className="choice__title">{course.name}</strong>
            <span className="muted small">
              {course.level} · {course.duration_weeks} weeks
            </span>
            {course.description && <span className="small">{course.description.slice(0, 110)}</span>}
          </Choice>
        ))}
        <Choice type="radio" name="course" checked={draft.current_course_id === ""} onChange={() => setDraft((d) => ({ ...d, current_course_id: "" }))}>
          <Doodle name="question" size={34} />
          <strong className="choice__title">Not sure yet</strong>
          <span className="small muted">You can choose later. The dashboard waits for a course.</span>
        </Choice>
      </div>
      <p className="muted small">After this, open Course Training to pick the exact topics you want to study.</p>
    </div>
  );
}

function InterestStep({ draft, setDraft, options }) {
  const [custom, setCustom] = useState("");
  const extra = draft.interests.filter((item) => !options.interests.includes(item));
  const add = (event) => {
    event.preventDefault();
    const value = custom.trim();
    if (!value || draft.interests.length >= 20) return;
    if (!draft.interests.some((item) => item.toLowerCase() === value.toLowerCase())) setDraft((d) => ({ ...d, interests: [...d.interests, value] }));
    setCustom("");
  };
  return (
    <div>
      <div className="choice-grid choice-grid--tight" role="group" aria-label="Interests">
        {options.interests.map((interest, index) => (
          <Choice key={interest} checked={draft.interests.includes(interest)} onChange={() => setDraft((d) => ({ ...d, interests: toggleIn(d.interests, interest) }))}>
            <Doodle name={CARD_DOODLES[index % CARD_DOODLES.length]} size={38} />
            <strong className="choice__title">{interest}</strong>
          </Choice>
        ))}
      </div>
      {extra.length > 0 && (
        <div className="chips" style={{ marginTop: 14 }}>
          {extra.map((item) => (
            <button key={item} type="button" className="chip chip--button is-on" onClick={() => setDraft((d) => ({ ...d, interests: toggleIn(d.interests, item) }))} aria-label={`Remove ${item}`}>
              {item} ✕
            </button>
          ))}
        </div>
      )}
      <form className="add-row" onSubmit={add}>
        <label className="label" htmlFor="custom-interest">
          Something else?
        </label>
        <input id="custom-interest" className="input" value={custom} maxLength={40} onChange={(event) => setCustom(event.target.value)} placeholder="Type an interest and press Add" />
        <button className="btn btn--sm" disabled={!custom.trim() || draft.interests.length >= 20}>
          Add
        </button>
      </form>
    </div>
  );
}

function StyleStep({ draft, setDraft, options }) {
  const formats = options.preferences.filter((item) => item.group === "format");
  const times = options.preferences.filter((item) => item.group === "time");
  const toggle = (id) => setDraft((d) => ({ ...d, learning_preferences: toggleIn(d.learning_preferences, id) }));
  return (
    <div className="stack">
      <div>
        <h3 className="label">How do you like to study?</h3>
        <div className="choice-grid choice-grid--tight">
          {formats.map((item, index) => (
            <Choice key={item.id} checked={draft.learning_preferences.includes(item.id)} onChange={() => toggle(item.id)}>
              <Doodle name={CARD_DOODLES[(index + 3) % CARD_DOODLES.length]} size={38} />
              <strong className="choice__title">{item.label}</strong>
            </Choice>
          ))}
        </div>
      </div>
      <div>
        <h3 className="label">When do you study best?</h3>
        <div className="choice-grid choice-grid--tight">
          {times.map((item) => (
            <Choice key={item.id} checked={draft.learning_preferences.includes(item.id)} onChange={() => toggle(item.id)}>
              <Doodle name={item.id === "mornings" ? "sparkle" : item.id === "afternoons" ? "star" : item.id === "evenings" ? "cloud" : "heart"} size={34} />
              <strong className="choice__title">{item.label}</strong>
            </Choice>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThemeStep({ draft, setDraft, options }) {
  return (
    <div>
      <div className="swatches" role="radiogroup" aria-label="Themes">
        {options.themes.map((theme) => (
          <Choice key={theme.id} type="radio" name="theme" checked={draft.theme === theme.id} onChange={() => setDraft((d) => ({ ...d, theme: theme.id }))} className="choice--swatch">
            <span className="swatch" style={{ background: theme.color }} />
            <strong>{theme.label}</strong>
          </Choice>
        ))}
      </div>
      <p className="muted small">The whole website changes to your colour as soon as you pick one. Saving keeps it.</p>
    </div>
  );
}

/* ---------- the builder ---------- */
function Builder({ initial, options, courses, attempts, reloadAll }) {
  const { setUser } = useAuth();
  const { setProfile } = useProfile();
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(() => draftFrom(initial));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const firstOpen = STEPS.findIndex((_, index) => !stepDone(initial, index));
  const [step, setStep] = useState(Math.max(0, firstOpen));
  const [mode, setMode] = useState(initial.completion.percent === 100 ? "summary" : "builder");
  const [celebrate, setCelebrate] = useState(false);
  const savedTheme = useRef(initial.theme);

  // The chosen theme is previewed live; leaving the page without saving restores the saved one.
  useEffect(() => {
    applyTheme(draft.theme || null);
  }, [draft.theme]);
  useEffect(() => () => applyTheme(savedTheme.current || null), []);

  const accent = THEME_COLORS[draft.theme] || THEME_COLORS.lime;
  const course = courses.find((item) => item.id === Number(draft.current_course_id));

  const payloadFor = (index) => {
    const found = {};
    let body = {};
    if (index === 0) body = { avatar: draft.avatar || null };
    if (index === 1) {
      if (draft.full_name.trim().length < 2) found.full_name = "Enter your full name.";
      const year = draft.graduation_year === "" ? null : Number(draft.graduation_year);
      if (year !== null && (!Number.isInteger(year) || year < 1950 || year > 2100)) found.graduation_year = "Enter a year between 1950 and 2100.";
      body = { full_name: draft.full_name.trim(), college: draft.college.trim() || null, graduation_year: year, bio: draft.bio.trim() || null };
    }
    if (index === 2) body = { current_course_id: draft.current_course_id === "" ? null : Number(draft.current_course_id) };
    if (index === 3) body = { interests: draft.interests };
    if (index === 4) body = { learning_preferences: draft.learning_preferences };
    if (index === 5) body = { theme: draft.theme || null };
    return { found, body };
  };

  const save = async (index, then) => {
    const { found, body } = payloadFor(index);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const result = await api.put("/profile", body);
      setSaved(result);
      setProfile(result);
      setUser((current) => ({ ...current, full_name: result.full_name }));
      savedTheme.current = result.theme;
      then(result);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const next = () =>
    save(step, (result) => {
      if (step < STEPS.length - 1) {
        toast.success(`${STEPS[step].short} saved.`);
        setStep(step + 1);
        return;
      }
      toast.success(result.completion.percent === 100 ? "Profile complete!" : "Profile saved.");
      setCelebrate(result.completion.percent === 100);
      setMode("summary");
      reloadAll();
    });

  const jump = (index) => {
    setErrors({});
    setStep(index);
    setMode("builder");
  };

  const percent = saved.completion.percent;
  const missing = saved.completion.missing;
  const savedCourse = saved.current_course?.name;
  const themeLabel = options.themes.find((item) => item.id === saved.theme)?.label;

  return (
    <div className="stack profile">
      <Reveal>
        <section className="id-card paper" style={{ "--card": accent }}>
          <DoodleField items={DOODLES.profile} />
          <div className="id-card__avatar">
            <Avatar id={draft.avatar || "scholar"} bg="#fff" size={150} title="Your character" />
            {celebrate && <Confetti pieces={40} />}
          </div>
          <div className="id-card__body">
            <span className="pill">Student ID</span>
            <h2 className="id-card__name display">{draft.full_name || "Your name"}</h2>
            <p className="id-card__meta">
              {saved.email} · {saved.role === "content_creator" ? "Content creator" : saved.role}
            </p>
            <div className="chips">
              <span className="chip">{savedCourse || "No course yet"}</span>
              {saved.college && <span className="chip">{saved.college}</span>}
              {saved.graduation_year && <span className="chip">Class of {saved.graduation_year}</span>}
              <span className="chip">Member since {fmtDate(saved.member_since).split(",")[0]}</span>
            </div>
          </div>
          <div className="id-card__ring">
            <Ring value={percent} label="complete" sub="profile" size={128} color="var(--ink)" />
          </div>
        </section>
      </Reveal>

      {mode === "builder" ? (
        <Reveal delay={80}>
          <section className="card builder">
            <ol className="sdots" aria-label="Profile steps">
              {STEPS.map((item, index) => (
                <li key={item.id}>
                  <button type="button" className={`sdot ${index === step ? "is-current" : ""} ${stepDone(saved, index) ? "is-done" : ""}`} onClick={() => jump(index)} aria-current={index === step ? "step" : undefined}>
                    <span className="sdot__num">{stepDone(saved, index) && index !== step ? <Icon name="check" size={16} /> : index + 1}</span>
                    <span className="sdot__label">{item.short}</span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="builder__head">
              <span className="kicker">
                Step {step + 1} of {STEPS.length}
              </span>
              <h2 className="builder__title display">{STEPS[step].title}</h2>
            </div>

            <div className="builder__body" key={step}>
              {step === 0 && <AvatarStep draft={draft} setDraft={setDraft} options={options} />}
              {step === 1 && <AboutStep draft={draft} setDraft={setDraft} errors={errors} email={saved.email} />}
              {step === 2 && <CourseStep draft={draft} setDraft={setDraft} courses={courses} />}
              {step === 3 && <InterestStep draft={draft} setDraft={setDraft} options={options} />}
              {step === 4 && <StyleStep draft={draft} setDraft={setDraft} options={options} />}
              {step === 5 && <ThemeStep draft={draft} setDraft={setDraft} options={options} />}
            </div>

            <div className="builder__nav">
              <button type="button" className="btn btn--ghost" onClick={() => jump(Math.max(0, step - 1))} disabled={step === 0 || busy}>
                Back
              </button>
              <div className="row">
                {step < STEPS.length - 1 && (
                  <button type="button" className="btn btn--ghost" onClick={() => jump(step + 1)} disabled={busy}>
                    Skip
                  </button>
                )}
                <button type="button" className="btn btn--primary" onClick={next} disabled={busy}>
                  {busy ? "Saving..." : step === STEPS.length - 1 ? "Save and finish" : "Save and continue"}
                  <Icon name="arrow" size={18} />
                </button>
              </div>
            </div>
          </section>
        </Reveal>
      ) : (
        <Reveal delay={80}>
          <section className="card passport">
            <div className="passport__head">
              <Stickman pose={percent === 100 ? "cheer" : "wave"} size={90} />
              <div>
                <SectionTitle doodle="sparkle">{percent === 100 ? "Your profile is complete!" : "Your profile"}</SectionTitle>
                <p className="muted" style={{ margin: 0 }}>
                  {percent === 100 ? "Everything is saved. Your dashboard and recommendations use these choices." : `${percent}% complete. Fill in the rest to get the most from Study Buddy.`}
                </p>
              </div>
              <button type="button" className="btn btn--primary" onClick={() => jump(0)}>
                <Icon name="edit" size={18} />
                Edit profile
              </button>
            </div>
            <div className="passport__grid">
              <div>
                <h3 className="label">About you</h3>
                <p style={{ margin: "0 0 6px" }}>{saved.bio || <span className="muted">No bio yet.</span>}</p>
                <button type="button" className="link-btn" onClick={() => jump(1)}>
                  Edit details
                </button>
              </div>
              <div>
                <h3 className="label">Course</h3>
                <p style={{ margin: "0 0 6px" }}>{savedCourse || <span className="muted">Not chosen yet.</span>}</p>
                <button type="button" className="link-btn" onClick={() => jump(2)}>
                  Change course
                </button>
              </div>
              <div>
                <h3 className="label">Interests</h3>
                <div className="chips">{saved.interests.length ? saved.interests.map((item) => <span className="chip" key={item}>{item}</span>) : <span className="muted">None yet.</span>}</div>
                <button type="button" className="link-btn" onClick={() => jump(3)}>
                  Edit interests
                </button>
              </div>
              <div>
                <h3 className="label">How you learn</h3>
                <div className="chips">
                  {saved.learning_preferences.length ? (
                    saved.learning_preferences.map((id) => (
                      <span className="chip" key={id}>
                        {options.preferences.find((item) => item.id === id)?.label || id}
                      </span>
                    ))
                  ) : (
                    <span className="muted">None yet.</span>
                  )}
                </div>
                <button type="button" className="link-btn" onClick={() => jump(4)}>
                  Edit style
                </button>
              </div>
              <div>
                <h3 className="label">Theme</h3>
                <p style={{ margin: "0 0 6px" }} className="row">
                  <span className="swatch swatch--sm" style={{ background: accent }} />
                  {themeLabel || "Lime (default)"}
                </p>
                <button type="button" className="link-btn" onClick={() => jump(5)}>
                  Change theme
                </button>
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {missing.length > 0 && (
        <Reveal delay={120}>
          <section className="card card--soft todo">
            <h3 className="label" style={{ margin: 0 }}>
              Still to do ({missing.length})
            </h3>
            <div className="chips">
              {missing.map((key) => (
                <button key={key} type="button" className="chip chip--button" onClick={() => jump(MISSING_STEP[key])}>
                  + {MISSING_TEXT[key]}
                </button>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      <Reveal>
        <section className="card">
          <SectionTitle doodle="zigzag">Test history</SectionTitle>
          {attempts.length === 0 ? (
            <Empty
              title="No tests yet"
              pose="wave"
              action={
                <Link className="btn btn--primary" to="/assessment">
                  Start your first assessment
                </Link>
              }
            >
              Your assessments, practice sets and revision sets will be saved here.
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Started</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt) => (
                    <tr key={attempt.attempt_id}>
                      <td>{KIND_LABEL[attempt.kind] || attempt.kind}</td>
                      <td>{fmtDate(attempt.started_at)}</td>
                      <td>{attempt.status === "submitted" ? "Submitted" : "In progress"}</td>
                      <td>{attempt.score_percent === null ? "-" : pct(attempt.score_percent)}</td>
                      <td>
                        <Link className="btn btn--sm" to={`/assessment/${attempt.attempt_id}`}>
                          {attempt.status === "submitted" ? "View results" : "Resume"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </Reveal>
    </div>
  );
}

export default function Profile() {
  const { loading, data, error, reload } = useLoad(async () => {
    const [profile, options, courses, attempts] = await Promise.all([api.get("/profile"), api.get("/profile/options"), api.get("/courses"), api.get("/assessments")]);
    return { profile, options, courses, attempts };
  }, []);

  if (loading && !data) return <Loading label="Loading your profile..." />;
  if (error)
    return (
      <div className="page">
        <ErrorBox error={error} onRetry={reload} />
      </div>
    );

  return (
    <div className="page">
      <PageHead kicker="Profile" title="Build your profile" lead="Six quick steps. Each one is saved as you go, so you can stop and come back any time." />
      <Builder initial={data.profile} options={data.options} courses={data.courses} attempts={data.attempts} reloadAll={reload} />
    </div>
  );
}
