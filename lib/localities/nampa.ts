import { createEnerGovClient } from "@/lib/sources/energov";
import { queryFeatures, type ArcGISLayerConfig } from "@/lib/sources/arcgis";
import {
  getNampaScheduledHearings,
  type NampaScheduledHearing,
} from "@/lib/sources/cityofnampa";
import type {
  Hearing,
  HearingFeed,
  HearingPhase,
  Locality,
  ScheduledMeeting,
} from "./types";

const energov = createEnerGovClient({
  baseUrl: "https://nampaid-energovpub.tylerhost.net",
  tenantId: 1,
  tenantName: "NampaIDProd",
});

/**
 * City of Nampa "PZ Hearings" feature service. Layer 0 is active applications,
 * layer 1 is recently completed. Schema (see layer metadata):
 *   APPID, APPTYPE (coded), APPSTATUS, APPPHASE (coded), APPSCOPE, APPACRES,
 *   APPLINK, EFFCTDATE (layer 1 only).
 */
const PZ_SERVICE =
  "https://utility.arcgis.com/usrsvcs/servers/757f490738bd43da906508745cf92337/rest/services/Public/PZ_Hearings/MapServer";

const PZ_ACTIVE: ArcGISLayerConfig = { serviceUrl: PZ_SERVICE, layerId: 0 };
const PZ_COMPLETED: ArcGISLayerConfig = { serviceUrl: PZ_SERVICE, layerId: 1 };

const APP_TYPE_LABELS: Record<string, string> = {
  ANN: "Annexation",
  APL: "Appeal",
  AZV: "Alcohol Zoning Verification",
  BSD: "Building & Site Design Standards",
  CMA: "Comprehensive Plan Map Amendment",
  CTA: "Comprehensive Plan Text Amendment",
  CUP: "Conditional Use Permit",
  DAMO: "Development Agreement - Modification",
  DAN: "Development Agreement - New",
  DANX: "De-Annexation",
  DFA: "Deferral Agreement",
  HIS: "Historical Significance",
  HOD: "Home Occupation Daycare",
  HOR: "Home Occupation",
  LNU: "Legal Non-Conforming Use/Site Rights",
  MHP: "Mobile Home Park",
  MPC: "Master Planned Community",
  NKL: "Non-Commercial Kennel License",
  Note: "Note",
  PANN: "Pre-Annexation",
  PBA: "Property Boundary Adjustment",
  PUD: "Planned Unit Development",
  SDE: "Subdivision Design Exception",
  SIP: "Site Improvement Permit",
  SPC: "Subdivision Plat - Condo",
  SPF: "Subdivision Plat - Final",
  SPP: "Subdivision Plat - Preliminary",
  SPS: "Subdivision Plat - Short",
  TUP: "Temporary Use Permit",
  VAC: "Vacation of Easement/Right-of-Way/Plat",
  VAR: "Variance",
  VDP: "Vehicle Dealership Permit",
  ZMA: "Zoning Map Amendment or Rezone",
  ZTA: "Zoning Code Text Amendment",
};

export type PZAttributes = {
  OBJECTID: number;
  APPID: string;
  APPTYPE: string | null;
  APPSTATUS: string | null;
  APPPHASE: string | null;
  APPSCOPE: string | null;
  APPACRES: number | null;
  APPLINK: string | null;
  EFFCTDATE?: number | null;
};

export const ENERGOV_GUID_RE =
  /\/plan\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function normalisePhase(raw: string | null): HearingPhase {
  switch (raw) {
    case "Review":
    case "Notification":
    case "PZ Commission":
    case "City Council":
    case "Recording":
      return raw;
    default:
      return "Other";
  }
}

export function mapAttrs(attrs: PZAttributes): Hearing {
  const guid = attrs.APPLINK?.match(ENERGOV_GUID_RE)?.[1] ?? null;
  return {
    appId: attrs.APPID,
    appType: attrs.APPTYPE ?? "",
    appTypeLabel: APP_TYPE_LABELS[attrs.APPTYPE ?? ""] ?? attrs.APPTYPE ?? "",
    appStatus: attrs.APPSTATUS ?? "",
    appPhase: normalisePhase(attrs.APPPHASE),
    appPhaseRaw: attrs.APPPHASE ?? "",
    appScope: attrs.APPSCOPE,
    appAcres: attrs.APPACRES,
    externalUrl: attrs.APPLINK,
    energovPlanId: guid,
    meetings: [],
  };
}

