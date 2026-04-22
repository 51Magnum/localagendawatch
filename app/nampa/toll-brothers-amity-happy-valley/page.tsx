import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Toll Brothers — 500 homes at Amity & Happy Valley",
  description:
    "Toll Brothers has noticed a neighborhood meeting for a proposed 500-home, 137-acre residential development at the northeast corner of E. Amity Ave and S. Happy Valley Rd in Nampa, Idaho.",
};

export default function Page() {
  return (
    <div className="flex flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-12">
        <nav className="text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="hover:text-black dark:hover:text-zinc-50">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/nampa" className="hover:text-black dark:hover:text-zinc-50">Nampa</Link>
        </nav>

        <header className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
            Neighborhood meeting notice
          </span>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50 sm:text-4xl">
            Toll Brothers proposes 500-home development at Amity &amp; Happy Valley
          </h1>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            A 137-acre detached single-family residential community with a pool and
            sports courts, on the northeast corner of E. Amity Ave and S. Happy
            Valley Rd in Nampa, Idaho.
          </p>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Neighborhood meeting
          </h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Date</dt>
              <dd className="mt-1 font-medium text-black dark:text-zinc-50">Tuesday, March 24, 2026</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Time</dt>
              <dd className="mt-1 font-medium text-black dark:text-zinc-50">5:30 &ndash; 7:30 PM</dd>
              <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Open house format</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Location</dt>
              <dd className="mt-1 font-medium text-black dark:text-zinc-50">Columbia High School Library</dd>
              <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">301 S Happy Valley Rd, Nampa, ID 83687</dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Where</h2>
          <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Northeast corner of E. Amity Ave and S. Happy Valley Rd. Canyon County
            parcel numbers R3066500000 and R3066301000.
          </p>
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <iframe
              title="Site location map"
              src="https://www.google.com/maps?q=E+Amity+Ave+and+S+Happy+Valley+Rd,+Nampa,+ID&output=embed"
              width="100%"
              height="360"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">What&rsquo;s being proposed</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow label="Project type" value="Detached single-family residential" />
            <DetailRow label="Approx. homes" value="500" />
            <DetailRow label="Acreage" value="137 acres" />
            <DetailRow label="Amenities" value="Pool, sports courts" />
            <DetailRow label="Anticipated zoning" value="Mix of RS-4, RS-6, and RS-7" />
            <DetailRow label="Build-out" value="Approx. 5 years; construction expected to begin in 2027" />
          </dl>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">City of Nampa applications planned</h2>
          <ul className="list-disc space-y-1 pl-5 text-base leading-7 text-zinc-700 dark:text-zinc-300">
            <li>Annexation</li>
            <li>Zoning</li>
            <li>Preliminary plat</li>
          </ul>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            These are anticipated applications per the developer&rsquo;s notice; City of
            Nampa review dates have not yet been set.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Concept plan</h2>
          <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-100 p-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            A concept plan was included with the developer&rsquo;s notice. Image coming soon.
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Meeting venue</h2>
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <iframe
              title="Meeting venue map"
              src="https://www.google.com/maps?q=Columbia+High+School,+301+S+Happy+Valley+Rd,+Nampa,+ID+83687&output=embed"
              width="100%"
              height="320"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block"
            />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Developer contact</h2>
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p className="font-medium text-black dark:text-zinc-50">Kyle Prewett</p>
            <p className="text-zinc-600 dark:text-zinc-400">Land Entitlement Manager, Toll Brothers</p>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">3103 W Sheryl Dr, #100, Meridian, ID 83642</p>
            <p className="mt-3">
              <a href="tel:+12085763625" className="text-black underline underline-offset-2 dark:text-zinc-50">(208) 576-3625</a>
              <span className="mx-2 text-zinc-400">&middot;</span>
              <a href="mailto:kprewett@tollbrothers.com" className="text-black underline underline-offset-2 dark:text-zinc-50">kprewett@tollbrothers.com</a>
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <p>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Source:</span>{" "}
            Notice of Neighborhood Meeting from Toll Brothers, dated March 13, 2026.
          </p>
          <p>
            LocalAgendaWatch is an independent public-awareness project and is not affiliated with Toll Brothers or the City of Nampa.
          </p>
        </section>
      </main>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 font-medium text-black dark:text-zinc-50">{value}</dd>
    </div>
  );
}
