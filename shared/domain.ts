import { z } from "zod";
export const vesselSchema = z.object({
  name: z.string().trim().min(2).max(80),
  imo: z
    .string()
    .regex(/^[1-9]\d{6}$/, "Enter a 7-digit IMO number")
    .refine(
      (value) =>
        [...value.slice(0, 6)].reduce(
          (sum, n, i) => sum + Number(n) * (7 - i),
          0,
        ) %
          10 ===
        Number(value[6]),
      "Invalid IMO checksum",
    ),
  type: z.enum([
    "Container ship",
    "Bulk carrier",
    "Tanker",
    "Offshore vessel",
    "General cargo",
  ]),
  flag: z.string().trim().min(2).max(50),
  capacity: z.coerce.number().int().min(1).max(500),
  status: z.enum(["At sea", "In port", "Maintenance"]),
  destination: z.string().trim().max(80),
});
export const crewSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  rank: z.enum([
    "Captain",
    "Chief officer",
    "Second officer",
    "Chief engineer",
    "Second engineer",
    "Deck cadet",
    "Able seafarer",
    "Cook",
  ]),
  nationality: z.string().trim().min(2).max(50),
  certificateExpiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => {
      const d = new Date(s);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
    }, "Enter a valid date"),
});
export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  company: z.string().trim().min(2).max(80),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(12, "Use at least 12 characters").max(128),
});
export const loginSchema = registrationSchema
  .pick({ email: true, password: true })
  .extend({ password: z.string().min(1).max(128) });
export type VesselInput = z.infer<typeof vesselSchema>;
export type CrewInput = z.infer<typeof crewSchema>;
export type Vessel = VesselInput & {
  id: string;
  version: number;
  createdAt: string;
};
export type Crew = CrewInput & {
  id: string;
  version: number;
  vesselId: string | null;
  createdAt: string;
};
export type Activity = { id: string; message: string; createdAt: string };
export type User = {
  id: string;
  name: string;
  email: string;
  company: string;
  role: "admin";
};
export type Workspace = {
  vessels: Vessel[];
  crew: Crew[];
  activity: Activity[];
};
export function compliance(
  expiry: string,
  today = new Date().toISOString().slice(0, 10),
): "Expired" | "Expiring soon" | "Valid" {
  const days = (Date.parse(expiry) - Date.parse(today)) / 86400000;
  return days < 0 ? "Expired" : days <= 30 ? "Expiring soon" : "Valid";
}
