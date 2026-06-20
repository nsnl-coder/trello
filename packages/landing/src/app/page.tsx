import { env } from "@/config/env.config";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-950 px-6 text-center text-neutral-100">
      <span className="rounded-full border border-neutral-800 px-3 py-1 text-xs uppercase tracking-widest text-neutral-400">
        Trello Clone
      </span>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">
        Organize anything, together.
      </h1>
      <p className="max-w-xl text-balance text-neutral-400 sm:text-lg">
        Boards, lists, and cards to keep your team in sync. Plan work, track
        progress, and ship faster.
      </p>
      <a
        href={env.appUrl}
        className="rounded-md bg-white px-6 py-3 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
      >
        Open the app
      </a>
    </main>
  );
}
