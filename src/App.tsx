import { useEffect, useState, type ComponentType } from "react";
import { EXPERIMENTS, SUBJECT_ORDER, SUBJECTS, liveOf, type Experiment, type LabKind } from "./data/catalog";
import type { LabMode } from "./components/LabShell";
import { HomeView } from "./components/HomeView";
import { PendulumLab, ProjectileLab } from "./labs/PhysicsLabs";
import { SnellLab, PhotoelectricLab } from "./labs/OpticsModernLabs";
import { TitrationLab, EnzymeLab } from "./labs/ChemLabs";
import { GeneticsLab, CultureLab } from "./labs/BioLabs";
import { SeriesParallelLab, RcFilterLab, LogicGateLab } from "./labs/ElectronicsLabs";
import { Timer555Lab, BjtLab } from "./labs/ElectronicsAdvLabs";
import { EcgLab, BloodPressureLab } from "./labs/MedLabs";
import { SpirometryLab, Spo2Lab } from "./labs/MedLabs2";
import { LogoMark } from "./components/icons";
import { faDigits, useNow } from "./lib/utils";

const LABS: Record<LabKind, ComponentType<{ exp: Experiment; onBack: () => void; initMode?: LabMode }>> = {
  pendulum: PendulumLab,
  projectile: ProjectileLab,
  snell: SnellLab,
  photo: PhotoelectricLab,
  titration: TitrationLab,
  enzyme: EnzymeLab,
  genetics: GeneticsLab,
  culture: CultureLab,
  seriesparallel: SeriesParallelLab,
  rcfilter: RcFilterLab,
  logicgate: LogicGateLab,
  timer555: Timer555Lab,
  bjt: BjtLab,
  ecg: EcgLab,
  bloodpressure: BloodPressureLab,
  spirometry: SpirometryLab,
  spo2: Spo2Lab,
};

export default function App() {
  const [sel, setSel] = useState<{ id: string; mode?: LabMode } | null>(null);
  const exp = sel ? EXPERIMENTS.find((e) => e.id === sel.id) : undefined;
  const now = useNow(1000);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [sel]);

  const open = (id: string, mode?: LabMode) => setSel({ id, mode });
  const back = () => setSel(null);
  const inLab = !!(sel && exp?.lab);

  const clock = `${faDigits(now.getHours().toString().padStart(2, "0"))}:${faDigits(
    now.getMinutes().toString().padStart(2, "0")
  )}:${faDigits(now.getSeconds().toString().padStart(2, "0"))}`;

  return (
    <div className="min-h-screen blueprint-bg relative">
      <div className="noise-layer" />

      <header className="sticky top-0 z-40 border-b border-edge/80 bg-abyss/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button onClick={back} className="flex items-center gap-3 cursor-pointer">
            <LogoMark c="w-9 h-9" />
            <span className="text-right leading-4">
              <span className="font-display text-lg text-snow block">SciLab Immersive</span>
              <span className="text-[10px] text-fog tracking-widest">آزمایشگاه فراگیر علوم · ۵ شاخه</span>
            </span>
          </button>

          {!inLab && (
            <nav className="hidden lg:flex items-center gap-1 mr-6">
              {(
                [
                  ["#labs", "آزمایشگاه‌ها"],
                  ["#standards", "استانداردها"],
                  ["#data", "زیرساخت داده"],
                  ["#vr", "VR / AR"],
                ] as [string, string][]
              ).map(([href, label]) => (
                <a key={href} href={href} className="px-3.5 py-2 rounded-lg text-[13px] text-fog hover:text-snow hover:bg-panel transition-colors">
                  {label}
                </a>
              ))}
            </nav>
          )}

          <div className="flex-1" />

          <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-edge text-[11px] text-fog">
            <span className="w-1.5 h-1.5 rounded-full bg-lime pulse-dot" />
            موتور فیزیک v3.2
          </span>
          <span className="num text-[12px] px-3 py-1.5 rounded-lg bg-panel border border-edge text-teal">{clock}</span>
        </div>
      </header>

      <main>
        {inLab && exp?.lab ? (
          (() => {
            const LabComp = LABS[exp.lab!];
            return LabComp ? (
              <LabComp key={`${sel!.id}-${sel!.mode ?? "n"}`} exp={exp} onBack={back} initMode={sel!.mode} />
            ) : (
              <HomeView onOpen={open} />
            );
          })()
        ) : (
          <HomeView onOpen={open} />
        )}
      </main>

      <footer className="relative z-10 border-t border-edge/80 bg-deep/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <LogoMark c="w-8 h-8" />
              <span className="font-display text-lg text-snow">SciLab Immersive</span>
            </div>
            <p className="text-[12.5px] text-fog leading-7">
              پلتفرم شبیه‌سازی تعاملی با پنج شاخه مستقل — فیزیک، شیمی، زیست‌شناسی،
              <b className="text-violet"> الکترونیک</b> و <b className="text-coral">پزشکی</b> — با پشتیبانی VR/AR و به زبان فارسی.
            </p>
          </div>
          <div>
            <h4 className="font-display text-lg text-snow mb-3">شاخه‌ها</h4>
            <ul className="space-y-2 text-[12.5px]">
              {SUBJECT_ORDER.map((s) => (
                <li key={s} className="text-fog flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: SUBJECTS[s].color }} />
                  {SUBJECTS[s].fa} — {faDigits(liveOf(s).length)} آزمایش زنده
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-display text-lg text-snow mb-3">چارچوب‌های آموزشی</h4>
            <ul className="space-y-2 text-[12.5px] text-fog">
              <li>NGSS — Science & Engineering Practices</li>
              <li>IB Diploma Programme — SL / HL</li>
              <li>A‑Level — AQA & Cambridge Practicals</li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-lg text-snow mb-3">فناوری</h4>
            <ul className="space-y-2 text-[12.5px] text-fog">
              <li>موتور انتگرال‌گیری نیمه‌ضمنی · ۲۴۰ گام/ثانیه</li>
              <li>پایگاه‌های مرجع: NIST · PubChem · PDB · BRENDA</li>
              <li>خروجی CSV · LaTeX · JSON — WebXR Stereoscopic</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-edge/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-fog">
            <span>© {faDigits(1404)}–{faDigits(2026)} SciLab Immersive — ساخته‌شده برای کلاس‌های علوم</span>
            <span className="font-mono text-[10px] tracking-widest text-edge2">HIGH‑FIDELITY · REAL‑TIME · 5 TRACKS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
