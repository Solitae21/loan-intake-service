import { z } from "zod";
import { logger } from "../../infra/logger.js";
import { applicationRepository } from "../../infra/repositories/application.repository.js";
import { scoreApplication } from "../../domain/applications/scoring.js";
import { APPLICATION_SUBMITTED } from "../../domain/applications/application.service.js";
import { config } from "../../infra/config.js";

const log = logger.child({ handler: APPLICATION_SUBMITTED });

const submittedEvent = z.object({
  applicationId: z.string(),
  occuredAt: z.string(),
});

export const handleSubmitted = async (
  messageId: string,
  raw: unknown,
): Promise<void> => {
  const event = submittedEvent.parse(raw);

  if (config.FORCE_SCORING_FAILURE) {
    throw new Error("forced scoring failure");
  }

  const applicationId = event.applicationId;

  const result = await applicationRepository.decideOnce(
    { messageId, eventType: APPLICATION_SUBMITTED, applicationId },
    (application) => {
      const { score, status, breakdown } = scoreApplication({
        amount: application.amount.toNumber(),
        term: application.term,
        monthlyIncome: application.monthlyIncome.toNumber(),
        purpose: application.purpose,
      });

      log.debug({ applicationId, score, status, breakdown }, "score breakdown");

      return {
        status,
        score,
        ...(status === "NEEDS_REVIEW" ? {} : { decidedAt: new Date() }),
      };
    },
  );

  switch (result.outcome) {
    case "DECIDED":
      log.info({ messageId, applicationId }, "application scored");
      return;

    case "DUPLICATE":
      log.info(
        { messageId, applicationId },
        "event already processed - skipping",
      );
      return;

    case "ALREADY_DECIDED":
      log.info(
        { messageId, applicationId, status: result.status },
        "application no longer pending - skipping",
      );
      return;

    case "LOST_RACE":
      log.info({ messageId, applicationId }, "decided concurrently - skipping");
      return;

    case "NOT_FOUND":
      log.warn(
        { messageId, applicationId },
        "application not found - dropping",
      );
      return;
  }
};
