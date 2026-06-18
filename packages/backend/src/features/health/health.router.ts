import { z } from "zod";
import { router, publicProcedure } from "../../trpc/trpc.js";

export const healthRouter = router({
  ping: publicProcedure.query(() => ({ status: "ok", time: new Date() })),
  hello: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .query(({ input }) => ({ message: `Hello, ${input.name}!` })),
});
