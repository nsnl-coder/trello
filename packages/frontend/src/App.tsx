import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "./lib/trpc";

export function App() {
  const trpc = useTRPC();
  const ping = useQuery(trpc.health.ping.queryOptions());
  const hello = useQuery(trpc.health.hello.queryOptions({ name: "Trello" }));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-800">
      <h1 className="text-3xl font-bold">Trello Clone</h1>
      <p className="text-sm">
        Backend status:{" "}
        <span className="font-mono">{ping.data?.status ?? "..."}</span>
      </p>
      <p className="text-lg">{hello.data?.message ?? "loading..."}</p>
    </div>
  );
}
