import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import Ghost from "../art/Ghost.jsx";
import { Meter } from "./Charts.jsx";
import { Bubble } from "./Sketch.jsx";

const ASKS = ["Plan my work", "Point out my mistakes", "What is my level?", "How am I doing?"];

/* The training bot. The ghost manages the student's progress from their own results (XP, level, streak, plan)
   using fixed rules. He is not a language model. He types while you type, thinks while he works and says Hii when touched. */
export default function StudyBuddy() {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState(null);
  const [log, setLog] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [talking, setTalking] = useState(false);
  const [cheer, setCheer] = useState(false);
  const [hello, setHello] = useState(false);
  const end = useRef(null);
  const timer = useRef(null);
  const mode = cheer ? "cheer" : busy ? "think" : talking ? "talk" : typing ? "typing" : "idle";

  useEffect(() => {
    if (!open) return;
    api.get("/assistant/briefing").then(setBrief).catch(() => setBrief(null));
  }, [open]);

  const onType = (event) => {
    setText(event.target.value);
    setTyping(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTyping(false), 700);
  };
  // Touching the ghost makes him wave and say Hii.
  const poke = () => {
    setCheer(true);
    setHello(true);
    setTimeout(() => setCheer(false), 1400);
    setTimeout(() => setHello(false), 2200);
  };
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "nearest" });
  }, [log, busy]);

  const ask = async (question) => {
    const q = question.trim();
    if (!q || busy) return;
    setText("");
    setTyping(false);
    setBusy(true);
    setLog((l) => [...l, { who: "me", text: q }]);
    try {
      const { answer, actions } = await api.post("/assistant/ask", { question: q });
      setLog((l) => [...l, { who: "bot", text: answer, actions }]);
      setTalking(true);
      setTimeout(() => setTalking(false), Math.min(4500, 700 + answer.length * 45));
    } catch (e) {
      setLog((l) => [...l, { who: "bot", text: e.status === 0 || !e.status ? "I cannot reach the server right now. Check that the backend is running." : e.message }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="buddy">
      {open && (
        <section className="buddy__panel card" aria-label="Training bot">
          <div className="row row--between">
            <strong className="card__title" style={{ margin: 0 }}>Training bot</strong>
            <button className="btn btn--sm" onClick={() => setOpen(false)} aria-label="Close training bot">✕</button>
          </div>
          <div className="buddy__brief">
            <div className="buddy__ghost">
              {hello && <div className="buddy__hii">Hii!</div>}
              <Ghost mode={mode} auto size={120} onClick={poke} />
            </div>
            {brief && (
              <div style={{ flex: 1 }}>
                <Bubble side="left">{brief.message}</Bubble>
                <strong className="display buddy__level">
                  Level {brief.level} · {brief.rank}
                </strong>
                <Meter value={brief.percent_to_next} label="Progress to the next level" />
                <small className="muted">
                  {brief.xp} XP · {brief.next_level_at - brief.xp} to level {brief.level + 1} · streak {brief.streak_days}
                </small>
              </div>
            )}
          </div>
          <div className="buddy__log" role="log" aria-live="polite">
            {log.map((m, i) => (
              <div key={i} className={`buddy__msg buddy__msg--${m.who}`}>
                {m.text}
                {m.actions && m.who === "bot" && (
                  <div className="chips" style={{ marginTop: 6 }}>
                    {m.actions.map((a) => (
                      <Link key={a.label} className="chip chip--button" to={a.link} onClick={() => setOpen(false)}>
                        {a.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="buddy__msg buddy__msg--bot">Thinking...</div>}
            <div ref={end} />
          </div>
          <div className="chips">
            {brief?.actions?.map((a) => (
              <Link key={a.label} className="chip chip--button is-on" to={a.link} onClick={() => setOpen(false)}>
                {a.label}
              </Link>
            ))}
            {ASKS.map((a) => (
              <button key={a} className="chip chip--button" onClick={() => ask(a)}>{a}</button>
            ))}
          </div>
          <form className="add-row" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
            <input className="input" value={text} maxLength={300} onChange={onType} aria-label="Your question" placeholder="Type a question" />
            <button className="btn btn--sm btn--primary" disabled={busy}>Ask</button>
          </form>
          <p className="muted small" style={{ margin: 0 }}>Answers come from your own results using fixed rules. This is not an AI chatbot.</p>
        </section>
      )}
      <button className="buddy__fab" onClick={() => { setOpen((o) => !o); if (!open) poke(); }} aria-expanded={open} aria-label="Training bot">
        <Ghost head auto size={64} />
      </button>
    </div>
  );
}