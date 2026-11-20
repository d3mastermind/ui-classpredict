import { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  CalculatorMinimalisticIcon, GraphNewUpIcon, HistoryIcon, Logout2Icon, MoonStarsIcon, StarsIcon, Sun2Icon, UsersGroupRoundedIcon,
} from "@solar-icons/react/linear";
import {
  CalculatorMinimalisticIcon as CalculatorDuo, GraphNewUpIcon as GraphDuo, HistoryIcon as HistoryDuo,
  StarsIcon as StarsDuo, UsersGroupRoundedIcon as UsersDuo,
} from "@solar-icons/react/bold-duotone";
import { savedUser, setSession } from "./api";
import { currentTheme, toggleTheme } from "./lib/theme";
import { ease, page, popover, spring } from "./lib/motion";
import { Logo, Swap } from "./components/ui.jsx";
import Login from "./pages/Login.jsx";
import Predict from "./pages/Predict.jsx";
import Calculator from "./pages/Calculator.jsx";
import History from "./pages/History.jsx";
import Cohort from "./pages/Cohort.jsx";
import ModelInfo from "./pages/ModelInfo.jsx";

const NAV = [
  { to: "/predict", label: "Predict", icon: [StarsIcon, StarsDuo] },
  { to: "/calculator", label: "What I need", icon: [CalculatorMinimalisticIcon, CalculatorDuo] },
  { to: "/history", label: "History", icon: [HistoryIcon, HistoryDuo] },
  { to: "/cohort", label: "Cohort", icon: [UsersGroupRoundedIcon, UsersDuo], adviser: true },
  { to: "/model", label: "Model", icon: [GraphNewUpIcon, GraphDuo] },
];

function NavIcon({ icon: [Line, Duo], active }) {
  return (
    <span className="nav__icon" aria-hidden>
      <motion.span initial={false} animate={{ opacity: active ? 0 : 1, scale: active ? 0.6 : 1, filter: active ? "blur(3px)" : "blur(0px)" }} transition={{ duration: 0.3, ease }}>
        <Line size={18} />
      </motion.span>
      <motion.span initial={false} animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.6, rotate: active ? 0 : -25 }} transition={spring}>
        <Duo size={18} />
      </motion.span>
    </span>
  );
}

function StatusPill() {
  const [open, setOpen] = useState(false);
  return (
    <div className="menu-wrap" onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)}>
      <button type="button" className="status-pill" onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} aria-describedby="sim-note">
        <span className="pulse" />Simulated data
      </button>
      <AnimatePresence>
        {open && (
          <motion.div id="sim-note" role="tooltip" className="tip" style={{ right: 0, top: "calc(100% + 10px)", width: 280, whiteSpace: "normal" }} {...popover}>
            Models are trained on simulated records that follow UI&rsquo;s 4.0 grading rules. Treat predictions as guidance, not a verdict.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  const initials = user.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="avatar" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-label="Account">
        {initials}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="menu" role="menu" {...popover}>
            <div className="menu__who">
              <div>{user.full_name}</div>
              <div className="mono" style={{ marginTop: 4 }}>{user.role === "adviser" ? "Academic adviser" : "Student"}</div>
            </div>
            <button type="button" role="menuitem" className="menu__item" onClick={onLogout}>
              <Logout2Icon size={18} />Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme());
  return (
    <button type="button" className="icon-btn" onClick={(e) => toggleTheme(e, setTheme)} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
      <Swap k={theme}>
        {theme === "dark" ? <MoonStarsIcon size={19} /> : <Sun2Icon size={19} />}
      </Swap>
    </button>
  );
}

export default function App() {
  const [user, setUser] = useState(savedUser());
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);

  if (!user) {
    return (
      <Login onLogin={(u) => { setUser(u); nav(u.role === "adviser" ? "/cohort" : "/predict"); }} />
    );
  }

  const logout = () => { setSession(null); setUser(null); nav("/"); };
  const home = user.role === "adviser" ? "/cohort" : "/predict";
  const items = NAV.filter((n) => !n.adviser || user.role === "adviser");

  return (
    <>
      <motion.header className="topbar" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
        <NavLink to={home} className="brand" aria-label="ClassPredict home">
          <Logo />
          <span className="brand__name">ClassPredict</span>
        </NavLink>
        <nav className="nav" aria-label="Main">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} aria-label={n.label} className={({ isActive }) => `nav__item${isActive ? " active" : ""}`}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="nav-pill" className="nav__pill" transition={spring} />}
                  <NavIcon icon={n.icon} active={isActive} />
                  <span className="label">{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="actions">
          <StatusPill />
          <ThemeToggle />
          <UserMenu user={user} onLogout={logout} />
        </div>
      </motion.header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.main key={location.pathname} className="page" variants={page} initial="initial" animate="animate" exit="exit">
          <Routes location={location}>
            <Route path="/predict" element={<Predict user={user} />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/history" element={<History />} />
            <Route path="/model" element={<ModelInfo />} />
            {user.role === "adviser" && <Route path="/cohort" element={<Cohort />} />}
            <Route path="*" element={<Navigate to={home} replace />} />
          </Routes>
        </motion.main>
      </AnimatePresence>
    </>
  );
}
