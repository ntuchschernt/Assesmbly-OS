import "server-only";
import { db } from "@/lib/db";

export function listUsers() {
  return db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, role: true, title: true, email: true } });
}

export type UserOption = { value: string; label: string };

export async function userOptions(): Promise<UserOption[]> {
  const users = await db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return users.map((u) => ({ value: u.id, label: u.name }));
}
