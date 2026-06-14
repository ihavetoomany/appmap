import Link from "next/link";
import { checkDbConnection } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dbConnected = process.env.DATABASE_URL
    ? await checkDbConnection()
    : false;

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
      <main className="flex w-full max-w-lg flex-col items-center gap-8 rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            AppMap
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            App Map Editor
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Design app flows on an infinite canvas with views, section items, and
            variants.
          </p>
        </div>

        <Link
          href="/editor"
          className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Open Editor
        </Link>

        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
            dbConnected
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              dbConnected ? "bg-emerald-500" : "bg-amber-500"
            }`}
            aria-hidden
          />
          {dbConnected
            ? "Neon Postgres connected"
            : "Database not configured locally"}
        </div>
      </main>
    </div>
  );
}
