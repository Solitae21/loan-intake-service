import { z } from "zod";
import { logger } from "../../infra/logger.js";
import { applicationRepository } from "../../infra/repositories/application.repository.js";
import { scoreApplication } from "../../domain/applications/scoring.js";
import { config } from "../../infra/config.js";

const log = logger.child({ handler: "application.submitted" });

const submittedEvent = z.object({
  applicationId: z.string(),
  occuredAt: z.string(),
});

export const handleSubmitted = async (raw: unknown): Promise<void> => {
  const event = submittedEvent.parse(raw);

  if (config.FORCE_SCORING_FAILURE) {
    throw new Error("forced scoring failure");
  }

  const application = await applicationRepository.findById(event.applicationId);

  if (!application) {
    log.warn(
      { applicationId: event.applicationId },
      "application not found - dropping",
    );
    return;
  }

  if (application.status !== "PENDING") {
    log.info(
      {
        applicationId: application.id,
        status: application.status,
      },
      "already processed - skipping",
    );
    return;
  }

  const { score, status } = scoreApplication({
    amount: application.amount.toNumber(),
    term: application.term,
    monthlyIncome: application.monthlyIncome.toNumber(),
  });

  await applicationRepository.updateStatus(application.id, {
    status,
    score,
    ...(status === "NEEDS_REVIEW" ? {} : { decidedAt: new Date() }),
  });
};
