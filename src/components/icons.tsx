import type { ReactNode } from "react";
import type { Subject } from "../data/catalog";

type P = { c?: string };

function S({ c, children }: { c?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" className={c ?? "w-5 h-5"} aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconAtom = ({ c }: P) => (
  <S c={c}>
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <ellipse cx="12" cy="12" rx="9" ry="3.6" />
    <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
  </S>
);

export const IconFlask = ({ c }: P) => (
  <S c={c}>
    <path d="M10 3v5.2L4.8 17.6A2.2 2.2 0 0 0 6.8 21h10.4a2.2 2.2 0 0 0 2-3.4L14 8.2V3" />
    <path d="M8.5 3h7" /><path d="M7.2 15h9.6" />
    <circle cx="10.5" cy="17.8" r="0.7" fill="currentColor" stroke="none" />
  </S>
);

export const IconDna = ({ c }: P) => (
  <S c={c}>
    <path d="M7 2.5c0 4 10 5 10 9.5s-10 5.5-10 9.5" />
    <path d="M17 2.5c0 4-10 5-10 9.5s10 5.5 10 9.5" />
    <path d="M8 6h8M8 18h8M7.4 9.5h9.2M7.4 14.5h9.2" />
  </S>
);

export const IconChip = ({ c }: P) => (
  <S c={c}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="0.8" />
    <path d="M9 2.5v3.5M12 2.5v3.5M15 2.5v3.5M9 18v3.5M12 18v3.5M15 18v3.5M2.5 9H6M2.5 12H6M2.5 15H6M18 9h3.5M18 12h3.5M18 15h3.5" />
  </S>
);

export const IconPulse = ({ c }: P) => (
  <S c={c}>
    <path d="M2.5 12h4l2-5.5 3 11 2.5-8 1.5 2.5h6" />
    <path d="M12 20.5S3.5 15.5 3.5 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.6c0 5.9-8.5 10.9-8.5 10.9Z" opacity="0.28" fill="currentColor" stroke="none" />
  </S>
);

export const IconHeadset = ({ c }: P) => (
  <S c={c}>
    <rect x="2.5" y="8" width="19" height="9" rx="4.5" />
    <circle cx="8" cy="12.5" r="2.1" /><circle cx="16" cy="12.5" r="2.1" />
    <path d="M9.2 19c1.8-1.4 3.8-1.4 5.6 0" />
  </S>
);

export const IconAr = ({ c }: P) => (
  <S c={c}>
    <path d="M4 7V5a1.5 1.5 0 0 1 1.5-1.5H8M16 3.5h2.5A1.5 1.5 0 0 1 20 5v2M20 19v-2M8 20.5H5.5A1.5 1.5 0 0 1 4 19v-2" />
    <path d="M12 7.5 16 10v4.5l-4 2.5-4-2.5V10l4-2.5Z" />
    <path d="M12 12.2 16 10M12 12.2 8 10M12 12.2v4.8" />
  </S>
);

export const IconPlay = ({ c }: P) => (<S c={c}><path d="M7 4.8v14.4L19 12 7 4.8Z" fill="currentColor" stroke="none" /></S>);
export const IconPause = ({ c }: P) => (<S c={c}><rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /></S>);
export const IconReset = ({ c }: P) => (<S c={c}><path d="M4 5v5h5" /><path d="M4.5 10A8 8 0 1 1 6 16.5" /></S>);
export const IconExpand = ({ c }: P) => (<S c={c}><path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5V9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M4 15v3.5A1.5 1.5 0 0 0 5.5 20H9" /></S>);
export const IconBack = ({ c }: P) => (<S c={c}><path d="M9 6l6 6-6 6" /></S>);
export const IconDownload = ({ c }: P) => (<S c={c}><path d="M12 3.5v11M7.5 10l4.5 4.5L16.5 10" /><path d="M4.5 17v2A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-2" /></S>);
export const IconCheck = ({ c }: P) => (<S c={c}><path d="M4.5 12.5 10 18 19.5 6.5" /></S>);
export const IconWarn = ({ c }: P) => (<S c={c}><path d="M12 3.5 22 20H2L12 3.5Z" /><path d="M12 10v4.5" /><circle cx="12" cy="17.3" r="0.4" fill="currentColor" stroke="none" /></S>);
export const IconError = ({ c }: P) => (<S c={c}><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></S>);
export const IconInfo = ({ c }: P) => (<S c={c}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r="0.5" fill="currentColor" stroke="none" /></S>);
export const IconChart = ({ c }: P) => (<S c={c}><path d="M4 4v16h16" /><path d="M7 15l4-5 3 3 5-7" /></S>);
export const IconTable = ({ c }: P) => (<S c={c}><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><path d="M3.5 9.5h17M9.5 9.5v10M15.5 9.5v10" /></S>);
export const IconCode = ({ c }: P) => (<S c={c}><path d="M8.5 7 4 12l4.5 5M15.5 7 20 12l-4.5 5" /><path d="M13 5l-2 14" /></S>);
export const IconJson = ({ c }: P) => (<S c={c}><path d="M8 4.5C6.5 4.5 6.5 6 6.5 7.5S6.5 10.5 5 12c1.5 1.5 1.5 3 1.5 4.5s0 3 1.5 3" /><path d="M16 4.5c1.5 0 1.5 1.5 1.5 3s0 3 1.5 4.5c-1.5 1.5-1.5 3-1.5 4.5s0 3-1.5 3" /></S>);
export const IconCsv = ({ c }: P) => (<S c={c}><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><path d="M7.5 12h2M11 12h2M14.5 12h2M7.5 15.5h2M11 15.5h2" /></S>);
export const IconDatabase = ({ c }: P) => (<S c={c}><ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" /><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13" /><path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" /></S>);
export const IconSeal = ({ c }: P) => (<S c={c}><path d="M12 3l1.9 1.7 2.6-.3.9 2.4 2.3 1.2-.5 2.5 1.6 2-1.6 2 .5 2.5-2.3 1.2-.9 2.4-2.6-.3L12 21l-1.9-1.7-2.6.3-.9-2.4-2.3-1.2.5-2.5-1.6-2 1.6-2-.5-2.5 2.3-1.2.9-2.4 2.6.3L12 3Z" /><path d="M8.7 12.3l2.3 2.3 4.6-4.6" /></S>);
export const IconBook = ({ c }: P) => (<S c={c}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17.5H6.5A2.5 2.5 0 0 0 4 22V4.5Z" /><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M9 7h7M9 10.5h5" /></S>);
export const IconBolt = ({ c }: P) => (<S c={c}><path d="M13 2.5 4.5 13.5H11l-1 8L18.5 10H12l1-7.5Z" /></S>);
export const IconTarget = ({ c }: P) => (<S c={c}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" /></S>);
export const IconTrash = ({ c }: P) => (<S c={c}><path d="M4.5 6.5h15M9.5 6V4.5A1.5 1.5 0 0 1 11 3h2a1.5 1.5 0 0 1 1.5 1.5V6M6.5 6.5l1 12.5a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-12.5" /></S>);
export const IconEye = ({ c }: P) => (<S c={c}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></S>);

export function SubjectIcon({ subject, c }: { subject: Subject; c?: string }) {
  if (subject === "physics") return <IconAtom c={c} />;
  if (subject === "chemistry") return <IconFlask c={c} />;
  if (subject === "biology") return <IconDna c={c} />;
  if (subject === "electronics") return <IconChip c={c} />;
  return <IconPulse c={c} />;
}

export const LogoMark = ({ c }: P) => (
  <svg viewBox="0 0 40 40" fill="none" className={c ?? "w-9 h-9"} aria-hidden="true">
    <path d="M20 3 34 11v18L20 37 6 29V11L20 3Z" stroke="#35d3c2" strokeWidth="2" strokeLinejoin="round" />
    <path d="M20 10 28 14.5v9L20 28l-8-4.5v-9L20 10Z" stroke="#f2a83b" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="20" cy="19" r="3" fill="#e9f6f3" />
  </svg>
);
