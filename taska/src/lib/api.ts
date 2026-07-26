import { z } from "zod";

export const ROLES = ["ADMIN", "MEMBER"] as const;
export const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"] as const;
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const SOURCES = ["WEB_FORM", "MANUAL", "REFERRAL", "SOCIAL", "OTHER"] as const;
export const SORT_FIELDS = ["createdAt", "lastActivityAt", "value", "score"] as const;

export type Role = (typeof ROLES)[number];
export type LeadStatus = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type LeadSource = (typeof SOURCES)[number];

export class ApiError extends Error {
  status: number;
  details?: Record<string, string[]>;

  constructor(status: number, message: string, details?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: Record<string, string[]>) =>
  new ApiError(400, message, details);
export const unauthorized = (message = "Authentication required") => new ApiError(401, message);
export const forbidden = (message = "You do not have permission to do that") =>
  new ApiError(403, message);
export const notFound = (message = "Not found") => new ApiError(404, message);
export const conflict = (message: string) => new ApiError(409, message);
export const unprocessable = (message: string, details?: Record<string, string[]>) =>
  new ApiError(422, message, details);

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, { status, headers });
}

type RouteHandler<C> = (req: Request, ctx: C) => Promise<Response>;

export function withErrors<C>(handler: RouteHandler<C>): RouteHandler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof ApiError) {
        return json(
          { error: error.message, ...(error.details ? { details: error.details } : {}) },
          error.status
        );
      }
      console.error(error);
      return json({ error: "Internal server error" }, 500);
    }
  };
}

function fieldErrors(error: z.ZodError) {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Body must be valid JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw unprocessable("Validation failed", fieldErrors(result.error));
  return result.data;
}

export function parseQuery<T>(url: string, schema: z.ZodType<T>): T {
  const params = Object.fromEntries(new URL(url).searchParams);
  const result = schema.safeParse(params);
  if (!result.success) throw badRequest("Invalid query parameters", fieldErrors(result.error));
  return result.data;
}

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const publicLeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
  website: z.string().optional(),
});

export const createLeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),
  source: z.enum(SOURCES).default("MANUAL"),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  value: z.number().int().min(0).max(100000000).optional(),
  nextFollowUpAt: z.coerce.date().optional(),
  assignedToId: z.string().optional(),
});

export const updateLeadSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.email().max(200),
    phone: z.string().trim().max(40).nullable(),
    company: z.string().trim().max(120).nullable(),
    message: z.string().trim().max(2000).nullable(),
    priority: z.enum(PRIORITIES),
    value: z.number().int().min(0).max(100000000).nullable(),
    nextFollowUpAt: z.coerce.date().nullable(),
    status: z.enum(STATUSES),
    lostReason: z.string().trim().min(2).max(500),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export const assignLeadSchema = z.object({
  assignedToId: z.string().nullable(),
});

export const createNoteSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  password: z.string().min(8).max(100),
  role: z.enum(ROLES).default("MEMBER"),
});

export const updateUserSchema = z.object({
  isActive: z.boolean(),
});

export const leadListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignedTo: z.string().optional(),
  q: z.string().trim().max(200).optional(),
  sort: z.enum(SORT_FIELDS).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type PublicLeadInput = z.infer<typeof publicLeadSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
