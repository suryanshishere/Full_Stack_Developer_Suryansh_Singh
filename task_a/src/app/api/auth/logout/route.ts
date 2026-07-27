import { json, withErrors } from "@/server/http";
import { clearedSessionCookie } from "@/server/auth";

export const POST = withErrors(async () => {
  return json({ ok: true }, 200, { "Set-Cookie": clearedSessionCookie() });
});
