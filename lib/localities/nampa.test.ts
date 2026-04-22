import { describe, expect, it } from "vitest";
import {
  ENERGOV_GUID_RE,
  mapAttrs,
  normalisePhase,
  type PZAttributes,
} from "./nampa";

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
  });
});
