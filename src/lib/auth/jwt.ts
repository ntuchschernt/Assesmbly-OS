import { SignJWT, jwtVerify } from "jose";

/** Edge-compatible session token helpers (used by middleware and server code). */
export const SESSION_COOKIE = "aos_session";
export const WORKSPACE_COOKIE = "aos_workspace";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters. See .env.example.");
  }
  return new TextEncoder().encode(value);
}

export type SessionPayload = { sub: string; name: string; role: string };

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { sub: payload.sub, name: String(payload.name ?? ""), role: String(payload.role ?? "") };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
