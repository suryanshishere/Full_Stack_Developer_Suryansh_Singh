import { json, withErrors } from "@/lib/api";
import { clearedSessionCookie } from "@/lib/auth";

export const POST = withErrors(async () => {
  return json({ ok: true }, 200, { "Set-Cookie": clearedSessionCookie() });
});
