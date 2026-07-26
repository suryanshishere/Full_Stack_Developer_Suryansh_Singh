import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { GET as listLeadsRoute } from "@/app/api/leads/route";
import { GET as exportRoute } from "@/app/api/leads/export/route";
import { PATCH as patchLeadRoute, DELETE as deleteLeadRoute } from "@/app/api/leads/[id]/route";
import { PATCH as assignRoute } from "@/app/api/leads/[id]/assign/route";
import { POST as notesRoute } from "@/app/api/leads/[id]/notes/route";
import { GET as listUsersRoute, POST as createUserRoute } from "@/app/api/users/route";
import { PATCH as patchUserRoute } from "@/app/api/users/[id]/route";
import {
  createTestUsers,
  ctx,
  getRequest,
  jsonRequest,
  loginAs,
  resetDb,
  TEST_PASSWORD,
} from "./helpers";

let users: Awaited<ReturnType<typeof createTestUsers>>;
let adminCookie: string;
let memberCookie: string;

beforeAll(async () => {
  await resetDb();
  users = await createTestUsers();
  adminCookie = await loginAs("admin@test.dev");
  memberCookie = await loginAs("member@test.dev");
});

function createLeadFor(assignedToId: string | null) {
  return db.lead.create({
    data: { name: "Fixture Lead", email: "fixture@test.dev", assignedToId },
  });
}

