import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion } from "motion/react";
import {
  AddIcon, AltArrowDownIcon, CheckCircleIcon, CheckIcon, DangerTriangleIcon, EyeClosedIcon, EyeIcon,
  InfoCircleIcon, MinusIcon, TargetIcon, CloseCircleIcon,
} from "@solar-icons/react/linear";
import { ease, popover, rise, spring } from "../lib/motion";
import { CLASS_COLOR } from "../api";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- brand mark: an open ring with a seed, echoing the probability rings ---------- */
export function Logo({ size = 30 }) {
  return (
    <svg className="brand__mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="lg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a4f94" />
          <stop offset="1" stopColor="#0a2550" />
        </linearGradient>
        <linearGradient id="lg-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3d98b" />
          <stop offset="1" stopColor="#c9a227" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill="url(#lg-bg)" />
      <path d="M16 7.5a8.5 8.5 0 1 1-8.5 8.5" stroke="url(#lg-ring)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M16 11.5a4.5 4.5 0 1 1-4.5 4.5" stroke="#8fa6ff" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="16" r="1.7" fill="#f3d98b" />
    </svg>
  );
}

/* ---------- primary button (shows a spinner while busy) ---------- */
export function PrimaryButton({ children, busy = false, wide = false, small = false, className = "", disabled, ...rest }) {
  return (
    <button
      {...rest}
      className={`btn-primary${wide ? " wide" : ""}${small ? " sm" : ""}${busy ? " busy" : ""} ${className}`}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
    >
      {busy && <span className="spinner" aria-hidden />}
      {children}
    </button>
  );
}

