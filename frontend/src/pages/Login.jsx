import { useState } from "react";
import { api, setSession } from "../api";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ full_name: "", email: "", password: "", role: "student", adviser_code: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const body = mode === "login" ? { email: f.email, password: f.password } : f;
      const r = await api(`/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", body });
      setSession(r.token, r.user);
      onLogin(r.user);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  return (
    <div className="login-wrap">
      <div className="login-left">
        <div className="brand big">
          <div className="logo">CP</div>
          <div>
            <div className="brand-name">ClassPredict</div>
            <div className="brand-sub">University of Ibadan · 4.0 scale</div>
          </div>
        </div>
        <h1>Know where your results are heading, while there is still time to change it.</h1>
        <p className="lead">Enter your semester GPAs and ClassPredict estimates your final class of degree,
          shows how likely each class is, and tells you the average GPA you need to reach your target.</p>
        <ul className="ticks">
          <li>Predictions from the end of 100, 200 or 300 Level</li>
          <li>"What I need" targets for First, 2:1, 2:2 and Third Class</li>
          <li>Cohort upload and at-risk list for academic advisers</li>
        </ul>
      </div>
      <form className="card login-card" onSubmit={submit}>
        <div className="tabs">
          <button type="button" className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>Log in</button>
          <button type="button" className={mode === "register" ? "on" : ""} onClick={() => setMode("register")}>Create account</button>
        </div>
        {mode === "register" && (
          <label>Full name<input value={f.full_name} onChange={up("full_name")} required placeholder="e.g. Adebayo Chidinma" /></label>
        )}
        <label>Email<input type="email" value={f.email} onChange={up("email")} required placeholder="you@example.com" /></label>
        <label>Password<input type="password" value={f.password} onChange={up("password")} required minLength={mode === "register" ? 8 : 1} placeholder={mode === "register" ? "At least 8 characters" : ""} /></label>
        {mode === "register" && (
          <>
            <label>I am a
              <select value={f.role} onChange={up("role")}>
                <option value="student">Student</option>
                <option value="adviser">Academic adviser</option>
              </select>
            </label>
            {f.role === "adviser" && (
              <label>Adviser access code<input value={f.adviser_code} onChange={up("adviser_code")} required placeholder="Given by the department" /></label>
            )}
          </>
        )}
        {err && <div className="error">{err}</div>}
        <button className="btn primary wide" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}</button>
        {mode === "login" && (
          <div className="demo">
            Demo accounts (password <b>demo1234</b>):<br />
            <button type="button" className="linkish" onClick={() => setF({ ...f, email: "student@classpredict.demo", password: "demo1234" })}>student@classpredict.demo</button>
            {" · "}
            <button type="button" className="linkish" onClick={() => setF({ ...f, email: "adviser@classpredict.demo", password: "demo1234" })}>adviser@classpredict.demo</button>
          </div>
        )}
      </form>
    </div>
  );
}
