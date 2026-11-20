import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRightIcon, KeyMinimalisticSquare2Icon, LetterIcon, LockKeyholeIcon, SquareAcademicCapIcon, UserIcon, UsersGroupRoundedIcon } from "@solar-icons/react/linear";
import { api, setSession } from "../api";
import { ease, rise, stagger } from "../lib/motion";
import { Alert, BeamButton, Logo, Segmented, Swap, TextField, TextReveal } from "../components/ui.jsx";

const PREVIEW = [
  ["var(--c-first)", 0.18],
  ["var(--c-21)", 0.64],
  ["var(--c-22)", 0.16],
  ["var(--c-third)", 0.02],
];

function PreviewCard() {
  const size = 108;
  const c = size / 2;
  return (
    <motion.div
      className="preview"
      initial={{ opacity: 0, y: 30, rotate: -4, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: [0, -8, 0], rotate: -3, filter: "blur(0px)" }}
      transition={{ opacity: { duration: 0.9, delay: 0.7 }, filter: { duration: 0.9, delay: 0.7 }, rotate: { duration: 0.9, delay: 0.7 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.6 } }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {PREVIEW.map(([col, p], i) => {
          const r = c - 5 - i * 11;
          return (
            <g key={i}>
              <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
              <motion.circle cx={c} cy={c} r={r} fill="none" strokeWidth="7" strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`}
                style={{ stroke: col }} initial={{ pathLength: 0 }} animate={{ pathLength: p }} transition={{ duration: 1.6, delay: 1 + i * 0.12, ease }} />
            </g>
          );
        })}
      </svg>
      <div>
        <div className="preview__label">Most likely</div>
        <div className="preview__class">Second Class Upper</div>
        <div className="preview__pct">64% <span>· end of 200 Level</span></div>
      </div>
    </motion.div>
  );
}

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ full_name: "", email: "", password: "", role: "student", adviser_code: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const typing = useRef(0);
  const up = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  // Demo accounts type themselves in, one character at a time.
  async function typeDemo(email) {
    const run = ++typing.current;
    setMode("login");
    setErr("");
    setF((o) => ({ ...o, email: "", password: "" }));
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 1; i <= email.length; i += 1) {
      if (run !== typing.current) return;
      setF((o) => ({ ...o, email: email.slice(0, i) }));
      await wait(16);
    }
    const pw = "demo1234";
    for (let i = 1; i <= pw.length; i += 1) {
      if (run !== typing.current) return;
      setF((o) => ({ ...o, password: pw.slice(0, i) }));
      await wait(28);
    }
  }

  async function submit(e) {
    e.preventDefault();
    typing.current += 1;
    setErr("");
    setBusy(true);
    try {
      const body = mode === "login" ? { email: f.email, password: f.password } : f;
      const r = await api(`/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", body });
      setSession(r.token, r.user);
      onLogin(r.user);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  const reg = mode === "register";

  return (
    <div className="login">
      <motion.section className="login__art" initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease }}>
        <div className="login__ht halftone flow" aria-hidden />
        <div className="login__vignette" aria-hidden />
        <motion.div className="login__brand" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease }}>
          <Logo size={32} />
          <span>ClassPredict</span>
        </motion.div>
        <div className="login__copy">
          <h1 className="login__headline serif">
            <TextReveal text="Know your class" delay={0.25} />
            <br />
            <em><TextReveal text="before it’s final." delay={0.6} /></em>
          </h1>
          <PreviewCard />
        </div>
        <motion.div className="login__foot mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.8 }}>
          <SquareAcademicCapIcon size={15} />University of Ibadan · 4.0 scale
        </motion.div>
      </motion.section>

      <section className="login__panel">
        <motion.form className="login__form" onSubmit={submit} variants={stagger(0.07, 0.3)} initial="hidden" animate="show">
          <motion.h2 variants={rise} className="login__title serif">
            <Swap k={mode}>{reg ? "Create your account" : "Welcome back"}</Swap>
          </motion.h2>
          <motion.div variants={rise}>
            <Segmented block value={mode} onChange={(m) => { setMode(m); setErr(""); }} options={[["login", "Log in"], ["register", "Create account"]]} label="Account" />
          </motion.div>

          <AnimatePresence initial={false}>
            {reg && (
              <motion.div key="name" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease }} style={{ overflow: "hidden" }}>
                <TextField label="Full name" icon={UserIcon} value={f.full_name} onChange={up("full_name")} required placeholder="Adebayo Chidinma" autoComplete="name" />
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div variants={rise}>
            <TextField label="Email" icon={LetterIcon} type="email" value={f.email} onChange={up("email")} required placeholder="you@example.com" autoComplete="email" />
          </motion.div>
          <motion.div variants={rise}>
            <TextField label="Password" icon={LockKeyholeIcon} password value={f.password} onChange={up("password")} required
              minLength={reg ? 8 : 1} placeholder={reg ? "At least 8 characters" : "••••••••"} autoComplete={reg ? "new-password" : "current-password"} />
          </motion.div>

          <AnimatePresence initial={false}>
            {reg && (
              <motion.div key="role" className="login__extra" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease }}>
                <div className="field">
                  <div className="field__label">I am a</div>
                  <Segmented block value={f.role} onChange={up("role")} options={[["student", "Student"], ["adviser", "Academic adviser"]]} label="Role" />
                </div>
                <AnimatePresence initial={false}>
                  {f.role === "adviser" && (
                    <motion.div key="code" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease }} style={{ overflow: "hidden" }}>
                      <TextField label="Adviser access code" icon={KeyMinimalisticSquare2Icon} value={f.adviser_code} onChange={up("adviser_code")} required placeholder="From the department" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>{err && <Alert key="err">{err}</Alert>}</AnimatePresence>

          <motion.div variants={rise}>
            <BeamButton wide busy={busy} type="submit">
              <Swap k={`${mode}-${busy}`}>
                {busy ? "One moment" : reg ? "Create account" : "Log in"}
                {!busy && <ArrowRightIcon size={18} className="arrow" />}
              </Swap>
            </BeamButton>
          </motion.div>

          {!reg && (
            <motion.div variants={rise} className="demo">
              <span className="mono">Try a demo</span>
              <div className="demo__chips">
                <button type="button" className="btn sm" onClick={() => typeDemo("student@classpredict.demo")}><UserIcon size={15} />Student</button>
                <button type="button" className="btn sm" onClick={() => typeDemo("adviser@classpredict.demo")}><UsersGroupRoundedIcon size={15} />Adviser</button>
              </div>
            </motion.div>
          )}
        </motion.form>
      </section>
    </div>
  );
}
