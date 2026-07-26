import { Prisma } from "@prisma/client";
import { db } from "./db";
import {
  forbidden,
  notFound,
  unprocessable,
  type CreateLeadInput,
  type LeadListQuery,
  type LeadStatus,
  type PublicLeadInput,
  type Role,
  type UpdateLeadInput,
} from "./api";
import type { Actor } from "./auth";

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

type LeadRecord = { assignedToId: string | null };

function assertCanMutate(actor: Actor, lead: LeadRecord) {
  if (actor.role !== "ADMIN" && lead.assignedToId !== actor.id) {
    throw forbidden("Only the assigned member or an admin can modify this lead");
  }
}

async function findLead(id: string) {
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) throw notFound("Lead not found");
  return lead;
}

async function ensureActiveUser(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw unprocessable("Assignee must be an active user");
  return user;
}

function leadWhere(query: LeadListQuery): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;
  if (query.assignedTo === "unassigned") where.assignedToId = null;
  else if (query.assignedTo) where.assignedToId = query.assignedTo;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q } },
      { email: { contains: query.q } },
      { company: { contains: query.q } },
    ];
  }
  return where;
}

const assignedToSelect = { select: { id: true, name: true } };

export async function listLeads(actor: Actor, query: LeadListQuery) {
  const where = leadWhere(query);
  const [total, data] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      orderBy: [{ [query.sort]: query.order }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { assignedTo: assignedToSelect },
    }),
  ]);
  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

export async function getLead(actor: Actor, id: string) {
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      assignedTo: assignedToSelect,
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });
  if (!lead) throw notFound("Lead not found");
  return lead;
}

export async function createLead(actor: Actor, input: CreateLeadInput) {
  if (input.assignedToId) {
    if (actor.role !== "ADMIN" && input.assignedToId !== actor.id) {
      throw forbidden("Members can only assign new leads to themselves");
    }
    await ensureActiveUser(input.assignedToId);
  }
  const now = new Date();
  const score = computeScore({
    value: input.value ?? null,
    priority: input.priority,
    source: input.source,
    createdAt: now,
  });
  return db.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        company: input.company,
        message: input.message,
        source: input.source,
        priority: input.priority,
        value: input.value,
        nextFollowUpAt: input.nextFollowUpAt,
        assignedToId: input.assignedToId,
        score,
        lastActivityAt: now,
      },
      include: { assignedTo: assignedToSelect },
    });
    await tx.activity.create({
      data: {
        leadId: lead.id,
        actorId: actor.id,
        type: "LEAD_CREATED",
        meta: JSON.stringify({ source: input.source }),
      },
    });
    if (input.assignedToId) {
      await tx.activity.create({
        data: {
          leadId: lead.id,
          actorId: actor.id,
          type: "ASSIGNED",
          meta: JSON.stringify({ fromUserId: null, toUserId: input.assignedToId }),
        },
      });
    }
    return lead;
  });
}

export async function createPublicLead(input: PublicLeadInput) {
  const now = new Date();
  const score = computeScore({
    value: null,
    priority: "MEDIUM",
    source: "WEB_FORM",
    createdAt: now,
  });
  return db.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        company: input.company,
        message: input.message,
        source: "WEB_FORM",
        score,
        lastActivityAt: now,
      },
    });
    await tx.activity.create({
      data: {
        leadId: lead.id,
        type: "LEAD_CREATED",
        meta: JSON.stringify({ source: "WEB_FORM" }),
      },
    });
    return lead;
  });
}

const UPDATABLE_FIELDS = [
  "name",
  "email",
  "phone",
  "company",
  "message",
  "priority",
  "value",
  "nextFollowUpAt",
] as const;

