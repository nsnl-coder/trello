import bcrypt from "bcryptjs";
import { appDb } from "../db/index.js";
import { env } from "../config/env.config.js";

// Idempotent dev seed: verified test accounts for manual testing.
const ACCOUNTS = [
  { email: "test@example.com", password: "Password123" },
  { email: "test2@example.com", password: "Password123" },
];

for (const acc of ACCOUNTS) {
  const password_hash = await bcrypt.hash(acc.password, env.BCRYPT_COST);
  await appDb
    .insertInto("users")
    .values({ email: acc.email, password_hash, email_verified: true })
    .onConflict((oc) =>
      oc.column("email").doUpdateSet({ password_hash, email_verified: true }),
    )
    .execute();
  console.log(`Seeded ${acc.email} / ${acc.password} (verified)`);
}

await appDb.destroy();
