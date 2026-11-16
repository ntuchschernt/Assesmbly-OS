import type { ZodError } from "zod";

export type ActionFailure = { ok: false; error: string; fieldErrors?: Record<string, string> };
export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | ActionFailure;

export function zodFailure(error: ZodError): ActionFailure {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, error: "Bitte die markierten Felder prüfen.", fieldErrors };
}

export function failure(error: string): ActionFailure {
  return { ok: false, error };
}

/** Wraps service calls so unexpected errors become a user-friendly result instead of a crash. */
export async function safe<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: e.message };
    // Next.js redirect()/notFound() throw special errors that must propagate.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("[action]", e);
    return { ok: false, error: "Unerwarteter Fehler. Bitte erneut versuchen." };
  }
}

/** Expected business-rule violations (shown to the user verbatim). */
export class DomainError extends Error {}
