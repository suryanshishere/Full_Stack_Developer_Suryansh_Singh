import { createNoteSchema, json, parseBody, withErrors } from "@/lib/api";
import { requireActor } from "@/lib/auth";
import { addNote, listNotes } from "@/lib/leads";

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
