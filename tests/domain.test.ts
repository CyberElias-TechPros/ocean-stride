import { describe, it, expect } from "vitest";
import {
  compliance,
  vesselSchema,
  crewSchema,
  registrationSchema,
} from "../shared/domain";
const vessel = {
  name: "Test vessel",
  imo: "9074729",
  type: "Container ship",
  flag: "Panama",
  capacity: 20,
  status: "In port",
  destination: "Lagos",
};
describe("maritime validation", () => {
  it("accepts a valid vessel", () =>
    expect(vesselSchema.safeParse(vessel).success).toBe(true));
  it.each(["9074728", "abc", "123", "0000001"])(
    "rejects invalid IMO %s",
    (imo) =>
      expect(vesselSchema.safeParse({ ...vessel, imo }).success).toBe(false),
  );
  it.each([0, -1, 501, 1.5])("rejects invalid capacity %s", (capacity) =>
    expect(vesselSchema.safeParse({ ...vessel, capacity }).success).toBe(false),
  );
  it("rejects impossible certificate dates", () =>
    expect(
      crewSchema.safeParse({
        name: "A Person",
        email: "a@example.com",
        rank: "Captain",
        nationality: "Nigeria",
        certificateExpiry: "2026-02-30",
      }).success,
    ).toBe(false));
  it("requires a strong registration passphrase", () =>
    expect(
      registrationSchema.safeParse({
        name: "A Person",
        email: "a@example.com",
        company: "A Company",
        password: "weak",
      }).success,
    ).toBe(false));
  it.each([
    ["2026-09-13", "Expired"],
    ["2026-09-14", "Expiring soon"],
    ["2026-10-14", "Expiring soon"],
    ["2026-10-15", "Valid"],
  ])("classifies %s as %s", (date, status) =>
    expect(compliance(date, "2026-09-14")).toBe(status),
  );
});
