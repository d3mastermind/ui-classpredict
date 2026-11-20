/* CSS Paint API worklet: a halftone dot field whose dot size follows a travelling wave.
   Used as `background-image: paint(halftone)`; browsers without the Paint API fall back
   to a static CSS dot grid (see styles/base.css). */
/* global registerPaint */
registerPaint(
  "halftone",
  class {
    static get inputProperties() {
      return ["--ht-color", "--ht-gap", "--ht-size", "--ht-phase", "--ht-mode", "--ht-strength"];
    }

    paint(ctx, size, props) {
      const read = (k, d) => {
        const v = String(props.get(k) || "").trim();
        return v === "" ? d : v;
      };
      const color = read("--ht-color", "rgba(230,194,92,0.9)");
      const gap = parseFloat(read("--ht-gap", "12")) || 12;
      const maxR = parseFloat(read("--ht-size", "2.2")) || 2.2;
      const phase = parseFloat(read("--ht-phase", "0")) || 0;
      const mode = read("--ht-mode", "wave");
      const strength = parseFloat(read("--ht-strength", "1")) || 1;
      const W = size.width;
      const H = size.height;

      ctx.fillStyle = color;
      for (let y = gap / 2; y < H; y += gap) {
        for (let x = gap / 2; x < W; x += gap) {
          const nx = x / W;
          const ny = y / H;
          let t;
          if (mode === "wave") {
            // two interfering waves give a soft ribbon that drifts with --ht-phase
            const c = 0.58 + Math.sin(nx * Math.PI * 1.6 + phase) * 0.16 + Math.sin(nx * Math.PI * 3.4 - phase * 0.7) * 0.05;
            t = 1 - Math.min(1, Math.abs(ny - c) / 0.34);
            t = t * t * (3 - 2 * t);
          } else if (mode === "radial") {
            const dx = nx - 0.5;
            const dy = ny - 0.5;
            const d = Math.sqrt(dx * dx + dy * dy) / 0.62;
            t = Math.max(0, 1 - d);
            t *= 0.75 + Math.sin(d * 14 - phase * 2) * 0.25;
          } else {
            // "fade": strongest at the top, fading downwards (used behind area charts)
            t = Math.max(0, 1 - ny);
          }
          t = Math.min(1, t * strength);
          if (t < 0.04) continue;
          ctx.globalAlpha = 0.18 + 0.82 * t;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.45, maxR * t), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
);
