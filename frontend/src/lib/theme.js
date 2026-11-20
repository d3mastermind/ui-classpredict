import { flushSync } from "react-dom";

export function currentTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function save(t) {
  try { localStorage.setItem("cp_theme", t); } catch { /* storage blocked: theme still applies this session */ }
}

/** Switch theme with a circular reveal that grows from the pointer (View Transitions API). */
export function toggleTheme(event, setTheme) {
  const next = currentTheme() === "dark" ? "light" : "dark";
  const apply = () => {
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#07090e" : "#f1f0eb");
    save(next);
    setTheme?.(next);
  };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduce) { apply(); return; }

  const r = event?.currentTarget?.getBoundingClientRect?.();
  const x = r ? r.left + r.width / 2 : window.innerWidth - 40;
  const y = r ? r.top + r.height / 2 : 40;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const t = document.startViewTransition(() => flushSync(apply));
  t.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 720, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" }
    );
  }).catch(() => {});
}
