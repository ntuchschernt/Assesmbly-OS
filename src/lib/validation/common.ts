import { z } from "zod";

/** Optional id from a <select>: "" → null */
export const optionalId = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

/** Optional date from <input type="date">: "" → null, validated */
export const optionalDate = z
  .string()
  .optional()
  .nullable()
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Ungültiges Datum")
  .transform((v) => (v ? new Date(v) : null));

export const optionalText = (max = 5000) =>
  z
    .string()
    .max(max, `Maximal ${max} Zeichen`)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null));

export const requiredText = (label: string, max = 200) =>
  z.string({ required_error: `${label} ist erforderlich` }).trim().min(1, `${label} ist erforderlich`).max(max, `Maximal ${max} Zeichen`);

/** Accepts a string array or a comma separated string. */
export const stringList = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((v) => {
    const arr = Array.isArray(v) ? v : (v ?? "").split(",");
    return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean))).slice(0, 30);
  });

export const priority = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
