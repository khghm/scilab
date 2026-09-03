import { useEffect, useReducer, useRef, useState } from "react";

export function fmt(n: number, d = 2): string {
  if (!isFinite(n)) return "—";
  return n.toFixed(d);
}

export function fmtA(n: number): string {
  if (!isFinite(n)) return "—";
  const a = Math.abs(n);
  const d = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 1 ? 2 : 3;
  return n.toFixed(d);
}

const FA = "۰۱۲۳۴۵۶۷۸۹";
export function faDigits(v: string | number): string {
  return String(v).replace(/\d/g, (d) => FA[+d]);
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 900);
}

export function useRaf(cb: (dt: number) => void, active: boolean) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      cbRef.current(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

export function useForce(): () => void {
  const [, dispatch] = useReducer((x: number) => x + 1, 0);
  return dispatch as () => void;
}

export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) { setInView(true); io.disconnect(); }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

export function useNow(ms = 1000): Date {
  const [d, setD] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setD(new Date()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return d;
}

export function useSize<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.max(220, e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

export function describe(arr: number[]) {
  const n = arr.length;
  if (n === 0) return { n: 0, mean: NaN, sd: NaN, min: NaN, max: NaN, sem: NaN };
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const varr = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (n > 1 ? n - 1 : 1);
  const sd = Math.sqrt(varr);
  return { n, mean, sd, min: Math.min(...arr), max: Math.max(...arr), sem: n > 1 ? sd / Math.sqrt(n) : NaN };
}
