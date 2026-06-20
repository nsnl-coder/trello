import { z } from "zod";

// Browser-safe public config only (NEXT_PUBLIC_*). No secrets here.
const schema = z.object({
  appUrl: z.string().url(),
  siteUrl: z.string().url(),
});

export const env = schema.parse({
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://dev-app.trello-clone.shop",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://dev.trello-clone.shop",
});
