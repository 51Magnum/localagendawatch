import { createEnerGovClient } from "@/lib/sources/energov";
import { queryFeatures, type ArcGISLayerConfig } from "@/lib/sources/arcgis";
import type {
  Hearing,
  HearingFeed,
  HearingPhase,
  Locality,
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

type PZAttributes = {
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

const ENERGOV_GUID_RE =
  /\/plan\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

function normalisePhase(raw: string | null): HearingPhase {
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

function mapAttrs(attrs: PZAttributes): Hearing {
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
  };
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
  const [activeRaw, completedRaw] = await Promise.all([
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
  ]);
  return {
    active: activeRaw.map(mapAttrs),
    completed: completedRaw.map(mapAttrs),
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
