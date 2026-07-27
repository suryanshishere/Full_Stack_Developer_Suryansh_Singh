import { createUserSchema, json, parseBody, withErrors } from "@/server/http";
import { createUser, listUsers, requireActor } from "@/server/auth";

export const GET = withErrors(async (req) => {
  const actor = await requireActor(req);
  return json({ data: await listUsers(actor) });
});

export const POST = withErrors(async (req) => {
  const actor = await requireActor(req);
  const input = await parseBody(req, createUserSchema);
  return json({ user: await createUser(actor, input) }, 201);
});
