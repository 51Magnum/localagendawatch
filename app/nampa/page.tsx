import type { Metadata } from "next";
import Link from "next/link";
import { getLocalityContext, localityHref } from "@/lib/locality";
import { getLocality } from "@/lib/localities";
import type { Hearing, HearingPhase, TrackedItem } from "@/lib/localities";

export const metadata: Metadata = {
  title: "Nampa, Idaho",
  description:
    "Proposed developments and municipal items we're tracking in Nampa, Idaho.",
};

type LocalityCtx = Awaited<ReturnType<typeof getLocalityContext>>;

type Entry = {
  key: string;
  href: string;
  label: string;
  blurb?: string;
  meta?: string;
};

function editorialEntry(item: TrackedItem, ctx: LocalityCtx): Entry {
  return {
    key: `editorial:${item.slug}`,
    href: localityHref("nampa", `/${item.slug}`, ctx),
    label: item.label,
    blurb: item.blurb,
  };
}

function hearingEntry(h: Hearing, ctx: LocalityCtx): Entry {
  const label = h.appScope?.trim() || `${h.appTypeLabel} (${h.appId})`;
  const blurbParts = [h.appTypeLabel];
  if (h.appAcres != null) blurbParts.push(`${h.appAcres.toFixed(2)} acres`);
  if (h.appStatus) blurbParts.push(h.appStatus);
  return {
    key: `hearing:${h.appId}`,
    href: localityHref("nampa", `/plan/${encodeURIComponent(h.appId)}`, ctx),
    label,
    blurb: blurbParts.join(" \u00b7 "),
    meta: h.appId,
  };
}

/**
 * Active hearings are bucketed by phase for the hub. PZ Commission / City
 * Council are shown first (closest to a public hearing), then Notification,
 * Review, and finally anything unrecognised.
 */
const PHASE_ORDER: HearingPhase[] = [
  "City Council",
  "PZ Commission",
  "Notification",
  "Review",
  "Recording",
  "Other",
];

const PHASE_HEADINGS: Record<HearingPhase, string> = {
  "City Council": "At City Council",
  "PZ Commission": "At P&Z Commission",
  Notification: "Public notification",
  Review: "In staff review",
  Recording: "Awaiting recording",
  Other: "Other",
};

function groupByPhase(hearings: Hearing[]): Map<HearingPhase, Hearing[]> {
  const buckets = new Map<HearingPhase, Hearing[]>();
  for (const h of hearings) {
    const list = buckets.get(h.appPhase) ?? [];
    list.push(h);
    buckets.set(h.appPhase, list);
  }
  return buckets;
}

export default async function NampaHub() {
  const ctx = await getLocalityContext();
  const onNampaSubdomain = ctx.onSubdomain && ctx.subdomainSlug === "nampa";
  const nampa = getLocality("nampa");

  const editorialEntries: Entry[] = (nampa?.tracked ?? []).map((t) =>
    editorialEntry(t, ctx)
  );

  const feed = nampa?.getHearings ? await nampa.getHearings() : null;
  const activeBuckets = feed ? groupByPhase(feed.active) : null;
  const completedEntries: Entry[] = feed
    ? feed.completed.slice(0, 10).map((h) => hearingEntry(h, ctx))
    : [];

  return (
    <div className="flex flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-16">
        {!onNampaSubdomain && (
          <nav className="text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/" className="hover:text-black dark:hover:text-zinc-50">
              Home
            </Link>
          </nav>
        )}

        <header className="flex flex-col gap-4">
          <p className="font-mono text-sm uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Nampa, Idaho
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50 sm:text-5xl">
            What&rsquo;s coming to Nampa
          </h1>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Planning &amp; Zoning applications live from the City of Nampa,
            plus developments we&rsquo;re tracking editorially.
          </p>
        </header>

        {editorialEntries.length > 0 && (
          <EntryList title="Editorial" entries={editorialEntries} />
        )}

        {activeBuckets &&
          PHASE_ORDER.filter((p) => (activeBuckets.get(p)?.length ?? 0) > 0).map(
            (phase) => (
              <EntryList
                key={phase}
                title={PHASE_HEADINGS[phase]}
                entries={(activeBuckets.get(phase) ?? []).map((h) =>
                  hearingEntry(h, ctx)
                )}
              />
            )
          )}

        {completedEntries.length > 0 && (
          <EntryList
            title="Recently completed"
            entries={completedEntries}
            muted
          />
        )}

        <footer className="border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {nampa?.dataAttribution ?? null}
          {nampa?.dataAttribution && " \u00b7 "}
          Data refreshes automatically. Local Agenda Watch is an independent
          tracker and is not affiliated with the City of Nampa.
        </footer>
      </main>
    </div>
  );
}

function EntryList({
  title,
  entries,
  muted,
}: {
  title: string;
  entries: Entry[];
  muted?: boolean;
}) {
  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      <ul
        className={`mt-4 divide-y border-y ${
          muted
            ? "divide-zinc-200/70 border-zinc-200/70 dark:divide-zinc-800/70 dark:border-zinc-800/70"
            : "divide-zinc-200 border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
        }`}
      >
        {entries.map((e) => (
          <li key={e.key}>
            <Link
              href={e.href}
              className="flex flex-col gap-1 py-4 hover:text-black dark:hover:text-zinc-50"
            >
              <span className="flex flex-wrap items-baseline gap-3">
                <span className="font-medium text-black dark:text-zinc-50">
                  {e.label}
                </span>
                {e.meta && (
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {e.meta}
                  </span>
                )}
              </span>
              {e.blurb && (
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {e.blurb}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
