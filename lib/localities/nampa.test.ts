import { describe, expect, it } from "vitest";
import {
  ENERGOV_GUID_RE,
  indexScheduledMeetings,
  mapAttrs,
  normalisePhase,
  type PZAttributes,
} from "./nampa";
import type { NampaScheduledHearing } from "@/lib/sources/cityofnampa";

const BASE_ATTRS: PZAttributes = {
  OBJECTID: 1,
  APPID: "ZMA-00199-2024",
  APPTYPE: "ZMA",
  APPSTATUS: "Pending",
  APPPHASE: "PZ Commission",
  APPSCOPE: "Rezone from IP to IL",
  APPACRES: 1.18,
  APPLINK:
    "https://nampaid-energovpub.tylerhost.net/Apps/SelfService#/plan/e5f906c1-b03b-4ab9-8021-0d5f002d1234",
};

describe("ENERGOV_GUID_RE", () => {
  it("extracts the GUID from a typical APPLINK", () => {
    const m = BASE_ATTRS.APPLINK!.match(ENERGOV_GUID_RE);
    expect(m?.[1]).toBe("e5f906c1-b03b-4ab9-8021-0d5f002d1234");
  });

  it("is case-insensitive", () => {
    const link =
      "https://host/Apps/SelfService#/PLAN/E5F906C1-B03B-4AB9-8021-0D5F002D1234";
    const m = link.match(ENERGOV_GUID_RE);
    expect(m?.[1]?.toLowerCase()).toBe("e5f906c1-b03b-4ab9-8021-0d5f002d1234");
  });

  it("does not match a URL without a /plan/<guid> segment", () => {
    expect(
      "https://host/Apps/SelfService#/permit/e5f906c1-b03b-4ab9-8021-0d5f002d1234".match(
        ENERGOV_GUID_RE,
      ),
    ).toBeNull();
  });

  it("does not match a malformed GUID", () => {
    expect(
      "https://host/Apps/SelfService#/plan/not-a-real-guid".match(
        ENERGOV_GUID_RE,
      ),
    ).toBeNull();
  });
});

describe("normalisePhase", () => {
  it.each([
    "Review",
    "Notification",
    "PZ Commission",
    "City Council",
    "Recording",
  ] as const)("passes through the known phase %s", (phase) => {
    expect(normalisePhase(phase)).toBe(phase);
  });

  it("returns 'Other' for unknown values", () => {
    expect(normalisePhase("Something Else")).toBe("Other");
  });

  it("returns 'Other' for null", () => {
    expect(normalisePhase(null)).toBe("Other");
  });
});

describe("mapAttrs", () => {
  it("maps all fields, expands the type label, and extracts the GUID", () => {
    expect(mapAttrs(BASE_ATTRS)).toEqual({
      appId: "ZMA-00199-2024",
      appType: "ZMA",
      appTypeLabel: "Zoning Map Amendment or Rezone",
      appStatus: "Pending",
      appPhase: "PZ Commission",
      appPhaseRaw: "PZ Commission",
      appScope: "Rezone from IP to IL",
      appAcres: 1.18,
      externalUrl: BASE_ATTRS.APPLINK,
      energovPlanId: "e5f906c1-b03b-4ab9-8021-0d5f002d1234",
      meetings: [],
    });
  });

  it("falls back to the raw APPTYPE when the code is unknown", () => {
    const row = mapAttrs({ ...BASE_ATTRS, APPTYPE: "ZZZ" });
    expect(row.appType).toBe("ZZZ");
    expect(row.appTypeLabel).toBe("ZZZ");
  });

  it("leaves energovPlanId null when APPLINK has no plan GUID", () => {
    const row = mapAttrs({
      ...BASE_ATTRS,
      APPLINK: "https://nampaid-energovpub.tylerhost.net/Apps/SelfService",
    });
    expect(row.energovPlanId).toBeNull();
  });

  it("leaves energovPlanId null when APPLINK is null", () => {
    const row = mapAttrs({ ...BASE_ATTRS, APPLINK: null });
    expect(row.energovPlanId).toBeNull();
    expect(row.externalUrl).toBeNull();
  });

  it("normalises an unknown APPPHASE to 'Other' while preserving the raw value", () => {
    const row = mapAttrs({ ...BASE_ATTRS, APPPHASE: "Intake" });
    expect(row.appPhase).toBe("Other");
    expect(row.appPhaseRaw).toBe("Intake");
  });

  it("coerces null string/number fields to sensible defaults", () => {
    const row = mapAttrs({
      ...BASE_ATTRS,
      APPTYPE: null,
      APPSTATUS: null,
      APPPHASE: null,
      APPSCOPE: null,
      APPACRES: null,
    });
    expect(row.appType).toBe("");
    expect(row.appTypeLabel).toBe("");
    expect(row.appStatus).toBe("");
    expect(row.appPhase).toBe("Other");
    expect(row.appPhaseRaw).toBe("");
    expect(row.appScope).toBeNull();
    expect(row.appAcres).toBeNull();
    expect(row.meetings).toEqual([]);
  });
});

describe("indexScheduledMeetings", () => {
  const row = (over: Partial<NampaScheduledHearing>): NampaScheduledHearing => ({
    date: "2026-05-04",
    dateLabel: "May 4, 2026",
    body: "City Council",
    bodyLabel: "City Council",
    appId: "ANN-00346-2026",
    description: "",
    continuedNote: null,
    energovPlanId: null,
    sourceUrl: "https://www.cityofnampa.us/1433/Upcoming-Public-Hearings",
    ...over,
  });

  it("returns an empty index for an empty input", () => {
    expect(indexScheduledMeetings([]).size).toBe(0);
  });

  it("groups multiple rows under the same APPID and sorts them by date", () => {
    const idx = indexScheduledMeetings([
      row({ appId: "CMA-00069-2026", date: "2026-05-12", dateLabel: "May 12, 2026" }),
      row({
        appId: "CMA-00069-2026",
        date: "2026-04-28",
        dateLabel: "April 28, 2026",
        continuedNote: "Continued to 5/12/26",
      }),
    ]);
    const meetings = idx.get("CMA-00069-2026");
    expect(meetings).toHaveLength(2);
    expect(meetings!.map((m) => m.date)).toEqual(["2026-04-28", "2026-05-12"]);
    expect(meetings![0].continuedNote).toBe("Continued to 5/12/26");
    expect(meetings![1].continuedNote).toBeNull();
  });

  it("drops scraper-only fields (appId, description, energovPlanId)", () => {
    const idx = indexScheduledMeetings([row({})]);
    const meeting = idx.get("ANN-00346-2026")![0];
    expect(meeting).not.toHaveProperty("appId");
    expect(meeting).not.toHaveProperty("description");
    expect(meeting).not.toHaveProperty("energovPlanId");
    expect(Object.keys(meeting).sort()).toEqual([
      "body",
      "bodyLabel",
      "continuedNote",
      "date",
      "dateLabel",
      "sourceUrl",
    ]);
  });
});
