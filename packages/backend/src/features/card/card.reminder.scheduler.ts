import { Cron } from "croner";
import { LogEvent } from "../../config/const.config.js";
import { logger } from "../../logger.js";
import { emailService } from "../email/email.service.js";
import { runDueReminders } from "./card.reminder.js";
import type { Db } from "./card.repo.js";

let current: Cron | null = null;

// Scan for due-card reminders every 5 minutes; idempotent via reminder_sent_at.
export function startReminderScheduler(db: Db): void {
  current?.stop();
  current = new Cron("*/5 * * * *", () => {
    runDueReminders(db, emailService)
      .then((sent) => {
        if (sent > 0) logger.info({ event: LogEvent.CardReminderSent, sent }, "card reminders sent");
      })
      .catch((err) => logger.error({ err }, "card reminder scan failed"));
  });
}
