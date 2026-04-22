import { nampa } from "./nampa";
import type { Hearing, Locality } from "./types";

export type {
  Hearing,
  HearingFeed,
  HearingPhase,
  Locality,
  ScheduledMeeting,
  TrackedItem,
} from "./types";
export { getUpcomingMeetings, type UpcomingMeeting } from "./meetings";

const LOCALITIES: Record<string, Locality> = {
  [nampa.slug]: nampa,
};

export function getLocality(slug: string): Locality | null {
  return LOCALITIES[slug] ?? null;
}

export function listLocalities(): Locality[] {
  return Object.values(LOCALITIES);
}

/** Look up a hearing within a pre-fetched feed by its APPID. Case-insensitive. */
export function findHearing(
  hearings: Hearing[],
  appId: string
): Hearing | null {
  const needle = appId.toUpperCase();
  return hearings.find((h) => h.appId.toUpperCase() === needle) ?? null;
}
