import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/layout/logo";

export const metadata: Metadata = { title: "Anmelden" };

const DEMO_USERS = [
  { email: "m.weber@nordtech.demo", name: "Markus Weber", role: "Projektleitung" },
  { email: "j.hoffmann@nordtech.demo", name: "Julia Hoffmann", role: "Konstruktion" },
  { email: "l.schmidt@nordtech.demo", name: "Lena Schmidt", role: "Qualität" },
  { email: "s.krueger@nordtech.demo", name: "Stefan Krüger", role: "Montageleitung" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="bg-grid relative flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-2xl shadow-black/40 sm:p-8">
          <h1 className="text-lg font-semibold">Anmelden</h1>
          <p className="mt-1 text-sm text-muted">NordTech Maschinenbau GmbH · Demo-Umgebung</p>
          <LoginForm next={next} demoUsers={DEMO_USERS} />
        </div>
        <p className="mt-6 text-center text-xs text-subtle">The Industrial Operations Platform</p>
      </div>
    </main>
  );
}
