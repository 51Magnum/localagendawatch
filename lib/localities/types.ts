import type { EnerGovClient } from "@/lib/sources/energov";

/**
 * A tracked item is a curated reference to a record in an external data
 * source (typically an EnerGov plan or permit). The registry keeps the list
 * narrow and editor-controlled; search-driven discovery can be layered on
 * later without changing this shape.
 */
export type TrackedPlan = {
  kind: "energov-plan";
  /** EnerGov PlanId (GUID). Stable primary key. */
  planId: string;
  /** Human-readable PlanNumber (e.g. "ANN-00352-2026"). Used in URLs. */
  planNumber: string;
  /** Short label for listings; falls back to the EnerGov Description when absent. */
  label?: string;
  /** One-line teaser for listings. */
  blurb?: string;
};

export type EditorialItem = {
  kind: "editorial";
  /** URL slug under the locality, e.g. "toll-brothers-amity-happy-valley". */
  slug: string;
  label: string;
  blurb?: string;
};

export type TrackedItem = TrackedPlan | EditorialItem;

/**
 * Placeholder for future meeting-source integrations (P&Z agendas, city
 * council). Kept as `unknown[]` until we wire up the first provider so we
 * don't lock in an API shape prematurely.
 */
export type MeetingSourceConfig = {
  /** e.g. "civicengage", "civicclerk", ... */
  provider: string;
  /** Provider-specific config; typed per-provider when implemented. */
  config: Record<string, unknown>;
};

export type Locality = {
  slug: string;
  displayName: string;
  /** Descriptive full name for page copy ("Nampa, Idaho"). */
  fullName: string;
  /** Canonical public-portal URL, shown on listings for attribution. */
  portalUrl?: string;
  energov?: EnerGovClient;
  tracked: TrackedItem[];
  /** Reserved for future meeting providers (P&Z, city council). */
  meetingSources?: MeetingSourceConfig[];
};