/**
 * Group scraped CivicPlus rows by APPID and strip the now-redundant appId /
 * description fields, which live on the owning Hearing.
 */
export function indexScheduledMeetings(
  rows: NampaScheduledHearing[],
): Map<string, ScheduledMeeting[]> {
  const byAppId = new Map<string, ScheduledMeeting[]>();
  for (const r of rows) {
    const list = byAppId.get(r.appId) ?? [];
    list.push({
      body: r.body,
      bodyLabel: r.bodyLabel,
      date: r.date,
      dateLabel: r.dateLabel,
      continuedNote: r.continuedNote,
      sourceUrl: r.sourceUrl,
    });
    byAppId.set(r.appId, list);
  }
  for (const list of byAppId.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }
  return byAppId;
}

async function getNampaHearings(): Promise<HearingFeed> {
  const outFields = [
    "OBJECTID",
    "APPID",
    "APPTYPE",
    "APPSTATUS",
    "APPPHASE",
    "APPSCOPE",
    "APPACRES",
    "APPLINK",
  ];
  const [activeRaw, completedRaw, scheduledRaw] = await Promise.all([
    queryFeatures<PZAttributes>(PZ_ACTIVE, {
      outFields,
      orderByFields: "APPID DESC",
      tag: "nampa:pz:active",
    }),
    queryFeatures<PZAttributes>(PZ_COMPLETED, {
      outFields: [...outFields, "EFFCTDATE"],
      orderByFields: "EFFCTDATE DESC",
      tag: "nampa:pz:completed",
    }),
    getNampaScheduledHearings().catch((err: unknown) => {
      console.error("[nampa] getNampaScheduledHearings failed:", err);
      return [] as NampaScheduledHearing[];
    }),
  ]);
  const byAppId = indexScheduledMeetings(scheduledRaw);

  // Secondary index: first raw scheduled row per APPID, for description +
  // energovPlanId that are not kept in the ScheduledMeeting type.
  const firstScheduled = new Map<string, NampaScheduledHearing>();
  for (const r of scheduledRaw) {
    if (!firstScheduled.has(r.appId)) firstScheduled.set(r.appId, r);
  }

  const attach = (h: Hearing): Hearing => {
    const meetings = byAppId.get(h.appId);
    return meetings ? { ...h, meetings } : h;
  };

  // APPIDs already accounted for in ArcGIS (active or completed).
  const knownIds = new Set<string>([
    ...activeRaw.map((a) => a.APPID),
    ...completedRaw.map((c) => c.APPID),
  ]);

  // Stub hearings: on the city's upcoming-hearings page but not yet in ArcGIS.
  const upcomingOnly: Hearing[] = [];
  for (const [appId, meetings] of byAppId) {
    if (knownIds.has(appId)) continue;
    const first = firstScheduled.get(appId);
    const typeCode = appId.split("-")[0] ?? "";
    upcomingOnly.push({
      appId,
      appType: typeCode,
      appTypeLabel: APP_TYPE_LABELS[typeCode] ?? typeCode,
      appStatus: "Scheduled",
      appPhase: "Other",
      appPhaseRaw: "",
      appScope: first?.description ?? null,
      appAcres: null,
      externalUrl: null,
      energovPlanId: first?.energovPlanId ?? null,
      meetings,
    });
  }

  return {
    active: activeRaw.map(mapAttrs).map(attach),
    completed: completedRaw.map(mapAttrs).map(attach),
    upcomingOnly,
  };
}

export const nampa: Locality = {
  slug: "nampa",
  displayName: "Nampa",
  fullName: "Nampa, Idaho",
  portalUrl: "https://nampaid-energovpub.tylerhost.net/Apps/SelfService",
  dataAttribution: "Planning & Zoning data: City of Nampa GIS",
  energov,
  tracked: [
    {
      kind: "editorial",
      slug: "toll-brothers-amity-happy-valley",
      label: "Toll Brothers \u2014 500 homes at Amity & Happy Valley",
      blurb:
        "Neighborhood meeting March 24, 2026 \u00b7 137 acres \u00b7 detached single-family",
    },
  ],
  getHearings: getNampaHearings,
};
