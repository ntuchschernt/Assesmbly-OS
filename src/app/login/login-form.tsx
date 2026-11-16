"use client";

import { useActionState, useState } from "react";
import { LogIn } from "lucide-react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function LoginForm({ next, demoUsers }: { next?: string; demoUsers: { email: string; name: string; role: string }[] }) {
  const [state, action, pending] = useActionState(login, null);
  const [email, setEmail] = useState("m.weber@nordtech.demo");
  const [password, setPassword] = useState("demo1234");

  return (
    <>
      <form action={action} className="mt-6 space-y-4" noValidate>
        <input type="hidden" name="next" value={next ?? "/"} />
        <Field label="E-Mail" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Passwort" htmlFor="password" required>
          <Input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {state && !state.ok && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" loading={pending}>
          {!pending && <LogIn />} Anmelden
        </Button>
      </form>
      <div className="mt-6 border-t border-border pt-4">
        <p className="label-caps mb-2">Demo-Benutzer · Passwort demo1234</p>
        <div className="grid grid-cols-2 gap-2">
          {demoUsers.map((u) => (
            <button
              key={u.email}
              type="button"
              onClick={() => {
                setEmail(u.email);
                setPassword("demo1234");
              }}
              className={`rounded-md border px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${email === u.email ? "border-primary/50 bg-primary/10" : "border-border hover:bg-elevated"}`}
            >
              <div className="font-medium text-fg">{u.name}</div>
              <div className="text-subtle">{u.role}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
