import {
  CircleDotIcon,
  ClockIcon,
  DotIcon,
  FileTextIcon,
  FlameIcon,
  type Icon,
  PhoneIcon,
  TargetIcon,
  TrophyIcon,
  XCircleIcon,
} from "./icons";

export const STATUS_META: Record<string, { label: string; Icon: Icon; pill: string }> = {
  NEW: { label: "New", Icon: CircleDotIcon, pill: "bg-[#d3e5ef] text-[#183347]" },
  CONTACTED: { label: "Contacted", Icon: PhoneIcon, pill: "bg-[#fdecc8] text-[#402c1b]" },
  QUALIFIED: { label: "Qualified", Icon: TargetIcon, pill: "bg-[#e8deee] text-[#412454]" },
  PROPOSAL: { label: "Proposal", Icon: FileTextIcon, pill: "bg-[#fadec9] text-[#49290e]" },
  WON: { label: "Won", Icon: TrophyIcon, pill: "bg-[#dbeddb] text-[#1c3829]" },
  LOST: { label: "Lost", Icon: XCircleIcon, pill: "bg-[#ffe2dd] text-[#5d1715]" },
};

export const STATUS_KEYS = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];

export const PRIORITY_META: Record<string, { label: string; pill: string }> = {
  HIGH: { label: "High", pill: "bg-[#ffe2dd] text-[#5d1715]" },
  MEDIUM: { label: "Medium", pill: "bg-[#fdecc8] text-[#402c1b]" },
  LOW: { label: "Low", pill: "bg-[#e3e2e0] text-[#32302c]" },
};

const pillBase = "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium";

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, Icon: DotIcon, pill: "bg-wash text-ink" };
  const { Icon: StatusIcon } = meta;
  return (
    <span className={`${pillBase} ${meta.pill}`}>
      <StatusIcon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority] ?? { label: priority, pill: "bg-wash text-ink" };
  return <span className={`${pillBase} ${meta.pill}`}>{meta.label}</span>;
}

export function ScoreChip({ score }: { score: number }) {
  const hot = score >= 60;
  return (
    <span
      className={`${pillBase} ${hot ? "bg-[#fadec9] text-[#49290e]" : "bg-wash text-sub"}`}
      title="Lead score from value, priority, source, and recency"
    >
      {hot ? <FlameIcon className="h-3.5 w-3.5" /> : <DotIcon className="h-2.5 w-2.5" />} {score}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className={`${pillBase} bg-[#ffe2dd] text-[#5d1715]`}>
      <ClockIcon className="h-3.5 w-3.5" />
      Overdue
    </span>
  );
}

export function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function shortDate(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function timeAgo(iso: string | Date) {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(iso);
}

export function isOverdue(followUpAt: string | Date | null | undefined, status: string) {
  if (!followUpAt || status === "WON" || status === "LOST") return false;
  return new Date(followUpAt).getTime() < Date.now();
}
