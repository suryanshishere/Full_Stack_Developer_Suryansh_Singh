import { changePlan, parseChangePlanInput, DomainError } from "./subscriptions";

export async function POST(req: Request) {
  const actorId = req.headers.get("x-user-id");
  if (!actorId) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const input = parseChangePlanInput(await req.json().catch(() => null));
    const subscription = await changePlan({ id: actorId }, input);
    return Response.json(subscription);
  } catch (error) {
    if (error instanceof DomainError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }
}