export async function updateLead(actor: Actor, id: string, input: UpdateLeadInput) {
  const lead = await findLead(id);
  assertCanMutate(actor, lead);

  const data: Record<string, unknown> = {};
  const changed: string[] = [];
  for (const field of UPDATABLE_FIELDS) {
    if (input[field] !== undefined) {
      data[field] = field === "email" ? (input.email as string).toLowerCase() : input[field];
      changed.push(field);
    }
  }

  const targetStatus = input.status && input.status !== lead.status ? input.status : null;
  if (targetStatus) {
    const allowed = allowedTransitions(lead.status as LeadStatus, actor.role);
    if (!allowed.includes(targetStatus)) {
      throw unprocessable(`Cannot move this lead from ${lead.status} to ${targetStatus}`, {
        allowedNextStatuses: allowed,
      });
    }
    if (targetStatus === "LOST" && !input.lostReason) {
      throw unprocessable("A reason is required when marking a lead as LOST", {
        lostReason: ["Required when status is LOST"],
      });
    }
    data.status = targetStatus;
    data.lostReason = targetStatus === "LOST" ? input.lostReason : null;
  } else if (input.lostReason && lead.status !== "LOST") {
    throw unprocessable("lostReason can only be set when the lead is LOST");
  } else if (input.lostReason) {
    data.lostReason = input.lostReason;
    changed.push("lostReason");
  }

  const now = new Date();
  data.lastActivityAt = now;
  data.score = computeScore({
    value: input.value !== undefined ? input.value : lead.value,
    priority: input.priority ?? lead.priority,
    source: lead.source,
    createdAt: lead.createdAt,
  });

  return db.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data,
      include: { assignedTo: assignedToSelect },
    });
    if (targetStatus) {
      await tx.activity.create({
        data: {
          leadId: id,
          actorId: actor.id,
          type: "STATUS_CHANGED",
          meta: JSON.stringify({
            from: lead.status,
            to: targetStatus,
            ...(targetStatus === "LOST" ? { lostReason: input.lostReason } : {}),
          }),
        },
      });
    }
    if (changed.length) {
      await tx.activity.create({
        data: {
          leadId: id,
          actorId: actor.id,
          type: "LEAD_UPDATED",
          meta: JSON.stringify({ changed }),
        },
      });
    }
    return updated;
  });
}

export async function assignLead(actor: Actor, id: string, assignedToId: string | null) {
  if (actor.role !== "ADMIN") throw forbidden("Only admins can assign leads");
  const lead = await findLead(id);
  if (assignedToId) await ensureActiveUser(assignedToId);
  if (lead.assignedToId === assignedToId) {
    return db.lead.findUniqueOrThrow({ where: { id }, include: { assignedTo: assignedToSelect } });
  }
  return db.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id },
      data: { assignedToId, lastActivityAt: new Date() },
      include: { assignedTo: assignedToSelect },
    });
    await tx.activity.create({
      data: {
        leadId: id,
        actorId: actor.id,
        type: assignedToId ? "ASSIGNED" : "UNASSIGNED",
        meta: JSON.stringify({ fromUserId: lead.assignedToId, toUserId: assignedToId }),
      },
    });
    return updated;
  });
}

export async function deleteLead(actor: Actor, id: string) {
  if (actor.role !== "ADMIN") throw forbidden("Only admins can delete leads");
  await findLead(id);
  await db.lead.delete({ where: { id } });
}

export async function addNote(actor: Actor, leadId: string, body: string) {
  const lead = await findLead(leadId);
  assertCanMutate(actor, lead);
  return db.$transaction(async (tx) => {
    const note = await tx.note.create({
      data: { leadId, authorId: actor.id, body },
      include: { author: { select: { id: true, name: true } } },
    });
    await tx.activity.create({
      data: {
        leadId,
        actorId: actor.id,
        type: "NOTE_ADDED",
        meta: JSON.stringify({ preview: body.slice(0, 80) }),
      },
    });
    await tx.lead.update({ where: { id: leadId }, data: { lastActivityAt: new Date() } });
    return note;
  });
}

export async function listNotes(actor: Actor, leadId: string) {
  await findLead(leadId);
  return db.note.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });
}

export async function listActivities(actor: Actor, leadId: string) {
  await findLead(leadId);
  const activities = await db.activity.findMany({
    where: { leadId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { actor: { select: { id: true, name: true } } },
  });
  return activities.map((activity) => ({
    ...activity,
    meta: safeParse(activity.meta),
  }));
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function exportLeadsCsv(actor: Actor, query: LeadListQuery) {
  const leads = await db.lead.findMany({
    where: leadWhere(query),
    orderBy: [{ [query.sort]: query.order }, { id: "desc" }],
    take: 1000,
    include: { assignedTo: { select: { name: true } } },
  });
  const header = [
    "name",
    "email",
    "phone",
    "company",
    "status",
    "priority",
    "value",
    "score",
    "source",
    "assigned_to",
    "next_follow_up_at",
    "last_activity_at",
    "created_at",
  ];
  const rows = leads.map((lead) => [
    lead.name,
    lead.email,
    lead.phone ?? "",
    lead.company ?? "",
    lead.status,
    lead.priority,
    lead.value ?? "",
    lead.score,
    lead.source,
    lead.assignedTo?.name ?? "",
    lead.nextFollowUpAt?.toISOString() ?? "",
    lead.lastActivityAt.toISOString(),
    lead.createdAt.toISOString(),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
