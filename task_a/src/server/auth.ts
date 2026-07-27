import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import {
  conflict,
  forbidden,
  notFound,
  unauthorized,
  unprocessable,
  type CreateUserInput,
  type Role,
} from "./http";

export const SESSION_COOKIE = "leadline_session";
const SESSION_DAYS = 7;

export type Actor = { id: string; name: string; email: string; role: Role };

type DbUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export function sanitizeUser(user: DbUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function createSessionToken(user: { id: string; role: string }) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.sub ? { userId: payload.sub } : null;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}

export function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function cookieValue(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

async function actorFromToken(token: string | null): Promise<Actor | null> {
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role as Role };
}

export async function getActor(req: Request) {
  return actorFromToken(cookieValue(req.headers.get("cookie"), SESSION_COOKIE));
}

export async function requireActor(req: Request): Promise<Actor> {
  const actor = await getActor(req);
  if (!actor) throw unauthorized();
  return actor;
}

export async function requireAdmin(req: Request): Promise<Actor> {
  const actor = await requireActor(req);
  if (actor.role !== "ADMIN") throw forbidden("Admin access required");
  return actor;
}

export async function getPageActor(): Promise<Actor | null> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return actorFromToken(store.get(SESSION_COOKIE)?.value ?? null);
}

export async function verifyCredentials(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export async function listUsers(actor: Actor) {
  if (actor.role !== "ADMIN") throw forbidden("Admin access required");
  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { assignedLeads: true } } },
  });
  return users.map((user) => ({
    ...sanitizeUser(user),
    assignedLeadCount: user._count.assignedLeads,
  }));
}

export async function createUser(actor: Actor, input: CreateUserInput) {
  if (actor.role !== "ADMIN") throw forbidden("Admin access required");
  const email = input.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw conflict("A user with this email already exists");
  const user = await db.user.create({
    data: {
      name: input.name,
      email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
    },
  });
  return sanitizeUser(user);
}

export async function setUserActive(actor: Actor, userId: string, isActive: boolean) {
  if (actor.role !== "ADMIN") throw forbidden("Admin access required");
  if (actor.id === userId && !isActive) {
    throw unprocessable("You cannot deactivate your own account");
  }
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User not found");
  const updated = await db.user.update({ where: { id: userId }, data: { isActive } });
  return sanitizeUser(updated);
}
