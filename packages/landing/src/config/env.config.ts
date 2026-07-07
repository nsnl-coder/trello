import { z } from "zod";

// Deployment URLs, read from the SERVER env at runtime (the root layout is
// force-dynamic, so nothing is prerendered at build). No NEXT_PUBLIC_* — those
// are inlined into the bundle at build time and would bake the tier into the
// image; these values come from docker-compose.yml instead, so one image
// serves every tier. Localhost defaults cover `pnpm dev`.
const schema = z.object({
  appUrl: z.string().url(),
  siteUrl: z.string().url(),
});

export const env = schema.parse({
  appUrl: process.env.APP_URL ?? "http://localhost:5173",
  siteUrl: process.env.SITE_URL ?? "http://localhost:3000",
});
