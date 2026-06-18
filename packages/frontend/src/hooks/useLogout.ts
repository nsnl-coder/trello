import { flushSync } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTRPC } from "../lib/trpc";
import { useAuthStore } from "./useAuthStore";
import { useToastStore } from "./useToastStore";

// Shared sign-out: clears the session, confirms with a toast, and returns the
// user to the public home page.
export function useLogout() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const addToast = useToastStore((s) => s.add);
  const logout = useMutation(trpc.auth.logout.mutationOptions());

  const run = () =>
    logout.mutate(
      {},
      {
        onSettled: () => {
          addToast("Signed out successfully");
          // Commit the cleared session first; ProtectedRoute reacts to it, then
          // our redirect to the public home wins as the final navigation.
          flushSync(() => clearAuth());
          navigate("/", { replace: true });
        },
      },
    );

  return { run, pending: logout.isPending };
}
