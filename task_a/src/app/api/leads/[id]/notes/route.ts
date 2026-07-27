import { createNoteSchema, json, parseBody, withErrors } from "@/server/http";
import { requireActor } from "@/server/auth";
import { addNote, listNotes } from "@/server/leads";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrors(async (req, { params }: Ctx) => {
  const actor = await requireActor(req);
  const { id } = await params;
  return json({ data: await listNotes(actor, id) });
});

export const POST = withErrors(async (req, { params }: Ctx) => {
  const actor = await requireActor(req);
  const { id } = await params;
  const { body } = await parseBody(req, createNoteSchema);
  return json(await addNote(actor, id, body), 201);
});
