"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

/**
 * Small form state helper used by all module forms:
 * controlled values, server-side field errors (from Zod), pending state and toasts.
 */
export function useActionForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const set = <K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: "" }));
  };

  /** Binds a native input/select/textarea (string values) to a field. */
  const bind = (key: keyof T & string) => ({
    id: key,
    name: key,
    value: (values[key] as string | undefined) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(key, e.target.value as T[typeof key]),
    "aria-invalid": errors[key] ? true : undefined,
  });

  const submit = <R,>(action: (values: T) => Promise<ActionResult<R>>, opts: { success?: string; onSuccess?: (data?: R) => void } = {}) =>
    start(async () => {
      const res = await action(values);
      if (res.ok) {
        setErrors({});
        toast.success(res.message ?? opts.success ?? "Gespeichert");
        opts.onSuccess?.(res.data);
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });

  return { values, setValues, set, bind, errors, pending, submit, reset: () => { setValues(initial); setErrors({}); } };
}

/** Runs a single server action with toast feedback (for buttons). */
export function useAction() {
  const [pending, start] = useTransition();
  const run = <R,>(fn: () => Promise<ActionResult<R>>, opts: { success?: string; onSuccess?: (data?: R) => void } = {}) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        if (opts.success !== "") toast.success(res.message ?? opts.success ?? "Gespeichert");
        opts.onSuccess?.(res.data);
      } else toast.error(res.error);
    });
  return { pending, run };
}
