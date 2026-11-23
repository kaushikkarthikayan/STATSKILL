import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { Stickman } from "../art/Characters.jsx";
import { DOODLES, DoodleField } from "../art/Doodles.jsx";
import { Disc, LogoBadge } from "../components/Logo.jsx";
import { Reveal, Tilt } from "../fx/Effects.jsx";

// Splits a headline into letters so they pop in one by one (the template's data-split behaviour).
function Letters({ text, delay = 0 }) {
  return (
    <span className="line" aria-label={text}>
      {[...text].map((char, index) => (
        <span className="ch" aria-hidden="true" key={index} style={{ "--i": index, "--d": `${delay}ms` }}>
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

const STEPS = [
  { title: "Assess", text: "Take a skill assessment across the topics of your course." },
  { title: "Find gaps", text: "See which topics are strong and which skills are missing, from your own answers." },
  { title: "Practise", text: "Work through MCQs. New questions come first, and repeats are always labelled." },
  { title: "Track", text: "Watch your score change over time and follow recommendations that cite your results." },
];

export default function Welcome() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [reduced, setReduced] = useState(() => document.documentElement.dataset.reduceMotion === "true");

  useEffect(() => {
    document.title = "Study Buddy | Skill assessment and practice";
    const timer = setTimeout(() => setLoaded(true), 1100); // how long the logo shows before the page opens
    return () => clearTimeout(timer);
  }, []);

  const toggleMotion = () => {
    const next = !reduced;
    setReduced(next);
    if (next) document.documentElement.dataset.reduceMotion = "true";
    else delete document.documentElement.dataset.reduceMotion;
    try {
      localStorage.setItem("statskill.reduceMotion", next ? "1" : "0");
    } catch {
      /* the choice just will not be remembered */
    }
  };

  const buttons = user ? (
    <Link className="btn btn--primary" to="/dashboard">
      Open my dashboard
    </Link>
  ) : (
    <>
      <Link className="btn btn--primary" to="/signup">
        Sign up
      </Link>
      <Link className="btn btn--lime" to="/login">
        Log in
      </Link>
    </>
  );

  const marquee = "Assess ✦ Practise ✦ Revise ✦ Improve ✦ ";

  return (
    <div className={`welcome ${loaded ? "is-loaded" : ""}`}>
      <a className="skip" href="#intro">
        Skip to content
      </a>

      <div className="preloader" aria-hidden="true">
        <LogoBadge size="lg" />
      </div>

      <header className="welcome__bar">
        <button type="button" className="btn btn--sm btn--lime" onClick={toggleMotion} aria-pressed={reduced}>
          {reduced ? "Motion is reduced" : "Reduce motion"}
        </button>
        <nav className="welcome__actions" aria-label="Account">
          {buttons}
        </nav>
      </header>

      <main id="intro">
        <section className="hero paper">
          <DoodleField items={DOODLES.welcome} />
          <div className="hero__top">
            <span className="hero__word">Hello,</span>
            <LogoBadge />
            <span className="hero__word">student</span>
          </div>
          <h1 className="hero__title display">
            <Letters text="MEASURE" />
            <Letters text="SKILLS" delay={250} />
          </h1>
          <div className="hero__float hero__float--l"><Stickman pose="read" size={120} color="#FFE27A" /></div>
          <div className="hero__float hero__float--r"><Stickman pose="cheer" size={120} color="#FFB4A2" /></div>
          <h2 className="hero__sub">Take a skill check, see what is missing, then practise with fresh questions until it sticks.</h2>
          <div className="hero__cta">{buttons}</div>
          <div className="hero__dome">
            <div className="hero__roll">
              <Disc brand="STUDY" name="BUDDY" tag="Skill check" />
            </div>
          </div>
        </section>

        <section className="band" aria-hidden="true">
          <div className="band__strip">
            <div className="band__track">
              <span>{marquee.repeat(2)}</span>
              <span>{marquee.repeat(2)}</span>
            </div>
          </div>
        </section>

        <section className="how">
          <div className="how__inner">
            <span className="pill pill--green">How it works</span>
            <div className="grid grid--4" style={{ marginTop: 22 }}>
              {STEPS.map((step, index) => (
                <Reveal key={step.title} delay={index * 90}><Tilt className="card card--lime">
                  <span className="kicker">Step {index + 1}</span>
                  <h3 className="card__title" style={{ marginTop: 6 }}>
                    {step.title}
                  </h3>
                  <p style={{ margin: 0 }}>{step.text}</p>
                </Tilt></Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="how how--foot">
        <div className="how__inner row row--between">
          <span>Study Buddy. Skill assessment, practice and progress.</span>
          <span className="row">
            <Link to="/login">Log in</Link>
            <Link to="/signup">Sign up</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