/* Cross-fades a label when its key changes (button states, counters). */
export function Swap({ k, children, className }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={k}
        className={className}
        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
        transition={{ duration: 0.3, ease }}
        style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

/* ---------- card with cursor spotlight; joins any parent stagger ---------- */
export function Card({ as = "div", className = "", children, ...rest }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const M = as === "form" ? motion.form : as === "section" ? motion.section : motion.div;
  return (
    <M ref={ref} variants={rise} className={`card ${className}`} onPointerMove={onMove} {...rest}>
      {children}
    </M>
  );
}

export function CardHead({ icon: Icon, title, children }) {
  return (
    <div className="card-head">
      <div className="card-title">
        {Icon && <Icon size={18} />}
        {title}
      </div>
      {children}
    </div>
  );
}

/* ---------- inputs ---------- */
export function Hint({ children, label = "More information" }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="hint"
      tabIndex={0}
      role="button"
      aria-label={label}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <InfoCircleIcon size={15} />
      <AnimatePresence>
        {open && (
          <motion.span
            className="tip"
            role="tooltip"
            style={{ x: "-50%" }}
            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 4, filter: "blur(4px)" }}
            transition={{ duration: 0.22, ease }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function Label({ htmlFor, label, optional, hint }) {
  if (!label) return null;
  return (
    <div className="field__label">
      <label htmlFor={htmlFor}>{label}</label>
      {optional && <span className="opt">optional</span>}
      {hint && <Hint label={`About ${label}`}>{hint}</Hint>}
    </div>
  );
}

export function TextField({ label, optional, hint, icon: Icon, type = "text", value, onChange, password, ...rest }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <Label htmlFor={id} label={label} optional={optional} hint={hint} />
      <div className="input-wrap">
        {Icon && <Icon className="lead" size={18} />}
        <input id={id} type={password ? (show ? "text" : "password") : type} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
        {password && (
          <div className="trail">
            <button type="button" className="step-btn" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
              <Swap k={show ? "h" : "s"}>{show ? <EyeClosedIcon size={17} /> : <EyeIcon size={17} />}</Swap>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function NumberField({ label, optional, hint, icon: Icon, value, onChange, min, max, step = 1, decimals = 0, stepper = false, disabled = false, ...rest }) {
  const id = useId();
  const bump = (dir) => {
    const cur = value === "" || value === null ? (min ?? 0) : Number(value);
    let v = cur + dir * step;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    onChange(decimals ? v.toFixed(decimals) : String(Math.round(v)));
  };
  return (
    <div className="field">
      <Label htmlFor={id} label={label} optional={optional} hint={hint} />
      <div className={`input-wrap${disabled ? " off" : ""}`}>
        {Icon && <Icon className="lead" size={18} />}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={disabled ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={decimals ? 1 / 10 ** decimals : step}
          disabled={disabled}
          {...rest}
        />
        {stepper && !disabled && (
          <div className="trail">
            <button type="button" className="step-btn" onClick={() => bump(-1)} aria-label={`Decrease ${label}`}><MinusIcon size={16} /></button>
            <button type="button" className="step-btn" onClick={() => bump(1)} aria-label={`Increase ${label}`}><AddIcon size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Select({ label, value, options, onChange }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [open]);

  const openList = () => { setActive(Math.max(0, options.indexOf(value))); setOpen(true); };
  const choose = (o) => { onChange(o); setOpen(false); };
  const onKey = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(options[active]); }
    else if (e.key === "Escape" || e.key === "Tab") setOpen(false);
  };

  return (
    <div className="field">
      <Label htmlFor={id} label={label} />
      <div className="select" ref={wrap}>
        <button
          id={id}
          type="button"
          className="select__btn"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-activedescendant={open ? `${id}-o${active}` : undefined}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKey}
        >
          <span>{value}</span>
          <AltArrowDownIcon size={18} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.ul className="select__list" role="listbox" aria-labelledby={id} {...popover}>
              {options.map((o, i) => (
                <li
                  key={o}
                  id={`${id}-o${i}`}
                  role="option"
                  aria-selected={o === value}
                  data-active={i === active}
                  className="select__opt"
                  onPointerEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                >
                  {o}
                  {o === value && <CheckIcon size={16} />}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- segmented control with a sliding pill ---------- */
export function Segmented({ value, onChange, options, label, size, block }) {
  const id = useId();
  return (
    <div className={`seg${size === "sm" ? " sm" : ""}${block ? " block" : ""}`} role="group" aria-label={label}>
      {options.map(([k, t]) => (
        <button type="button" key={k} aria-pressed={value === k} onClick={() => onChange(k)}>
          {value === k && <motion.span layoutId={`seg-${id}`} className="seg__pill" transition={spring} />}
          {t}
        </button>
      ))}
    </div>
  );
}

/* ---------- numbers & text that animate ---------- */
export function AnimatedNumber({ value, decimals = 0, prefix = "", suffix = "", duration = 1.2, delay = 0, className }) {
  const ref = useRef(null);
  const shown = useRef(0);
  const fmt = (v) =>
    `${prefix}${Number(v).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

  useLayoutEffect(() => {
    if (ref.current && !ref.current.textContent) ref.current.textContent = fmt(shown.current);
  });

  useEffect(() => {
    const node = ref.current;
    if (!node || value === null || value === undefined || Number.isNaN(Number(value))) return undefined;
    if (reduced()) { shown.current = value; node.textContent = fmt(value); return undefined; }
    const ctrl = animate(shown.current, Number(value), {
      duration,
      delay,
      ease,
      onUpdate: (v) => { shown.current = v; node.textContent = fmt(v); },
    });
    return () => ctrl.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals, prefix, suffix]);

  return <span ref={ref} className={className} aria-label={value === null || value === undefined ? undefined : fmt(value)} />;
}

export function TextReveal({ text, className, delay = 0, step = 0.022 }) {
  const words = String(text).split(" ");
  return (
    <motion.span
      className={className}
      aria-label={text}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: step, delayChildren: delay } } }}
    >
      {words.map((w, wi) => (
        <span key={wi} aria-hidden style={{ display: "inline-block", whiteSpace: "nowrap" }}>
          {[...w].map((ch, ci) => (
            <motion.span
              key={ci}
              style={{ display: "inline-block" }}
              variants={{
                hidden: { opacity: 0, y: "0.3em", filter: "blur(10px)" },
                show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease } },
              }}
            >
              {ch}
            </motion.span>
          ))}
          {wi < words.length - 1 && " "}
        </span>
      ))}
    </motion.span>
  );
}

/* ---------- small display pieces ---------- */
export function ClassDot({ c, size = 8 }) {
  return <span className="dot" style={{ background: CLASS_COLOR[c], width: size, height: size }} />;
}

const RISK = {
  High: { c: "bad", Icon: DangerTriangleIcon },
  Watch: { c: "warn", Icon: EyeIcon },
  Low: { c: "good", Icon: CheckCircleIcon },
};
export function RiskChip({ risk }) {
  const r = RISK[risk] || RISK.Low;
  return <span className={`chip ${r.c}`}><r.Icon size={14} />{risk}</span>;
}

const STATUS = {
  secured: { t: "Secured", c: "good", Icon: CheckCircleIcon },
  reachable: { t: "Reachable", c: "accent", Icon: TargetIcon },
  out_of_reach: { t: "Out of reach", c: "bad", Icon: CloseCircleIcon },
};
export function StatusChip({ status }) {
  const s = STATUS[status];
  return <span className={`chip ${s.c}`}><s.Icon size={14} />{s.t}</span>;
}

export function Alert({ children }) {
  return (
    <motion.div className="alert" role="alert" initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease }}>
      <DangerTriangleIcon size={17} />
      <span>{children}</span>
    </motion.div>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      <div className="empty__art halftone flow" aria-hidden />
      {Icon && <div className="empty__icon"><Icon size={26} /></div>}
      {title && <div style={{ color: "var(--text-1)", fontSize: 15 }}>{title}</div>}
      {children}
    </div>
  );
}

export function Stat({ icon: Icon, label, value, decimals = 0, suffix, unit, foot }) {
  return (
    <Card className="stat">
      <div className="stat__label">{Icon && <Icon size={16} />}{label}</div>
      <div className="stat__value">
        {typeof value === "number" ? <AnimatedNumber value={value} decimals={decimals} suffix={suffix} /> : value}
        {unit && <small>{unit}</small>}
      </div>
      {foot && <div className="stat__foot">{foot}</div>}
    </Card>
  );
}
