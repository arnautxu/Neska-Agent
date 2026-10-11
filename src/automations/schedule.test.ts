import { isAutomationSchedule } from "@/automations/contracts";
import { describe, expect, it } from "vitest";
import { describeSchedule, localMinuteToInstant, nextScheduledInstant } from "@/automations/schedule";
import { translate } from "@/i18n/messages";

describe("automation schedules", () => {
  it("keeps two-hour UTC cadence across DST, chooses future anchors and validates strict interval inputs", () => {
    const schedule = { kind: "interval" as const, minutes: 120, anchorAt: "2026-10-25T00:00:00.000Z" };
    expect(isAutomationSchedule(schedule)).toBe(true);
    expect(nextScheduledInstant(schedule, "Europe/Madrid", new Date("2026-10-25T00:00:00.000Z"))).toBe("2026-10-25T02:00:00.000Z");
    expect(nextScheduledInstant(schedule, "Europe/Madrid", new Date("2026-10-24T12:00:00.000Z"))).toBe(schedule.anchorAt);
    expect(nextScheduledInstant(schedule, "Europe/Madrid", new Date("2026-10-26T01:59:00.000Z"))).toBe("2026-10-26T02:00:00.000Z");
    expect(isAutomationSchedule({ ...schedule, minutes: 0 })).toBe(false);
    expect(isAutomationSchedule({ ...schedule, minutes: 1.5 })).toBe(false);
    expect(isAutomationSchedule({ ...schedule, minute: 0 })).toBe(false);
    expect(isAutomationSchedule({ ...schedule, anchorAt: "invalid" })).toBe(false);
  });

  it("uses the first valid minute after the Madrid spring DST gap", () => {
    expect(localMinuteToInstant({ year: 2026, month: 3, day: 29, hour: 2, minute: 30 }, "Europe/Madrid").toISOString())
      .toBe("2026-03-29T01:00:00.000Z");
  });

  it("uses the earliest instant during the Madrid autumn overlap", () => {
    expect(localMinuteToInstant({ year: 2026, month: 10, day: 25, hour: 2, minute: 30 }, "Europe/Madrid").toISOString())
      .toBe("2026-10-25T00:30:00.000Z");
  });

  it("keeps weekly wall-clock time across DST", () => {
    expect(nextScheduledInstant(
      { kind: "weekly", weekdays: [1], hour: 9, minute: 0 },
      "Europe/Madrid",
      new Date("2026-03-27T12:00:00.000Z"),
    )).toBe("2026-03-30T07:00:00.000Z");
  });

  it("describes saved schedules in the interface language", () => {
    const weekly = { kind: "weekly" as const, weekdays: [1, 3], hour: 9, minute: 5 };
    const daily = { kind: "daily" as const, hour: 18, minute: 0 };
    const interval = { kind: "interval" as const, minutes: 120, anchorAt: "2026-10-25T00:00:00.000Z" };
    expect(describeSchedule(weekly, "Europe/Madrid")).toBe("lun, mié · 09:05");
    expect(describeSchedule(daily, "Europe/Madrid")).toBe("Cada día · 18:00");
    const catalan = (source: string, values?: Record<string, string | number>) => translate("ca", source, values);
    expect(describeSchedule(daily, "Europe/Madrid", "ca", catalan)).toBe("Cada dia · 18:00");
    expect(describeSchedule(interval, "Europe/Madrid", "ca", catalan)).toBe("Cada 2 hores");
    expect(describeSchedule(weekly, "Europe/Madrid", "ca", catalan)).toBe("dl., dc. · 09:05");
    const english = (source: string, values?: Record<string, string | number>) => translate("en", source, values);
    expect(describeSchedule(weekly, "Europe/Madrid", "en", english)).toBe("Mon, Wed · 09:05");
  });
});
