import { useLayoutEffect, useRef, useState } from "react";

/** Width of an element, kept current with a ResizeObserver. */
export function useWidth(initial = 600) {
  const ref = useRef(null);
  const [w, setW] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(el.getBoundingClientRect().width || initial);
    const ro = new ResizeObserver(([e]) => setW(Math.max(120, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [initial]);
  return [ref, w];
}
