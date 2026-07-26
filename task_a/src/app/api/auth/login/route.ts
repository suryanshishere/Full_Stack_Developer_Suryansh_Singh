import { json, loginSchema, parseBody, unauthorized, withErrors } from "@/lib/api";
import { createSessionToken, sanitizeUser, sessionCookie, verifyCredentials } from "@/lib/auth";

export const POST = withErrors(async (req) => {
  const { email, password } = await parseBody(req, loginSchema);
  const user = await verifyCredentials(email, password);
  if (!user) throw unauthorized("Invalid email or password");
  const token = await createSessionToken(user);
  return json({ user: sanitizeUser(user) }, 200, { "Set-Cookie": sessionCookie(token) });
});
