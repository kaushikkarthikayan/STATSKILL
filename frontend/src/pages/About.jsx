import { useEffect, useRef, useState } from "react";
import { api, serverUrl } from "../api.js";
import { useAuth } from "../auth.jsx";
import { AVATAR_IDS, Avatar } from "../art/Characters.jsx";
import { DOODLES, DoodleField } from "../art/Doodles.jsx";
import { ReactiveText } from "../fx/Effects.jsx";
import { inkFor } from "../profile.jsx";
import { ErrorBox, Field, Loading, useConfirm, useLoad, useToast } from "../ui.jsx";

const SECTIONS = [
  {
    title: "What Study Buddy does",
    text: "It checks your skills with multiple-choice tests, shows which topics are strong and which are missing, and gives you study material, books and practice questions for the gaps.",
  },
  {
    title: "Why it exists",
    text: "Many students study everything equally and never learn where they are weak. Study Buddy points your time at the topics where your own answers show you need it.",
  },
  {
    title: "How you benefit",
    text: "You get a clear score after every test, a report of strong and weak areas, a history that shows improvement, and recommendations you can act on straight away.",
  },
  {
    title: "Assessment and training",
    text: "Take a full assessment, practise one topic, or revise the questions you missed. Each course has study material, important points, topic explanations and book links.",
  },
  {
    title: "How recommendations work",
    text: "They follow fixed rules, not guesses. A topic counts as strong at 70% or more, and as a weak area or missing skill below 50%, only after at least 3 answers. Every recommendation shows the numbers it is based on, and there are none until you have answered questions.",
  },
  {
    title: "How questions are chosen",
    text: "Questions you have not seen come first, and none repeats inside one test. If a topic runs out of new questions you are told, and any repeats are labelled. Nothing is made up to fill the gap.",
  },
];

function CreatorEditor({ creator, onDone }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState({
    name: creator.name,
    nickname: creator.nickname || "",
    role_title: creator.role_title,
    title: creator.title,
    description: creator.description,
    intro: creator.intro,
    theme_color: creator.theme_color,
    avatar: creator.avatar,
  });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2 || form.role_title.trim().length < 2) {
      toast.error("Enter a name and a role, at least 2 characters each.");
      return;
    }
    if (file && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      toast.error("The photo must be a JPG, PNG or WebP file.");
      return;
    }
    if (file && file.size > 2 * 1024 * 1024) {
      toast.error("The photo must be 2 MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      await api.put(`/creators/${creator.id}`, {
        name: form.name.trim(),
        nickname: form.nickname.trim() || null,
        role_title: form.role_title.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        intro: form.intro.trim(),
        theme_color: form.theme_color,
        avatar: form.avatar,
      });
      if (file) {
        const data = new FormData();
        data.append("file", file);
        await api.upload(`/creators/${creator.id}/photo`, data);
      }
      toast.success("Creator saved.");
      onDone(true);
    } catch (error) {
      toast.error(error.message);
      setBusy(false);
    }
  };

  const remove = async () => {
    const yes = await confirm({ title: "Remove this creator?", message: `${creator.name} will be removed from the About page.`, confirmLabel: "Remove", danger: true });
    if (!yes) return;
    try {
      await api.del(`/creators/${creator.id}`);
      toast.success("Creator removed.");
      onDone(true);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form className="card card--soft" onSubmit={save} noValidate style={{ textAlign: "left" }}>
      <Field label="Name" htmlFor={`cn-${creator.id}`}>
        <input id={`cn-${creator.id}`} className="input" value={form.name} onChange={set("name")} />
      </Field>
      <Field label="Role" htmlFor={`cr-${creator.id}`}>
        <input id={`cr-${creator.id}`} className="input" value={form.role_title} onChange={set("role_title")} />
      </Field>
      <div className="form-row">
        <Field label="Nickname" htmlFor={`cm-${creator.id}`}>
          <input id={`cm-${creator.id}`} className="input" value={form.nickname} onChange={set("nickname")} />
        </Field>
        <Field label="Personality title" htmlFor={`ct-${creator.id}`}>
          <input id={`ct-${creator.id}`} className="input" value={form.title} onChange={set("title")} />
        </Field>
      </div>
      <div className="form-row">
        <Field label="Colour" htmlFor={`cc-${creator.id}`}>
          <input id={`cc-${creator.id}`} className="input" type="color" value={form.theme_color} onChange={set("theme_color")} />
        </Field>
        <Field label="Cartoon avatar" htmlFor={`ca-${creator.id}`}>
          <select id={`ca-${creator.id}`} className="select" value={form.avatar} onChange={set("avatar")}>
            {AVATAR_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Team intro" htmlFor={`ci-${creator.id}`}>
        <textarea id={`ci-${creator.id}`} className="textarea" value={form.intro} onChange={set("intro")} maxLength={1000} />
      </Field>
      <Field label="About them" htmlFor={`cd-${creator.id}`}>
        <textarea id={`cd-${creator.id}`} className="textarea" value={form.description} onChange={set("description")} maxLength={1000} />
      </Field>
      <Field label="Photo (optional)" htmlFor={`cp-${creator.id}`} hint="JPG, PNG or WebP, up to 2 MB.">
        <input id={`cp-${creator.id}`} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => setFile(event.target.files[0] || null)} />
      </Field>
      <div className="row">
        <button className="btn btn--sm btn--primary" disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => onDone(false)}>
          Cancel
        </button>
        <button type="button" className="btn btn--sm btn--danger" onClick={remove}>
          Remove
        </button>
      </div>
    </form>
  );
}

