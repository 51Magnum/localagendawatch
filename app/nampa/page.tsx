import type { Metadata } from "next";
import Link from "next/link";
import { getLocalityContext, localityHref } from "@/lib/locality";
import { getLocality, getUpcomingMeetings } from "@/lib/localities";
import type {
  Hearing,
  HearingPhase,
  TrackedItem,
  UpcomingMeeting,
} from "@/lib/localities";

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
  const blurbParts: string[] = [];
  // Meetings are sorted ascending; the last one is the currently-scheduled
  // date (earlier entries may be continued/superseded).
  const nextMeeting = h.meetings[h.meetings.length - 1];
  if (nextMeeting) {
    blurbParts.push(`${nextMeeting.bodyLabel} \u2014 ${nextMeeting.dateLabel}`);
  }
  blurbParts.push(h.appTypeLabel);
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
  const upcoming = feed ? getUpcomingMeetings(feed, { limit: 3 }) : [];
  const activeBuckets = feed ? groupByPhase(feed.active) : null;
  const populatedPhases = activeBuckets
    ? PHASE_ORDER.filter((p) => (activeBuckets.get(p)?.length ?? 0) > 0)
    : [];
  const completedEntries: Entry[] = feed
    ? feed.completed.slice(0, 10).map((h) => hearingEntry(h, ctx))
    : [];

  return (
    <div className="flex flex-1 flex-col">
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white">
        <div className="mx-auto w-full max-w-5xl px-6 pb-14 pt-10">
          {!onNampaSubdomain && (
            <nav className="mb-8 flex items-center gap-2 text-sm text-slate-400">
              <Link href="/" className="hover:text-white">Home</Link>
              <span>/</span>
              <span className="text-slate-300">Nampa</span>
            </nav>
          )}
          <header>
            <p className="font-mono text-xs uppercase tracking-widest text-slate-400">
              Nampa, Idaho
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              What&rsquo;s coming to Nampa
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
              Planning &amp; Zoning applications live from the City of Nampa,
              plus developments we&rsquo;re tracking editorially.
            </p>
          </header>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14">
        <div className="flex flex-col gap-16">

          {/* Upcoming meeting hero cards */}
          {upcoming.length > 0 && (
            <section>
              <SectionLabel>Next public hearings</SectionLabel>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((m) => (
                  <MeetingCard key={`${m.body}|${m.date}`} meeting={m} ctx={ctx} />
                ))}
              </div>
            </section>
          )}

          {/* Editorial */}
          {editorialEntries.length > 0 && (
            <section>
              <SectionLabel>We&rsquo;re watching</SectionLabel>
              <EntryList entries={editorialEntries} className="mt-6" />
            </section>
          )}

          {/* Pipeline accordion */}
          {populatedPhases.length > 0 && activeBuckets && (
            <section>
              <SectionLabel>In the pipeline</SectionLabel>
              <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                {populatedPhases.map((phase, i) => (
                  <PhaseAccordion
                    key={phase}
                    title={PHASE_HEADINGS[phase]}
                    entries={(activeBuckets.get(phase) ?? []).map((h) =>
                      hearingEntry(h, ctx)
                    )}
                    bordered={i > 0}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Recently completed */}
          {completedEntries.length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                <span className="text-[10px] text-zinc-400 transition-transform group-open:rotate-90">
                  &#9654;
                </span>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                  Recently completed
                </h2>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600">
                  {completedEntries.length}
                </span>
              </summary>
              <EntryList entries={completedEntries} muted className="mt-4" />
            </details>
          )}

          <footer className="border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {nampa?.dataAttribution ?? null}
            {nampa?.dataAttribution && " \u00b7 "}
            Data refreshes automatically. Local Agenda Watch is an independent
            tracker and is not affiliated with the City of Nampa.
          </footer>
        </div>
      </main>
    </div>
  );
}

function SectionLabel({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <h2
      className={`text-xs font-semibold uppercase tracking-widest ${
        muted ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-400"
      }`}
    >
      {children}
    </h2>
  );
}

function MeetingCard({
  meeting,
  ctx,
}: {
  meeting: UpcomingMeeting;
  ctx: LocalityCtx;
}) {
  const isCC = meeting.body === "City Council";
  const accentBar = isCC ? "bg-sky-500" : "bg-indigo-500";
  const badge = isCC
    ? "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300"
    : "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300";
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className={`h-1.5 ${accentBar}`} />
      <div className="flex flex-1 flex-col gap-5 p-6">
        <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge}`}>
          {meeting.bodyLabel}
        </span>
        <div>
          <time className="block text-2xl font-bold tracking-tight text-black dark:text-zinc-50">
            {meeting.dateLabel}
          </time>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {meeting.hearings.length}{" "}
            {meeting.hearings.length === 1 ? "item" : "items"} up for public hearing
          </p>
        </div>
        <ul className="flex-1 divide-y divide-zinc-100 dark:divide-zinc-800">
          {meeting.hearings.map((h) => {
            const label = h.appScope?.trim() || `${h.appTypeLabel} (${h.appId})`;
            return (
              <li key={h.appId}>
                <Link
                  href={localityHref("nampa", `/plan/${encodeURIComponent(h.appId)}`, ctx)}
                  className="group flex flex-col gap-0.5 py-2.5"
                >
                  <span className="line-clamp-2 text-sm font-medium text-black group-hover:text-zinc-600 dark:text-zinc-50 dark:group-hover:text-zinc-300">
                    {label}
                  </span>
                  <span className="font-mono text-xs text-zinc-400">{h.appId}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <a
          href={meeting.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-zinc-400 hover:text-black dark:hover:text-zinc-50"
        >
          View on City of Nampa website &rarr;
        </a>
      </div>
    </article>
  );
}

function PhaseAccordion({
  title,
  entries,
  bordered,
}: {
  title: string;
  entries: Entry[];
  bordered?: boolean;
}) {
  return (
    <details
      className={`group${bordered ? " border-t border-zinc-200 dark:border-zinc-800" : ""}`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <span className="text-[10px] text-zinc-400 transition-transform group-open:rotate-90">
          &#9654;
        </span>
        <span className="flex-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          {title}
        </span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {entries.length}
        </span>
      </summary>
      <ul className="divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800/60 dark:border-zinc-800">
        {entries.map((e) => (
          <li key={e.key}>
            <Link
              href={e.href}
              className="flex items-start gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-black dark:text-zinc-50">
                  {e.label}
                </span>
                {e.blurb && (
                  <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {e.blurb}
                  </span>
                )}
              </div>
              {e.meta && (
                <span className="shrink-0 font-mono text-xs text-zinc-400 dark:text-zinc-600">
                  {e.meta}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

function EntryList({
  entries,
  muted,
  className = "",
}: {
  entries: Entry[];
  muted?: boolean;
  className?: string;
}) {
  return (
    <ul
      className={`divide-y border-y ${
        muted
          ? "divide-zinc-200/60 border-zinc-200/60 dark:divide-zinc-800/60 dark:border-zinc-800/60"
          : "divide-zinc-200 border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
      } ${className}`}
    >
      {entries.map((e) => (
        <li key={e.key}>
          <Link
            href={e.href}
            className="group flex items-start gap-4 py-4"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-baseline gap-3">
                <span
                  className={`font-medium ${
                    muted
                      ? "text-zinc-500 dark:text-zinc-400"
                      : "text-black dark:text-zinc-50"
                  }`}
                >
                  {e.label}
                </span>
                {e.meta && (
                  <span className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
                    {e.meta}
                  </span>
                )}
              </span>
              {e.blurb && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {e.blurb}
                </span>
              )}
            </div>
            <span className="mt-0.5 shrink-0 text-zinc-300 group-hover:text-zinc-500 dark:text-zinc-700 dark:group-hover:text-zinc-400">
              &rarr;
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
