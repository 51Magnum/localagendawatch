import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocalityContext, localityHref } from "@/lib/locality";
import { findTrackedPlan, getLocality } from "@/lib/localities";
import type { EnerGovAttachment, EnerGovPlan } from "@/lib/sources/energov";

type RouteParams = { planNumber: string };

export async function generateStaticParams(): Promise<RouteParams[]> {
  const nampa = getLocality("nampa");
  if (!nampa) return [];
  return nampa.tracked
    .filter((t) => t.kind === "energov-plan")
    .map((t) => ({ planNumber: t.planNumber }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { planNumber } = await params;
  const nampa = getLocality("nampa");
  const tracked = nampa ? findTrackedPlan(nampa, planNumber) : null;
  if (!tracked) return { title: planNumber };
  const title = tracked.label ?? `${planNumber} — Nampa plan`;
  return {
    title,
    description:
      tracked.blurb ??
      `${planNumber} \u2014 land-use application filed with the City of Nampa.`,
  };
}

export default async function PlanPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { planNumber } = await params;
  const nampa = getLocality("nampa");
  if (!nampa || !nampa.energov) notFound();
  const tracked = findTrackedPlan(nampa, planNumber);
  if (!tracked) notFound();

  const [plan, attachments] = await Promise.all([
    nampa.energov.getPlan(tracked.planId),
    nampa.energov.getPlanAttachments(tracked.planId),
  ]);

  if (!plan) notFound();

  const ctx = await getLocalityContext();
  const onNampaSubdomain = ctx.onSubdomain && ctx.subdomainSlug === "nampa";
  const nampaHref = localityHref("nampa", "", ctx);
  const portalUrl = nampa.energov.planPortalUrl(tracked.planId);
  const attachmentsUrl = nampa.energov.planPortalUrl(tracked.planId, "attachments");

  return (
    <div className="flex flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-12">
        <nav className="text-sm text-zinc-500 dark:text-zinc-400">
          {!onNampaSubdomain && (
            <>
              <Link href="/" className="hover:text-black dark:hover:text-zinc-50">Home</Link>
              <span className="mx-2">/</span>
            </>
          )}
          <Link href={nampaHref} className="hover:text-black dark:hover:text-zinc-50">Nampa</Link>
        </nav>

        <PlanHeader plan={plan} tracked={tracked} />
        <PlanStatusCard plan={plan} />
        <PlanLocation plan={plan} />
        <PlanDocuments
          attachments={attachments}
          attachmentsUrl={attachmentsUrl}
        />

        <footer className="border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <p>
            Live data from the{" "}
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              City of Nampa Self-Service Portal
            </a>
            . Plan details refresh hourly. Local Agenda Watch is an independent
            tracker and is not affiliated with the City of Nampa or Tyler
            Technologies.
          </p>
        </footer>
      </main>
    </div>
  );
}

function PlanHeader({
  plan,
  tracked,
}: {
  plan: EnerGovPlan;
  tracked: { label?: string; blurb?: string };
}) {
  const derived =
    [plan.PlanType, plan.Description].filter(Boolean).join(" \u2014 ") ||
    plan.PlanNumber;
  const title = tracked.label ?? derived;
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-3 py-1 font-mono text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {plan.PlanNumber}
        </span>
        <span className="inline-flex items-center rounded-full border border-sky-300 bg-sky-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300">
          {plan.PlanStatus}
        </span>
      </div>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50 sm:text-4xl">
        {title}
      </h1>
      {plan.MainAddress && (
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          {plan.MainAddress.replace(/\r?\n/g, " \u00b7 ")}
        </p>
      )}
    </header>
  );
}

function PlanStatusCard({ plan }: { plan: EnerGovPlan }) {
  const candidates: Array<[string, string | null]> = [
    ["Type", plan.PlanType],
    ["Work class", plan.WorkClassName],
    ["Applied", formatDate(plan.ApplyDate)],
    ["Last action", formatDate(plan.CompleteDate)],
    ["Assigned planner", plan.AssignedTo],
    ["District", plan.DistrictName],
  ];
  const items = candidates.filter(
    (entry): entry is [string, string] => entry[1] != null && entry[1] !== ""
  );

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Case status
      </h2>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{k}</dt>
            <dd className="mt-1 font-medium text-black dark:text-zinc-50">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PlanLocation({ plan }: { plan: EnerGovPlan }) {
  if (!plan.MainAddress && !plan.MainParcelNumber) return null;
  const addrQuery = encodeURIComponent(
    (plan.MainAddress ?? "").replace(/\r?\n/g, ", ")
  );
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Where</h2>
      {plan.MainAddress && (
        <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
          {plan.MainAddress.split(/\r?\n/).map((line, i) => (
            <span key={i} className="block">{line}</span>
          ))}
        </p>
      )}
      {plan.MainParcelNumber && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Canyon County parcel <span className="font-mono">{plan.MainParcelNumber}</span>
        </p>
      )}
      {addrQuery && (
        <p>
          <a
            href={`https://www.google.com/maps?q=${addrQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline underline-offset-2"
          >
            View on Google Maps
          </a>
        </p>
      )}
    </section>
  );
}

function PlanDocuments({
  attachments,
  attachmentsUrl,
}: {
  attachments: EnerGovAttachment[];
  attachmentsUrl: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Documents
        </h2>
        <a
          href={attachmentsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline underline-offset-2"
        >
          Open in portal
        </a>
      </div>
      {attachments.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No public attachments on file yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {attachments.map((a) => (
            <li key={a.AttachmentID} className="flex flex-col gap-1 px-4 py-3">
              <span className="font-medium text-black dark:text-zinc-50">
                {a.Notes || a.FileName}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{a.FileName}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Individual file downloads open through the City of Nampa portal.
      </p>
    </section>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
