import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocalityContext, localityHref } from "@/lib/locality";
import { findHearing, getLocality } from "@/lib/localities";
import type { Hearing } from "@/lib/localities";
import type { EnerGovAttachment, EnerGovPlan } from "@/lib/sources/energov";

type RouteParams = { planNumber: string };

export async function generateStaticParams(): Promise<RouteParams[]> {
  return [];
}

async function resolveHearing(planNumber: string): Promise<Hearing | null> {
  const nampa = getLocality("nampa");
  if (!nampa?.getHearings) return null;
  const feed = await nampa.getHearings();
  return (
    findHearing(feed.active, planNumber) ?? findHearing(feed.completed, planNumber)
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { planNumber } = await params;
  const hearing = await resolveHearing(planNumber);
  if (!hearing) return { title: planNumber };
  const title = hearing.appScope
    ? `${hearing.appScope} (${hearing.appId})`
    : `${hearing.appId} \u2014 ${hearing.appTypeLabel}`;
  return {
    title,
    description: `${hearing.appTypeLabel} \u00b7 ${hearing.appStatus} \u2014 filed with the City of Nampa.`,
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

  const hearing = await resolveHearing(planNumber);
  if (!hearing) notFound();

  const planId = hearing.energovPlanId;
  const client = nampa.energov;
  const [plan, attachments]: [EnerGovPlan | null, EnerGovAttachment[]] = planId
    ? await Promise.all([
        client.getPlan(planId).catch((err: unknown) => {
          console.error(`[nampa/plan] getPlan(${planId}) failed:`, err);
          return null;
        }),
        client.getPlanAttachments(planId).catch((err: unknown) => {
          console.error(`[nampa/plan] getPlanAttachments(${planId}) failed:`, err);
          return [] as EnerGovAttachment[];
        }),
      ])
    : [null, []];

  const ctx = await getLocalityContext();
  const onNampaSubdomain = ctx.onSubdomain && ctx.subdomainSlug === "nampa";
  const nampaHref = localityHref("nampa", "", ctx);
  const fallbackPortal =
    nampa.portalUrl ?? "https://nampaid-energovpub.tylerhost.net/Apps/SelfService";
  const portalUrl = planId
    ? nampa.energov.planPortalUrl(planId)
    : hearing.externalUrl ?? fallbackPortal;
  const attachmentsUrl = planId
    ? nampa.energov.planPortalUrl(planId, "attachments")
    : hearing.externalUrl ?? fallbackPortal;

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

        <PlanHeader hearing={hearing} plan={plan} />
        {plan ? <PlanStatusCard plan={plan} /> : <HearingStatusCard hearing={hearing} />}
        {plan && <PlanLocation plan={plan} />}
        <PlanDocuments
          attachments={attachments}
          attachmentsUrl={attachmentsUrl}
          hasPlan={Boolean(plan)}
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
  hearing,
  plan,
}: {
  hearing: Hearing;
  plan: EnerGovPlan | null;
}) {
  const derived = plan
    ? [plan.PlanType, plan.Description].filter(Boolean).join(" \u2014 ") ||
      plan.PlanNumber
    : hearing.appTypeLabel;
  const title = hearing.appScope || derived;
  const planNumber = plan?.PlanNumber ?? hearing.appId;
  const status = plan?.PlanStatus ?? hearing.appStatus;
  const address = plan?.MainAddress ?? null;
  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-3 py-1 font-mono text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {planNumber}
        </span>
        {status && (
          <span className="inline-flex items-center rounded-full border border-sky-300 bg-sky-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300">
            {status}
          </span>
        )}
        {hearing.appPhase !== "Other" && (
          <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {hearing.appPhase}
          </span>
        )}
      </div>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50 sm:text-4xl">
        {title}
      </h1>
      {address && (
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          {address.replace(/\r?\n/g, " \u00b7 ")}
        </p>
      )}
    </header>
  );
}

function HearingStatusCard({ hearing }: { hearing: Hearing }) {
  const candidates: Array<[string, string | null]> = [
    ["Type", hearing.appTypeLabel],
    ["Status", hearing.appStatus],
    ["Phase", hearing.appPhase === "Other" ? hearing.appPhaseRaw : hearing.appPhase],
    ["Acres", hearing.appAcres != null ? hearing.appAcres.toFixed(2) : null],
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
  hasPlan,
}: {
  attachments: EnerGovAttachment[];
  attachmentsUrl: string;
  hasPlan: boolean;
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
      {!hasPlan ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No linked case record in the City of Nampa portal yet. Follow the
          portal link above for the latest documents.
        </p>
      ) : attachments.length === 0 ? (
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
