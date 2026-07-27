// Monochrome line icons. No dependency, no colour of their own — they inherit
// currentColor and the surrounding text size, so a badge, a heading and a nav
// link all get the same mark at the right weight.

type IconProps = {
  className?: string;
  strokeWidth?: number;
};

export type Icon = (props: IconProps) => React.ReactElement;

function Svg({
  className = "h-4 w-4",
  strokeWidth = 1.75,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`inline-block shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export function BoltIcon({ className = "h-4 w-4", ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={`inline-block shrink-0 ${className}`}
      {...rest}
    >
      <path d="M13.2 2 4.4 13.4a.6.6 0 0 0 .48.96h4.7l-.78 7.06a.6.6 0 0 0 1.06.44l8.74-11.32a.6.6 0 0 0-.48-.97h-4.66l.78-6.99A.6.6 0 0 0 13.2 2z" />
    </svg>
  );
}

export function DotIcon({ className = "h-4 w-4", ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={`inline-block shrink-0 ${className}`}
      {...rest}
    >
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  );
}

/* ---------- pipeline stages ---------- */

export function CircleDotIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21.5 16.9v2.6a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.3 19.3 0 0 1-6-6 19.6 19.6 0 0 1-3-8.6 2 2 0 0 1 2-2.2h2.6a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L7.6 9.4a16 16 0 0 0 6 6l1.1-1.05a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7a2 2 0 0 1 1.7 2z" />
    </Svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z" />
      <path d="M14 2.5V8h5.5" />
      <path d="M9 13.5h6" />
      <path d="M9 17h6" />
    </Svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4.5h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 5.5H5a2 2 0 0 0 0 4h2" />
      <path d="M17 5.5h2a2 2 0 0 1 0 4h-2" />
      <path d="M12 14.5V18" />
      <path d="M8.5 21h7" />
      <path d="M9.5 18h5l.5 3h-6z" />
    </Svg>
  );
}

export function XCircleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2 9.2 14.8" />
      <path d="M9.2 9.2l5.6 5.6" />
    </Svg>
  );
}

/* ---------- badges ---------- */

export function FlameIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5c.7 2.6 2.2 4.3 3.8 5.7 1.7 1.5 2.7 3.2 2.7 5.3a6.5 6.5 0 0 1-13 0c0-1.2.4-2.3 1-3.1a2.6 2.6 0 0 0 2.6 2.6A2.6 2.6 0 0 0 11.7 10c0-1.4-.5-2-.9-2.9-.9-1.9-.2-3.6 1.2-4.6z" />
    </Svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 1.9" />
    </Svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.9" />
    </Svg>
  );
}

/* ---------- navigation & actions ---------- */

export function ListIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.5 6.5h12" />
      <path d="M8.5 12h12" />
      <path d="M8.5 17.5h12" />
      <path d="M3.75 6.5h.01" />
      <path d="M3.75 12h.01" />
      <path d="M3.75 17.5h.01" />
    </Svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15.5 20.5v-1.75a3.75 3.75 0 0 0-3.75-3.75H6.5a3.75 3.75 0 0 0-3.75 3.75v1.75" />
      <circle cx="9.25" cy="7.75" r="3.75" />
      <path d="M21.25 20.5v-1.75a3.75 3.75 0 0 0-2.8-3.62" />
      <path d="M15.75 4.25a3.75 3.75 0 0 1 0 7.05" />
    </Svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.2 12h17.6" />
      <path d="M12 3a14 14 0 0 1 3.6 9A14 14 0 0 1 12 21a14 14 0 0 1-3.6-9A14 14 0 0 1 12 3z" />
    </Svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 15.5v3a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-3" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M12 15V3.5" />
    </Svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 12H5" />
      <path d="M11.5 18.5 5 12l6.5-6.5" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="M12.5 5.5 19 12l-6.5 6.5" />
    </Svg>
  );
}

/* ---------- activity trail ---------- */

export function InboxIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 12.5h-5l-1.5 2.5h-5L8 12.5H3" />
      <path d="M6.2 4.9 3 12.5v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5l-3.2-7.6a2 2 0 0 0-1.84-1.22H8.04A2 2 0 0 0 6.2 4.9z" />
    </Svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19.5 20.5v-1.75a3.75 3.75 0 0 0-3.75-3.75h-7.5a3.75 3.75 0 0 0-3.75 3.75v1.75" />
      <circle cx="12" cy="7.75" r="3.75" />
    </Svg>
  );
}

export function UserMinusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15.5 20.5v-1.75a3.75 3.75 0 0 0-3.75-3.75H6.5a3.75 3.75 0 0 0-3.75 3.75v1.75" />
      <circle cx="9.25" cy="7.75" r="3.75" />
      <path d="M21.5 11h-5" />
    </Svg>
  );
}

export function ArrowLeftRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 3.5 4 7.5l4 4" />
      <path d="M4 7.5h16" />
      <path d="M16 20.5l4-4-4-4" />
      <path d="M20 16.5H4" />
    </Svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16.8 3.3a2.4 2.4 0 0 1 3.4 3.4L7.4 19.5 3 21l1.5-4.4z" />
      <path d="M15.2 5 19 8.8" />
    </Svg>
  );
}

export function NoteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.5 3.5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h7.5L20 14V5.5a2 2 0 0 0-2-2z" />
      <path d="M13.5 20.5V15a1 1 0 0 1 1-1H20" />
    </Svg>
  );
}

export function MessageSquareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 14.5a2 2 0 0 1-2 2H7.5l-4 3.5V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.9-6.4L3.5 8.2" />
      <path d="M3.5 3.7v4.5H8" />
      <path d="M12 7.8V12l3.4 2" />
    </Svg>
  );
}

export function IdCardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <circle cx="8.75" cy="10.5" r="2.25" />
      <path d="M5.5 16.25a3.25 3.25 0 0 1 6.5 0" />
      <path d="M15.25 9.5h3.5" />
      <path d="M15.25 13h3.5" />
    </Svg>
  );
}

/* ---------- marketing ---------- */

export function BoardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3.5" width="18" height="17" rx="2" />
      <path d="M9 3.5v17" />
      <path d="M15 3.5v17" />
    </Svg>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.7 18.5a9.5 9.5 0 1 1 16.6 0" />
      <path d="M12 14.5 15.5 10" />
    </Svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21.5s7.5-3.6 7.5-9.5V5.4L12 2.5 4.5 5.4V12c0 5.9 7.5 9.5 7.5 9.5z" />
    </Svg>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15.5 18 21 12l-5.5-6" />
      <path d="M8.5 6 3 12l5.5 6" />
    </Svg>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="7.5" cy="16.5" r="4.5" />
      <path d="M10.7 13.3 20.5 3.5" />
      <path d="M16.5 7.5l3 3 2-2-3-3" />
    </Svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 8.5a6 6 0 0 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5z" />
      <path d="M13.7 20.5a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}
