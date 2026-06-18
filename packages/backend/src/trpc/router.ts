import { router } from "./trpc.js";
import { healthRouter } from "../features/health/health.router.js";
import { authRouter } from "../features/auth/auth.router.js";
import { rbacRouter } from "../features/rbac/rbac.router.js";
import { projectsRouter } from "../features/project/project.router.js";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  admin: rbacRouter,
  projects: projectsRouter,
});

export type AppRouter = typeof appRouter;
