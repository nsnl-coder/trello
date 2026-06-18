import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { env } from "./config/env.config.js";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/context.js";

const app = express();

app.use(
  "/trpc",
  createExpressMiddleware({ router: appRouter, createContext }),
);

app.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
});
