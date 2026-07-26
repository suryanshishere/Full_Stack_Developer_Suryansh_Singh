import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { GET as listLeadsRoute, POST as createLeadRoute } from "@/app/api/leads/route";
import { PATCH as patchLeadRoute } from "@/app/api/leads/[id]/route";
import { PATCH as assignRoute } from "@/app/api/leads/[id]/assign/route";
import { POST as notesRoute } from "@/app/api/leads/[id]/notes/route";
import { GET as activitiesRoute } from "@/app/api/leads/[id]/activities/route";
import { createTestUsers, ctx, getRequest, jsonRequest, loginAs, resetDb } from "./helpers";

let users: Awaited<ReturnType<typeof createTestUsers>>;
let adminCookie: string;
let memberCookie: string;

beforeAll(async () => {
  await resetDb();
  users = await createTestUsers();
  adminCookie = await loginAs("admin@test.dev");
  memberCookie = await loginAs("member@test.dev");
});

async function patchStatus(leadId: string, cookie: string, status: string, lostReason?: string) {
  return patchLeadRoute(
    jsonRequest(`http://t/api/leads/${leadId}`, "PATCH", { status, ...(lostReason ? { lostReason } : {}) }, cookie),
    ctx(leadId)
  );
}

describe("core flow: create, assign, work, audit", () => {
  it("captures the full journey in an ordered activity trail", async () => {
    const created = await createLeadRoute(
      jsonRequest("http://t/api/leads", "POST", {
        name: "Journey Lead",
        email: "journey@client.com",
        company: "Journey Co",
        source: "REFERRAL",
        priority: "HIGH",
        value: 200000,
      }, adminCookie),
      undefined as never
    );
    expect(created.status).toBe(201);
    const lead = await created.json();
    expect(lead.status).toBe("NEW");
    expect(lead.score).toBeGreaterThan(0);

    const assigned = await assignRoute(
      jsonRequest(`http://t/api/leads/${lead.id}/assign`, "PATCH", { assignedToId: users.member.id }, adminCookie),
      ctx(lead.id)
    );
    expect(assigned.status).toBe(200);

    const moved = await patchStatus(lead.id, memberCookie, "CONTACTED");
    expect(moved.status).toBe(200);

    const noted = await notesRoute(
      jsonRequest(`http://t/api/leads/${lead.id}/notes`, "POST", { body: "Intro call done, sending scope doc." }, memberCookie),
      ctx(lead.id)
    );
    expect(noted.status).toBe(201);
    const note = await noted.json();
    expect(note.author.id).toBe(users.member.id);
    expect(note.createdAt).toBeTruthy();

    const trail = await activitiesRoute(getRequest(`http://t/api/leads/${lead.id}/activities`, memberCookie), ctx(lead.id));
    expect(trail.status).toBe(200);
    const { data } = await trail.json();
    expect(data.map((a: { type: string }) => a.type)).toEqual([
      "LEAD_CREATED",
      "ASSIGNED",
      "STATUS_CHANGED",
      "NOTE_ADDED",
    ]);
    const statusChange = data[2];
    expect(statusChange.meta).toEqual({ from: "NEW", to: "CONTACTED" });
    expect(statusChange.actor.id).toBe(users.member.id);
    const times = data.map((a: { createdAt: string }) => new Date(a.createdAt).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);

    const updatedLead = await db.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updatedLead.lastActivityAt.getTime()).toBeGreaterThanOrEqual(
      new Date(lead.lastActivityAt).getTime()
    );
  });
});

describe("pipeline transition rules", () => {
  async function memberLead(status: string) {
    return db.lead.create({
      data: { name: "Rule Lead", email: "rules@client.com", status, assignedToId: users.member.id },
    });
  }

  it("blocks skipping stages and lists the allowed next statuses", async () => {
    const lead = await memberLead("NEW");
    const res = await patchStatus(lead.id, memberCookie, "WON");
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.allowedNextStatuses).toEqual(["CONTACTED", "LOST"]);
  });

  it("walks the pipeline forward and allows winning from PROPOSAL", async () => {
    const lead = await memberLead("NEW");
    for (const status of ["CONTACTED", "QUALIFIED", "PROPOSAL", "WON"]) {
      const res = await patchStatus(lead.id, memberCookie, status);
      expect(res.status).toBe(200);
    }
  });

  it("requires a reason to mark a lead LOST", async () => {
    const lead = await memberLead("CONTACTED");
    const missing = await patchStatus(lead.id, memberCookie, "LOST");
    expect(missing.status).toBe(422);
    expect((await missing.json()).details.lostReason).toBeTruthy();

    const withReason = await patchStatus(lead.id, memberCookie, "LOST", "Chose a competitor");
    expect(withReason.status).toBe(200);
    expect((await withReason.json()).lostReason).toBe("Chose a competitor");
  });

  it("treats WON and LOST as terminal for members but lets admins reopen", async () => {
    const lead = await memberLead("WON");
    const memberAttempt = await patchStatus(lead.id, memberCookie, "QUALIFIED");
    expect(memberAttempt.status).toBe(422);
    expect((await memberAttempt.json()).details.allowedNextStatuses).toEqual([]);

    const adminAttempt = await patchStatus(lead.id, adminCookie, "QUALIFIED");
    expect(adminAttempt.status).toBe(200);
  });

  it("clears lostReason when an admin reopens a LOST lead", async () => {
    const lead = await db.lead.create({
      data: {
        name: "Reopen Lead",
        email: "reopen@client.com",
        status: "LOST",
        lostReason: "Budget cut",
        assignedToId: users.member.id,
      },
    });
    const res = await patchStatus(lead.id, adminCookie, "CONTACTED");
    expect(res.status).toBe(200);
    expect((await res.json()).lostReason).toBeNull();
  });
});

