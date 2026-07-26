import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { POST as publicCapture } from "@/app/api/public/leads/route";
import { jsonRequest, resetDb } from "./helpers";

beforeAll(async () => {
  await resetDb();
});

describe("public lead capture", () => {
  it("creates a NEW web-form lead with a creation activity and a score", async () => {
    const res = await publicCapture(
      jsonRequest("http://t/api/public/leads", "POST", {
        name: "Walk-in Prospect",
        email: "Prospect@Example.com",
        company: "Prospect Co",
        message: "We saw your site and want a quote.",
      }),
      undefined as never
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBeTruthy();

    const lead = await db.lead.findUniqueOrThrow({ where: { id: body.id } });
    expect(lead.status).toBe("NEW");
    expect(lead.source).toBe("WEB_FORM");
    expect(lead.email).toBe("prospect@example.com");
    expect(lead.assignedToId).toBeNull();
    expect(lead.score).toBeGreaterThan(0);

    const activities = await db.activity.findMany({ where: { leadId: lead.id } });
    expect(activities).toHaveLength(1);
    expect(activities[0].type).toBe("LEAD_CREATED");
    expect(activities[0].actorId).toBeNull();
    expect(JSON.parse(activities[0].meta).source).toBe("WEB_FORM");
  });

  it("rejects invalid input with 422 and per-field errors", async () => {
    const before = await db.lead.count();
    const res = await publicCapture(
      jsonRequest("http://t/api/public/leads", "POST", { name: "A", email: "not-an-email" }),
      undefined as never
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details.name).toBeTruthy();
    expect(body.details.email).toBeTruthy();
    expect(await db.lead.count()).toBe(before);
  });

  it("rejects a non-json body with 400", async () => {
    const res = await publicCapture(
      new Request("http://t/api/public/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "definitely not json",
      }),
      undefined as never
    );
    expect(res.status).toBe(400);
  });

  it("silently drops bot submissions that fill the honeypot", async () => {
    const before = await db.lead.count();
    const res = await publicCapture(
      jsonRequest("http://t/api/public/leads", "POST", {
        name: "Bot Botson",
        email: "bot@spam.com",
        website: "http://spam.example",
      }),
      undefined as never
    );
    expect(res.status).toBe(201);
    expect((await res.json()).id).toBeUndefined();
    expect(await db.lead.count()).toBe(before);
  });
});
