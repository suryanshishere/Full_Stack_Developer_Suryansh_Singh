import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { POST as loginRoute } from "@/app/api/auth/login/route";

export const TEST_PASSWORD = "Password#1";

export async function resetDb() {
  await db.activity.deleteMany();
  await db.note.deleteMany();
  await db.lead.deleteMany();
  await db.user.deleteMany();
}

export async function createTestUsers() {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const admin = await db.user.create({
    data: { name: "Test Admin", email: "admin@test.dev", passwordHash, role: "ADMIN" },
  });
  const member = await db.user.create({
    data: { name: "Test Member", email: "member@test.dev", passwordHash, role: "MEMBER" },
  });
  const other = await db.user.create({
    data: { name: "Other Member", email: "other@test.dev", passwordHash, role: "MEMBER" },
  });
  const inactive = await db.user.create({
    data: {
      name: "Inactive Member",
      email: "inactive@test.dev",
      passwordHash,
      role: "MEMBER",
      isActive: false,
    },
  });
  return { admin, member, other, inactive };
}

export function jsonRequest(url: string, method: string, body?: unknown, cookie?: string) {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export function getRequest(url: string, cookie?: string) {
  return new Request(url, { headers: cookie ? { cookie } : {} });
}

export function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

export async function loginAs(email: string, password = TEST_PASSWORD) {
  const res = await loginRoute(
    jsonRequest("http://test.local/api/auth/login", "POST", { email, password }),
    undefined as never
  );
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  return setCookie.split(";")[0];
}
