import type { LeadStatus, Role } from "./http";

const PRIORITY_POINTS: Record<string, number> = { LOW: 0, MEDIUM: 10, HIGH: 20 };

const SOURCE_POINTS: Record<string, number> = {
  REFERRAL: 20,
  WEB_FORM: 12,
  SOCIAL: 8,
  MANUAL: 8,
  OTHER: 4,
};

const PIPELINE_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ["CONTACTED", "LOST"],
  CONTACTED: ["QUALIFIED", "NEW", "LOST"],
  QUALIFIED: ["PROPOSAL", "CONTACTED", "WON", "LOST"],
  PROPOSAL: ["WON", "QUALIFIED", "LOST"],
  WON: [],
  LOST: [],
};

const ADMIN_REOPEN: Record<string, LeadStatus[]> = {
  WON: ["PROPOSAL", "QUALIFIED"],
  LOST: ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL"],
};

export function computeScore(lead: {
  value: number | null;
  priority: string;
  source: string;
  createdAt: Date;
}) {
  const valuePoints = Math.min(40, Math.floor((lead.value ?? 0) / 2500));
  const ageDays = (Date.now() - lead.createdAt.getTime()) / 86400000;
  const recencyPoints = ageDays <= 2 ? 20 : ageDays <= 7 ? 12 : ageDays <= 30 ? 6 : 0;
  return (
    valuePoints +
    (PRIORITY_POINTS[lead.priority] ?? 0) +
    (SOURCE_POINTS[lead.source] ?? 0) +
    recencyPoints
  );
}

export function allowedTransitions(status: LeadStatus, role: Role): LeadStatus[] {
  if (status === "WON" || status === "LOST") {
    return role === "ADMIN" ? ADMIN_REOPEN[status] : [];
  }
  return PIPELINE_TRANSITIONS[status];
}
