import type { Metadata } from "next";
import Link from "next/link";
import { getLocalityContext, localityHref } from "@/lib/locality";
import { getLocality } from "@/lib/localities";
import type { TrackedItem } from "@/lib/localities";

export const metadata: Metadata = {
  title: "Nampa, Idaho",
  description:
    "Proposed developments and municipal items we're tracking in Nampa, Idaho.",
};

type TrackedEntry = {
  key: string;
  href: string;
  label: string;
  blurb?: string;
};

function trackedEntry(
  item: TrackedItem,
  ctx: Awaited<ReturnType<typeof getLocalityContext>>
): TrackedEntry {
  if (item.kind === "editorial") {
    return {
      key: `editorial:${item.slug}`,
      href: localityHref("nampa", `/${item.slug}`, ctx),
      label: item.label,
      blurb: item.blurb,
    };
  }
  return {
    key: `plan:${item.planNumber}`,
    href: localityHref("nampa", `/plan/${item.planNumber}`, ctx),
    label: item.label ?? item.planNumber,
    blurb: item.blurb,
  };
}

export default async function NampaHub() {
  const ctx = await getLocalityContext();
  const onNampaSubdomain = ctx.onSubdomain && ctx.subdomainSlug === "nampa";
  const nampa = getLocality("nampa");
  const entries: TrackedEntry[] = (nampa?.tracked ?? []).map((t) =>
    trackedEntry(t, ctx)
  );

  return (
    <div className="flex flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-16">
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
            Proposed developments and municipal items we&rsquo;re tracking.
          </p>
        </header>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Currently tracking
          </h2>
          <ul className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {entries.map((e) => (
              <li key={e.key}>
                <Link
                  href={e.href}
                  className="flex flex-col gap-1 py-5 hover:text-black dark:hover:text-zinc-50"
                >
                  <span className="font-medium text-black dark:text-zinc-50">
                    {e.label}
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
      </main>
    </div>
  );
}
