import { useState } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { savedUser, setSession } from "./api";
import Login from "./pages/Login.jsx";
import Predict from "./pages/Predict.jsx";
import Calculator from "./pages/Calculator.jsx";
import History from "./pages/History.jsx";
import Cohort from "./pages/Cohort.jsx";
import ModelInfo from "./pages/ModelInfo.jsx";

const NAV = [
  { to: "/predict", label: "Predict my class", icon: "◎" },
  { to: "/calculator", label: "What I need", icon: "÷" },
  { to: "/history", label: "History", icon: "↺" },
  { to: "/cohort", label: "Cohort upload", icon: "⇪", adviser: true },
  { to: "/model", label: "Model performance", icon: "▤" },
];

export default function App() {
  const [user, setUser] = useState(savedUser());
  const nav = useNavigate();

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login onLogin={(u) => { setUser(u); nav(u.role === "adviser" ? "/cohort" : "/predict"); }} />} />
      </Routes>
    );
  }

  const logout = () => { setSession(null); setUser(null); nav("/"); };
  const home = user.role === "adviser" ? "/cohort" : "/predict";

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <div className="logo">CP</div>
          <div>
            <div className="brand-name">ClassPredict</div>
            <div className="brand-sub">UI class of degree predictor</div>
          </div>
        </div>
        <nav>
          {NAV.filter((n) => !n.adviser || user.role === "adviser").map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => "nav" + (isActive ? " active" : "")}>
              <span className="nav-ic">{n.icon}</span>{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <div className="who">
            <div className="who-name">{user.full_name}</div>
            <div className="who-role">{user.role === "adviser" ? "Academic adviser" : "Student"}</div>
          </div>
          <button className="btn ghost small" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="main">
        <div className="notice">
          Predictions come from models trained on <b>simulated</b> records that follow UI's 4.0 grading rules.
          Use them as guidance, not as a final verdict.
        </div>
        <Routes>
          <Route path="/predict" element={<Predict user={user} />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/history" element={<History />} />
          <Route path="/model" element={<ModelInfo />} />
          {user.role === "adviser" && <Route path="/cohort" element={<Cohort />} />}
          <Route path="*" element={<Navigate to={home} replace />} />
        </Routes>
      </main>
    </div>
  );
}
