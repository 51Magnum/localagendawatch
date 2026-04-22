export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-start gap-6 px-8 py-24">
        <p className="font-mono text-sm uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          LocalAgendaWatch
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50 sm:text-5xl">
          Keep an eye on your local government.
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Track upcoming meeting agendas from city councils, school boards, and
          other public bodies in your community &mdash; all in one place.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Coming soon.
        </p>
      </main>
    </div>
  );
}
