import { describe, expect, it } from "vitest";
import type { Hearing, HearingFeed, ScheduledMeeting } from "./types";
import { getUpcomingMeetings } from "./meetings";

const NOW = new Date("2026-04-20T12:00:00");

function meeting(over: Partial<ScheduledMeeting> = {}): ScheduledMeeting {
  return {
    body: "P&Z",
    bodyLabel: "Planning & Zoning Commission",
    date: "2026-04-28",
    dateLabel: "April 28, 2026",
    continuedNote: null,
    sourceUrl: "https://www.cityofnampa.us/1433/Upcoming-Public-Hearings",
    ...over,
  };
}

function hearing(appId: string, meetings: ScheduledMeeting[]): Hearing {
  return {
    appId,
    appType: "ANN",
    appTypeLabel: "Annexation",
    appStatus: "Pending",
    appPhase: "PZ Commission",
    appPhaseRaw: "PZ Commission",
    appScope: `Scope for ${appId}`,
    appAcres: 1,
    externalUrl: null,
    energovPlanId: null,
    meetings,
  };
}

function feedOf(active: Hearing[], completed: Hearing[] = []): HearingFeed {
  return { active, completed };
}

describe("getUpcomingMeetings", () => {
  it("returns an empty list for an empty feed", () => {
    expect(getUpcomingMeetings(feedOf([]), { now: NOW })).toEqual([]);
  });

  it("surfaces a single hearing as one meeting with one scheduled application", () => {
    const h = hearing("ANN-00346-2026", [meeting({ date: "2026-05-04", body: "City Council", bodyLabel: "City Council" })]);
    const out = getUpcomingMeetings(feedOf([h]), { now: NOW });
    expect(out).toHaveLength(1);
    expect(out[0].body).toBe("City Council");
    expect(out[0].date).toBe("2026-05-04");
    expect(out[0].hearings.map((x) => x.appId)).toEqual(["ANN-00346-2026"]);
  });

  it("groups hearings that share a (body, date) into one meeting", () => {
    const a = hearing("ANN-00351-2026", [meeting()]);
    const b = hearing("CMA-00066-2026", [meeting()]);
    const c = hearing("SPP-00173-2026", [meeting()]);
    const out = getUpcomingMeetings(feedOf([a, b, c]), { now: NOW });
    expect(out).toHaveLength(1);
    expect(out[0].hearings.map((x) => x.appId)).toEqual([
      "ANN-00351-2026",
      "CMA-00066-2026",
      "SPP-00173-2026",
    ]);
  });

  it("keeps (body, date) combinations separate", () => {
    const pz = hearing("A-1", [meeting({ body: "P&Z", date: "2026-04-28" })]);
    const cc = hearing("A-2", [
      meeting({ body: "City Council", bodyLabel: "City Council", date: "2026-04-28" }),
    ]);
    const out = getUpcomingMeetings(feedOf([pz, cc]), { now: NOW });
    expect(out).toHaveLength(2);
  });

  it("drops meetings dated before today", () => {
    const h = hearing("A-1", [
      meeting({ date: "2026-03-10", dateLabel: "March 10, 2026" }),
      meeting({ date: "2026-05-12", dateLabel: "May 12, 2026" }),
    ]);
    const out = getUpcomingMeetings(feedOf([h]), { now: NOW });
    expect(out.map((m) => m.date)).toEqual(["2026-05-12"]);
  });

  it("keeps a meeting scheduled for today", () => {
    const h = hearing("A-1", [
      meeting({ date: "2026-04-20", dateLabel: "April 20, 2026" }),
    ]);
    const out = getUpcomingMeetings(feedOf([h]), { now: NOW });
    expect(out).toHaveLength(1);
  });

  it("drops scheduled entries with a continuance note", () => {
    const h = hearing("CMA-00069-2026", [
      meeting({ date: "2026-04-28", continuedNote: "Continued to 5/12/26" }),
      meeting({ date: "2026-05-12" }),
    ]);
    const out = getUpcomingMeetings(feedOf([h]), { now: NOW });
    expect(out.map((m) => m.date)).toEqual(["2026-05-12"]);
  });

  it("sorts meetings by date ascending", () => {
    const h = hearing("A-1", [
      meeting({ date: "2026-06-01", dateLabel: "June 1, 2026" }),
      meeting({ date: "2026-04-28", dateLabel: "April 28, 2026" }),
      meeting({
        body: "City Council",
        bodyLabel: "City Council",
        date: "2026-05-04",
        dateLabel: "May 4, 2026",
      }),
    ]);
    const out = getUpcomingMeetings(feedOf([h]), { now: NOW });
    expect(out.map((m) => m.date)).toEqual([
      "2026-04-28",
      "2026-05-04",
      "2026-06-01",
    ]);
  });

  it("truncates to the requested limit", () => {
    const h = hearing("A-1", [
      meeting({ date: "2026-04-28", dateLabel: "April 28, 2026" }),
      meeting({ date: "2026-05-12", dateLabel: "May 12, 2026" }),
      meeting({ date: "2026-05-26", dateLabel: "May 26, 2026" }),
      meeting({ date: "2026-06-09", dateLabel: "June 9, 2026" }),
    ]);
    const out = getUpcomingMeetings(feedOf([h]), { now: NOW, limit: 3 });
    expect(out.map((m) => m.date)).toEqual([
      "2026-04-28",
      "2026-05-12",
      "2026-05-26",
    ]);
  });

  it("does not surface meetings from the completed bucket", () => {
    const done = hearing("A-1", [meeting({ date: "2026-05-12" })]);
    expect(getUpcomingMeetings(feedOf([], [done]), { now: NOW })).toEqual([]);
  });

  it("surfaces upcomingOnly hearings on hero cards", () => {
    // Stub items: in CivicPlus but not yet in ArcGIS
    const stub = hearing("CMA-00068-2026", [meeting({ date: "2026-04-28" })]);
    const feed = { active: [], completed: [], upcomingOnly: [stub] };
    const out = getUpcomingMeetings(feed, { now: NOW });
    expect(out).toHaveLength(1);
    expect(out[0].hearings.map((x) => x.appId)).toEqual(["CMA-00068-2026"]);
  });

  it("merges upcomingOnly into the same (body, date) group as active hearings", () => {
    const active = hearing("ANN-00351-2026", [meeting({ date: "2026-04-28" })]);
    const stub = hearing("CMA-00068-2026", [meeting({ date: "2026-04-28" })]);
    const feed = { active: [active], completed: [], upcomingOnly: [stub] };
    const out = getUpcomingMeetings(feed, { now: NOW });
    expect(out).toHaveLength(1);
    expect(out[0].hearings.map((x) => x.appId)).toEqual([
      "ANN-00351-2026",
      "CMA-00068-2026",
    ]);
  });
});
