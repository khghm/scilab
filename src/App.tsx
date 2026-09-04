import { useEffect, useState, type ComponentType } from "react";
import { EXPERIMENTS, type Experiment, type LabKind } from "./data/catalog";
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
import { CarnotLab, RcLab, DopplerLab } from "./labs/PhysA";
import { QuantumBoxLab, StandingWaveLab, YoungLab } from "./labs/PhysB";
import { SpringLab, FreeFallLab, CollisionLab } from "./labs/PhysC";
import { InclineLab, DecayLab } from "./labs/PhysD";
import { RedoxLab, ArrheniusLab, FlameLab } from "./labs/ChemA";
import { CaloLab, MolarityLab, BufferLab } from "./labs/ChemB";
import { LeChatelierLab, ElodeaLab } from "./labs/ChemBioA";
import { MitosisLab, LotkaLab, PcrLab } from "./labs/BioC";
import { PedigreeLab, BloodTypeLab, YeastLab } from "./labs/BioD";
import { RlcLab, OpampLab, MosfetLab } from "./labs/ElecX";
import { WheatstoneLab, PwmLab } from "./labs/ElecMedA";
import { KmapLab } from "./labs/KmapLab";
import { PipelineLab } from "./labs/PipelineLab";
import { PidLab } from "./labs/PidLab";
import { ArduinoIdeLab } from "./labs/ArduinoIdeLab";
import { FlipFlopLab, CounterLab, AdderLab } from "./labs/LogicLabs";
import { AluLab, CpuLab } from "./labs/ArchLabs";
import { LineFollowerLab, RobotArmLab, ObstacleLab } from "./labs/RoboticsLabs";
import { BlinkLab, AdcLab, PwmServoLab } from "./labs/ArduinoLabs";
import { RenalLab, GlucoseLab, ReflexLab, PvLoopLab } from "./labs/MedX";
import { LogoMark } from "./components/icons";
import { faDigits, useNow } from "./lib/utils";

const LABS: Record<LabKind, ComponentType<{ exp: Experiment; onBack: () => void; initMode?: LabMode }>> = {
  // physics
  pendulum: PendulumLab,
  projectile: ProjectileLab,
  snell: SnellLab,
  photo: PhotoelectricLab,
  carnot: CarnotLab,
  rc: RcLab,
  doppler: DopplerLab,
  qbox: QuantumBoxLab,
  standing: StandingWaveLab,
  young: YoungLab,
  spring: SpringLab,
  freefall: FreeFallLab,
  collision: CollisionLab,
  incline: InclineLab,
  decay: DecayLab,
  // chemistry
  titration: TitrationLab,
  enzyme: EnzymeLab,
  redox: RedoxLab,
  arrhenius: ArrheniusLab,
  flame: FlameLab,
  calo: CaloLab,
  molarity: MolarityLab,
  buffer: BufferLab,
  lechatelier: LeChatelierLab,
  // biology
  genetics: GeneticsLab,
  culture: CultureLab,
  mitosis: MitosisLab,
  lotka: LotkaLab,
  pcr: PcrLab,
  pedigree: PedigreeLab,
  bloodtype: BloodTypeLab,
  yeast: YeastLab,
  elodea: ElodeaLab,
  // electronics
  seriesparallel: SeriesParallelLab,
  rcfilter: RcFilterLab,
  logicgate: LogicGateLab,
  timer555: Timer555Lab,
  bjt: BjtLab,
  rlc: RlcLab,
  opamp: OpampLab,
  mosfet: MosfetLab,
  wheatstone: WheatstoneLab,
  pwm: PwmLab,
  flipflop: FlipFlopLab,
  counter: CounterLab,
  adder: AdderLab,
  alu: AluLab,
  cpu: CpuLab,
  linefollower: LineFollowerLab,
  robotarm: RobotArmLab,
  obstacle: ObstacleLab,
  blink: BlinkLab,
  adcpot: AdcLab,
  pwmservo: PwmServoLab,
  kmap: KmapLab,
  pipeline: PipelineLab,
  pid: PidLab,
  arduinoide: ArduinoIdeLab,
  // medicine
  ecg: EcgLab,
  bloodpressure: BloodPressureLab,
  spirometry: SpirometryLab,
  spo2: Spo2Lab,
  renal: RenalLab,
  glucose: GlucoseLab,
  reflex: ReflexLab,
  pvloop: PvLoopLab,
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
            return <LabComp key={`${sel!.id}-${sel!.mode ?? "n"}`} exp={exp} onBack={back} initMode={sel!.mode} />;
          })()
        ) : (
          <HomeView onOpen={open} />
        )}
      </main>

      <footer className="relative z-10 border-t border-edge/80 bg-deep/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <LogoMark c="w-8 h-8" />
              <span className="font-display text-lg text-snow">SciLab Immersive</span>
            </div>
            <p className="text-[12.5px] text-fog leading-7">
              پلتفرم شبیه‌سازی تعاملی با پنج شاخه مستقل — فیزیک، شیمی، زیست‌شناسی، الکترونیک و پزشکی —
              با پشتیبانی VR/AR برای کلاس‌های NGSS، IB و A‑Level، به زبان فارسی.
            </p>
          </div>
          <div>
            <h4 className="font-display text-lg text-snow mb-3">چارچوب‌های آموزشی</h4>
            <ul className="space-y-2 text-[12.5px] text-fog">
              <li>NGSS — Science & Engineering Practices</li>
              <li>IB Diploma Programme — SL / HL Sciences</li>
              <li>A‑Level — AQA & Cambridge Practicals</li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-lg text-snow mb-3">فناوری</h4>
            <ul className="space-y-2 text-[12.5px] text-fog">
              <li>موتور انتگرال‌گیری نیمه‌ضمنی · ۲۴۰ گام/ثانیه</li>
              <li>پایگاه‌های مرجع: NIST · PubChem · PDB · BRENDA</li>
              <li>خروجی: CSV · LaTeX · JSON — WebXR Stereoscopic</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-edge/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-fog">
            <span>© SciLab Immersive — ساخته‌شده برای کلاس‌های علوم</span>
            <span className="font-mono text-[10px] tracking-widest text-edge2">HIGH‑FIDELITY · REAL‑TIME · STANDARDS‑ALIGNED</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