function AddCreator({ onAdded }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", role_title: "", description: "" });
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const add = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      toast.error("Enter the creator's name.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/creators", { name: form.name.trim(), role_title: form.role_title.trim() || "Team member", description: form.description.trim() });
      setForm({ name: "", role_title: "", description: "" });
      toast.success("Creator added.");
      onAdded();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="card card--soft" onSubmit={add} noValidate>
      <h3 className="card__title">Add a creator</h3>
      <div className="form-row">
        <Field label="Name" htmlFor="add-name">
          <input id="add-name" className="input" value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Role" htmlFor="add-role">
          <input id="add-role" className="input" value={form.role_title} onChange={set("role_title")} />
        </Field>
      </div>
      <Field label="About them" htmlFor="add-desc">
        <input id="add-desc" className="input" value={form.description} onChange={set("description")} />
      </Field>
      <button className="btn btn--sm btn--primary" disabled={busy}>
        {busy ? "Adding..." : "Add creator"}
      </button>
    </form>
  );
}

/* "Pick your player": ten characters in a fixed order. The page colour follows the chosen member. */
function PickPlayer({ creators, version, isAdmin, editing, setEditing, finished }) {
  const [index, setIndex] = useState(0);
  const refs = useRef([]);
  if (!creators.length) return null;
  const current = creators[Math.min(index, creators.length - 1)];
  const color = current.theme_color || "#BDF700";
  const ink = inkFor(color);
  const move = (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + creators.length) % creators.length;
    setIndex(next);
    refs.current[next]?.focus();
  };
  return (
    <div className="pyp paper" style={{ "--pyp": color, "--pyp-ink": ink }}>
      <DoodleField items={DOODLES.about} />
      <h2 className="pyp__title display">
        <ReactiveText text="PICK YOUR PLAYER" />
      </h2>
      <div className="pyp__grid" role="radiogroup" aria-label="Team members" onKeyDown={move}>
        {creators.map((member, i) => (
          <button
            key={member.id}
            type="button"
            role="radio"
            aria-checked={i === index}
            tabIndex={i === index ? 0 : -1}
            ref={(el) => (refs.current[i] = el)}
            className={`pyp__disc ${i === index ? "is-picked" : ""}`}
            style={{ "--disc": member.theme_color }}
            onClick={() => setIndex(i)}
          >
            <span className="pyp__num">{i + 1}</span>
            {member.has_photo ? (
              <img className="pyp__photo" src={`${serverUrl(member.photo_url)}?v=${version}`} alt="" />
            ) : (
              <Avatar id={member.avatar} bg={member.theme_color} size={88} />
            )}
            <span className="pyp__name">{member.nickname || member.name}</span>
          </button>
        ))}
      </div>
      <div className="pyp__panel" aria-live="polite" key={current.id}>
        <div className="pyp__rings" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        {current.has_photo ? (
          <img className="pyp__big-photo" src={`${serverUrl(current.photo_url)}?v=${version}`} alt={`Photo of ${current.name}`} />
        ) : (
          <Avatar id={current.avatar} bg="#fff" size={190} title={`${current.name}'s cartoon avatar`} className="pyp__big" />
        )}
        <div className="pyp__info">
          <span className="pill">Player {index + 1} of {creators.length}</span>
          <h3 className="pyp__who display">
            {current.name}
            {current.nickname ? ` "${current.nickname}"` : ""}
          </h3>
          <p className="pyp__title2">{current.title}</p>
          <p className="pyp__role">
            <strong>Role:</strong> {current.role_title}
          </p>
          {current.intro && <p>{current.intro}</p>}
          {current.description && <p>{current.description}</p>}
          {current.is_placeholder && <span className="chip chip--warn">Placeholder text: not confirmed by the team</span>}
          {isAdmin && (
            <button className="btn btn--sm" onClick={() => setEditing(current.id)}>
              Edit {current.name}
            </button>
          )}
        </div>
      </div>
      {isAdmin && editing === current.id && <CreatorEditor creator={current} onDone={finished} />}
    </div>
  );
}

export default function About() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(null);
  const [version, setVersion] = useState(0); // changes after a photo upload so the browser fetches the new picture
  const creators = useLoad(() => api.publicGet("/creators"), []);

  // Opening /about#creators scrolls to the creators section once it has loaded.
  useEffect(() => {
    if (!creators.loading && window.location.hash === "#creators") document.getElementById("creators")?.scrollIntoView();
  }, [creators.loading]);

  const finished = (changed) => {
    setEditing(null);
    if (changed) {
      setVersion((current) => current + 1);
      creators.reload();
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <span className="kicker">About</span>
          <h1 className="page-title">About Study Buddy</h1>
          <p className="lead">A skill assessment and practice platform for students.</p>
        </div>
      </div>

      <section id="creators">
        {creators.loading && <Loading label="Loading the team..." />}
        {creators.error && <ErrorBox error={creators.error} onRetry={creators.reload} />}
        {creators.data && (
          <div className="stack">
            <PickPlayer creators={creators.data} version={version} isAdmin={user.role === "admin"} editing={editing} setEditing={setEditing} finished={finished} />
            {user.role === "admin" && <AddCreator onAdded={creators.reload} />}
          </div>
        )}
      </section>

      <h2 className="section-title" style={{ marginTop: 40 }}>
        <span>How Study Buddy works</span>
      </h2>
      <div className="grid grid--2">
        {SECTIONS.map((section) => (
          <div className="card" key={section.title}>
            <h3 className="card__title">{section.title}</h3>
            <p style={{ margin: 0 }}>{section.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
