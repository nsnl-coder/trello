import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  KanbanSquare,
  MousePointerClick,
  ShieldCheck,
  FolderKanban,
  Users,
  ArrowRight,
} from "lucide-react";

// Public marketing home. Brand tokens match the app: indigo-600 accent, slate
// neutrals, lucide icons. Light theme locked. Motion is CSS-only (hover lifts),
// so it degrades gracefully and needs no animation dependency.

const previewColumns = [
  {
    name: "To do",
    cards: ["Design auth flow", "Draft board schema"],
  },
  {
    name: "In progress",
    cards: ["Wire tRPC client", "Card drag and drop"],
  },
  {
    name: "Done",
    cards: ["Project CRUD", "RBAC for admins"],
  },
];

const features = [
  {
    icon: FolderKanban,
    title: "Projects that group your work",
    body: "Spin up a project, invite the right people, and keep every board for that effort in one place.",
    tint: "bg-indigo-50",
  },
  {
    icon: MousePointerClick,
    title: "Drag and drop that feels instant",
    body: "Move cards across lists with pointer and keyboard support. Order is saved the moment you let go.",
    tint: "bg-white",
  },
  {
    icon: ShieldCheck,
    title: "Roles and permissions built in",
    body: "Grant per-project access and lean on an admin area for org-wide roles. No bolt-on later.",
    tint: "bg-white",
  },
  {
    icon: Users,
    title: "Access you can reason about",
    body: "Board and project access panels show exactly who can view and edit, with no guessing.",
    tint: "bg-slate-50",
  },
];

const steps = [
  {
    verb: "Create a project",
    body: "Name the effort and set who can join. Boards live underneath it.",
  },
  {
    verb: "Organize into boards",
    body: "Add lists and cards, then drag them into the order that matches reality.",
  },
  {
    verb: "Ship together",
    body: "Move cards to Done, hand off with clear roles, and keep momentum visible.",
  },
];

export function HomePage() {
  return (
    <div className="min-h-[100dvh] bg-white text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-1.5 font-semibold text-slate-900">
            <LayoutDashboard className="h-5 w-5 text-indigo-600" />
            Trello Clone
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:text-slate-900"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 motion-safe:hover:-translate-y-px"
            >
              Start for free
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero: asymmetric split, real component preview on the right */}
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-16 pb-20 lg:grid-cols-2 lg:pt-24">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
              Boards, lists, and cards for work that actually moves.
            </h1>
            <p className="mt-5 max-w-[60ch] text-lg leading-relaxed text-slate-600">
              Organize projects into boards, drag cards to done, and give every
              teammate exactly the access they need.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white transition hover:bg-indigo-700 motion-safe:hover:-translate-y-px"
              >
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-800 transition hover:bg-slate-50"
              >
                Log in
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-1.5 px-1 text-sm font-medium text-slate-500">
              <KanbanSquare className="h-4 w-4 text-indigo-600" />
              Product board
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {previewColumns.map((col) => (
                <div key={col.name} className="rounded-xl bg-white p-3 shadow-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {col.name}
                  </p>
                  <div className="flex flex-col gap-2">
                    {col.cards.map((c) => (
                      <div
                        key={c}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features: bento with rhythm and tinted cells */}
        <section className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-20">
            <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Everything you need to run the work, nothing you don't.
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {features.map((f) => (
                <div
                  key={f.title}
                  className={`rounded-2xl border border-slate-200 p-6 transition motion-safe:hover:-translate-y-0.5 ${f.tint}`}
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {f.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works: numbered three-step row */}
        <section className="mx-auto max-w-7xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            From idea to done in three moves.
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.verb} className="border-t-2 border-indigo-600 pt-5">
                <span className="text-sm font-semibold text-indigo-600">
                  0{i + 1}
                </span>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  {s.verb}
                </h3>
                <p className="mt-2 leading-relaxed text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="bg-indigo-600">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between">
            <h2 className="max-w-[24ch] text-3xl font-semibold tracking-tight text-white">
              Start your first board in under a minute.
            </h2>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-indigo-700 transition hover:bg-indigo-50 motion-safe:hover:-translate-y-px"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <LayoutDashboard className="h-4 w-4 text-indigo-600" />
            Trello Clone
          </span>
          <div className="flex items-center gap-5">
            <Link to="/login" className="hover:text-slate-900">
              Log in
            </Link>
            <Link to="/register" className="hover:text-slate-900">
              Start for free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
