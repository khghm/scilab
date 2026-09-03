import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { faDigits, useReveal } from "../lib/utils";

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function SectionHead({ overline, title, desc, accent = "#35d3c2" }: { overline: string; title: string; desc?: string; accent?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-[11px] tracking-[0.35em] mb-3" style={{ color: accent }}>{overline}</p>
      <h2 className="font-display text-3xl sm:text-4xl leading-[1.15] text-snow">{title}</h2>
      {desc && <p className="mt-3 text-fog text-[14px] leading-7">{desc}</p>}
    </div>
  );
}

export function Chip({ children, color = "#35d3c2", solid = false }: { children: ReactNode; color?: string; solid?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-medium whitespace-nowrap"
      style={solid ? { background: color, color: "#04191d" } : { background: `${color}16`, color, border: `1px solid ${color}40` }}
    >
      {children}
    </span>
  );
}

export function Slider({ label, value, min, max, step, unit, onChange, accent = "#f2a83b", digits = 2 }: {
  label: string; value: number; min: number; max: number; step: number;
  unit?: string; onChange: (v: number) => void; accent?: string; digits?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12.5px] text-fog">{label}</span>
        <span className="num text-[12px] px-2 py-0.5 rounded" style={{ background: `${accent}1a`, color: accent, border: `1px solid ${accent}44` }}>
          {value.toFixed(digits)}{unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        className="sci-range"
        style={{ "--acc": accent, "--fill": `${pct}%` } as React.CSSProperties}
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export function DiffDots({ n }: { n: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex items-center gap-1" title={`سطح ${faDigits(n)} از ۳`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i <= n ? "#f2a83b" : "#175059" }} />
      ))}
    </span>
  );
}

export function StatusPill({ live }: { live: boolean }) {
  return live ? (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-medium" style={{ background: "#a5d95c18", color: "#a5d95c", border: "1px solid #a5d95c44" }}>
      <span className="w-1.5 h-1.5 rounded-full bg-lime pulse-dot" />
      آماده اجرا
    </span>
  ) : (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-medium text-fog border border-edge/70 bg-deep/60">
      در صف توسعه
    </span>
  );
}

export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const { ref, inView } = useReveal<HTMLSpanElement>();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const k = Math.min(1, (now - t0) / 1400);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return (
    <span ref={ref} className="num" style={{ direction: "ltr" }}>
      {faDigits(v.toLocaleString("en-US"))}{suffix}
    </span>
  );
}
