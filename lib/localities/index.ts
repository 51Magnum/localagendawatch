import { nampa } from "./nampa";
import type { Locality, TrackedItem, TrackedPlan } from "./types";

export type { Locality, TrackedItem, TrackedPlan } from "./types";

const LOCALITIES: Record<string, Locality> = {
  [nampa.slug]: nampa,
};

export function getLocality(slug: string): Locality | null {
  return LOCALITIES[slug] ?? null;
}

export function listLocalities(): Locality[] {
  return Object.values(LOCALITIES);
}

export function findTrackedPlan(
  locality: Locality,
  planNumber: string
): TrackedPlan | null {
  const match = locality.tracked.find(
    (t): t is TrackedPlan =>
      t.kind === "energov-plan" && t.planNumber === planNumber
  );
  return match ?? null;
}