describe("login", () => {
  it("rejects a wrong password with 401", async () => {
    const res = await login(
      jsonRequest("http://t/api/auth/login", "POST", {
        email: "admin@test.dev",
        password: "wrong-password",
      }),
      undefined as never
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBeTruthy();
  });

  it("rejects a deactivated user with 401", async () => {
    const res = await login(
      jsonRequest("http://t/api/auth/login", "POST", {
        email: "inactive@test.dev",
        password: TEST_PASSWORD,
      }),
      undefined as never
    );
    expect(res.status).toBe(401);
  });

  it("rejects a malformed body with 422", async () => {
    const res = await login(
      jsonRequest("http://t/api/auth/login", "POST", { email: "not-an-email" }),
      undefined as never
    );
    expect(res.status).toBe(422);
  });

  it("sets an httponly session cookie on success", async () => {
    const res = await login(
      jsonRequest("http://t/api/auth/login", "POST", {
        email: "member@test.dev",
        password: TEST_PASSWORD,
      }),
      undefined as never
    );
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect((await res.json()).user.role).toBe("MEMBER");
  });
});

describe("session enforcement", () => {
  it("returns 401 without a cookie", async () => {
    const res = await listLeadsRoute(getRequest("http://t/api/leads"), undefined as never);
    expect(res.status).toBe(401);
  });

  it("returns 401 for a garbage token", async () => {
    const res = await listLeadsRoute(
      getRequest("http://t/api/leads", `${SESSION_COOKIE}=garbage.token.value`),
      undefined as never
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 for a valid token whose user was deactivated", async () => {
    const token = await createSessionToken(users.inactive);
    const res = await me(getRequest("http://t/api/auth/me", `${SESSION_COOKIE}=${token}`), undefined as never);
    expect(res.status).toBe(401);
  });

  it("returns 401 on csv export without auth", async () => {
    const res = await exportRoute(getRequest("http://t/api/leads/export"), undefined as never);
    expect(res.status).toBe(401);
  });

  it("identifies the session owner via /api/auth/me", async () => {
    const res = await me(getRequest("http://t/api/auth/me", memberCookie), undefined as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe("member@test.dev");
    expect(body.user.role).toBe("MEMBER");
  });

  it("clears the cookie on logout", async () => {
    const res = await logout(
      jsonRequest("http://t/api/auth/logout", "POST", undefined, memberCookie),
      undefined as never
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

describe("member permissions", () => {
  it("can list all leads", async () => {
    const res = await listLeadsRoute(getRequest("http://t/api/leads", memberCookie), undefined as never);
    expect(res.status).toBe(200);
  });

  it("cannot update a lead assigned to someone else", async () => {
    const lead = await createLeadFor(users.other.id);
    const res = await patchLeadRoute(
      jsonRequest(`http://t/api/leads/${lead.id}`, "PATCH", { status: "CONTACTED" }, memberCookie),
      ctx(lead.id)
    );
    expect(res.status).toBe(403);
  });

  it("cannot note a lead assigned to someone else", async () => {
    const lead = await createLeadFor(users.other.id);
    const res = await notesRoute(
      jsonRequest(`http://t/api/leads/${lead.id}/notes`, "POST", { body: "sneaky note" }, memberCookie),
      ctx(lead.id)
    );
    expect(res.status).toBe(403);
  });

  it("can update a lead assigned to them", async () => {
    const lead = await createLeadFor(users.member.id);
    const res = await patchLeadRoute(
      jsonRequest(`http://t/api/leads/${lead.id}`, "PATCH", { status: "CONTACTED" }, memberCookie),
      ctx(lead.id)
    );
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("CONTACTED");
  });

  it("cannot assign leads", async () => {
    const lead = await createLeadFor(users.member.id);
    const res = await assignRoute(
      jsonRequest(`http://t/api/leads/${lead.id}/assign`, "PATCH", { assignedToId: users.other.id }, memberCookie),
      ctx(lead.id)
    );
    expect(res.status).toBe(403);
  });

  it("cannot delete leads", async () => {
    const lead = await createLeadFor(users.member.id);
    const res = await deleteLeadRoute(getDelete(`http://t/api/leads/${lead.id}`, memberCookie), ctx(lead.id));
    expect(res.status).toBe(403);
  });

  it("cannot list, create, or deactivate users", async () => {
    const list = await listUsersRoute(getRequest("http://t/api/users", memberCookie), undefined as never);
    expect(list.status).toBe(403);

    const create = await createUserRoute(
      jsonRequest("http://t/api/users", "POST", {
        name: "Intruder",
        email: "intruder@test.dev",
        password: "Password#1",
      }, memberCookie),
      undefined as never
    );
    expect(create.status).toBe(403);

    const deactivate = await patchUserRoute(
      jsonRequest(`http://t/api/users/${users.other.id}`, "PATCH", { isActive: false }, memberCookie),
      ctx(users.other.id)
    );
    expect(deactivate.status).toBe(403);
  });
});

describe("admin permissions", () => {
  it("can assign and unassign any lead", async () => {
    const lead = await createLeadFor(null);
    const assign = await assignRoute(
      jsonRequest(`http://t/api/leads/${lead.id}/assign`, "PATCH", { assignedToId: users.member.id }, adminCookie),
      ctx(lead.id)
    );
    expect(assign.status).toBe(200);
    expect((await assign.json()).assignedTo.id).toBe(users.member.id);

    const unassign = await assignRoute(
      jsonRequest(`http://t/api/leads/${lead.id}/assign`, "PATCH", { assignedToId: null }, adminCookie),
      ctx(lead.id)
    );
    expect(unassign.status).toBe(200);
    expect((await unassign.json()).assignedTo).toBeNull();
  });

  it("cannot assign to a deactivated user", async () => {
    const lead = await createLeadFor(null);
    const res = await assignRoute(
      jsonRequest(`http://t/api/leads/${lead.id}/assign`, "PATCH", { assignedToId: users.inactive.id }, adminCookie),
      ctx(lead.id)
    );
    expect(res.status).toBe(422);
  });

  it("can delete a lead with 204", async () => {
    const lead = await createLeadFor(null);
    const res = await deleteLeadRoute(getDelete(`http://t/api/leads/${lead.id}`, adminCookie), ctx(lead.id));
    expect(res.status).toBe(204);
    expect(await db.lead.findUnique({ where: { id: lead.id } })).toBeNull();
  });

  it("returns 404 when deleting a missing lead", async () => {
    const res = await deleteLeadRoute(getDelete("http://t/api/leads/missing-id", adminCookie), ctx("missing-id"));
    expect(res.status).toBe(404);
  });

  it("can list and create users, with 409 on duplicate email", async () => {
    const list = await listUsersRoute(getRequest("http://t/api/users", adminCookie), undefined as never);
    expect(list.status).toBe(200);
    expect((await list.json()).data.length).toBeGreaterThanOrEqual(4);

    const create = await createUserRoute(
      jsonRequest("http://t/api/users", "POST", {
        name: "New Member",
        email: "new@test.dev",
        password: "Password#1",
      }, adminCookie),
      undefined as never
    );
    expect(create.status).toBe(201);

    const duplicate = await createUserRoute(
      jsonRequest("http://t/api/users", "POST", {
        name: "New Member Again",
        email: "new@test.dev",
        password: "Password#1",
      }, adminCookie),
      undefined as never
    );
    expect(duplicate.status).toBe(409);
  });

  it("cannot deactivate their own account", async () => {
    const res = await patchUserRoute(
      jsonRequest(`http://t/api/users/${users.admin.id}`, "PATCH", { isActive: false }, adminCookie),
      ctx(users.admin.id)
    );
    expect(res.status).toBe(422);
  });
});

function getDelete(url: string, cookie: string) {
  return new Request(url, { method: "DELETE", headers: { cookie } });
}