describe("list api: filtering and pagination", () => {
  beforeAll(async () => {
    await db.activity.deleteMany();
    await db.note.deleteMany();
    await db.lead.deleteMany();
    const rows = Array.from({ length: 25 }, (_, index) => ({
      name: `Bulk Lead ${String(index + 1).padStart(2, "0")}`,
      email: `bulk${index + 1}@client.com`,
      status: index < 5 ? "CONTACTED" : "NEW",
      assignedToId: index < 3 ? users.member.id : index < 5 ? users.other.id : null,
      value: (index + 1) * 1000,
    }));
    for (const row of rows) await db.lead.create({ data: row });
  });

  it("filters by status and assignee together", async () => {
    const res = await listLeadsRoute(
      getRequest(`http://t/api/leads?status=CONTACTED&assignedTo=${users.member.id}`, memberCookie),
      undefined as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.total).toBe(3);
    expect(
      body.data.every(
        (lead: { status: string; assignedTo: { id: string } }) =>
          lead.status === "CONTACTED" && lead.assignedTo.id === users.member.id
      )
    ).toBe(true);
  });

  it("filters unassigned leads", async () => {
    const res = await listLeadsRoute(
      getRequest("http://t/api/leads?assignedTo=unassigned", memberCookie),
      undefined as never
    );
    expect((await res.json()).meta.total).toBe(20);
  });

  it("searches by name", async () => {
    const res = await listLeadsRoute(
      getRequest("http://t/api/leads?q=Bulk%20Lead%2007", memberCookie),
      undefined as never
    );
    expect((await res.json()).meta.total).toBe(1);
  });

  it("paginates with a correct meta envelope", async () => {
    const res = await listLeadsRoute(
      getRequest("http://t/api/leads?page=2&pageSize=10&sort=value&order=asc", memberCookie),
      undefined as never
    );
    const body = await res.json();
    expect(body.data).toHaveLength(10);
    expect(body.meta).toEqual({ page: 2, pageSize: 10, total: 25, totalPages: 3 });
    expect(body.data[0].value).toBe(11000);
  });

  it("returns an empty page past the end", async () => {
    const res = await listLeadsRoute(
      getRequest("http://t/api/leads?page=4&pageSize=10", memberCookie),
      undefined as never
    );
    const body = await res.json();
    expect(body.data).toHaveLength(0);
    expect(body.meta.total).toBe(25);
  });

  it("rejects invalid filter values with 400", async () => {
    const badStatus = await listLeadsRoute(
      getRequest("http://t/api/leads?status=BOGUS", memberCookie),
      undefined as never
    );
    expect(badStatus.status).toBe(400);

    const badPageSize = await listLeadsRoute(
      getRequest("http://t/api/leads?pageSize=500", memberCookie),
      undefined as never
    );
    expect(badPageSize.status).toBe(400);
  });
});

describe("creation permissions", () => {
  it("lets members self-assign but not assign to others on create", async () => {
    const selfAssigned = await createLeadRoute(
      jsonRequest("http://t/api/leads", "POST", {
        name: "Self Assigned",
        email: "self@client.com",
        assignedToId: users.member.id,
      }, memberCookie),
      undefined as never
    );
    expect(selfAssigned.status).toBe(201);

    const otherAssigned = await createLeadRoute(
      jsonRequest("http://t/api/leads", "POST", {
        name: "Other Assigned",
        email: "otherassign@client.com",
        assignedToId: users.other.id,
      }, memberCookie),
      undefined as never
    );
    expect(otherAssigned.status).toBe(403);
  });
});
