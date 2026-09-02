import { AppError } from "../../api/errors.js";
import type {
  CreateApplicationInput,
  ListApplicationsQuery,
  UpdateApplicationStatusInput,
} from "../../api/applications/application.schema.js";
import type { Application } from "../../generated/prisma/client.js";
import type { AccessPayload } from "../../infra/tokens.js";
import {
  applicationRepository,
  type ApplicationFilter,
  type ApplicationRepository,
} from "../../infra/repositories/application.repository.js";
import { LOANS_EXCHANGE } from "../../infra/messaging/rabbit.js";
import { notifyOutbox } from "../../infra/messaging/outbox-relay.js";

export const APPLICATION_SUBMITTED = "application.submitted";

const toResponse = (row: Application) => ({
  id: row.id,
  applicantId: row.applicantId,
  amount: row.amount.toFixed(2),
  term: row.term,
  monthlyIncome: row.monthlyIncome.toFixed(2),
  purpose: row.purpose,
  status: row.status,
  score: row.score,
  decidedAt: row.decidedAt,
  createdAt: row.createdAt,
});

const seesEveryApplication = (actor: AccessPayload): boolean =>
  actor.role !== "APPLICANT";

export const createApplicationService = (repo: ApplicationRepository) => ({
  submit: async (actor: AccessPayload, input: CreateApplicationInput) => {
    const row = await repo.createWithOutbox(
      {
        applicantId: actor.sub,
        amount: input.amount.toFixed(2),
        term: input.term,
        monthlyIncome: input.monthlyIncome.toFixed(2),
        purpose: input.purpose,
      },
      (application) => ({
        exchange: LOANS_EXCHANGE,
        routingKey: APPLICATION_SUBMITTED,
        payload: {
          applicationId: application.id,
          occuredAt: application.createdAt.toISOString(),
        },
      }),
    );

    notifyOutbox();
    return toResponse(row);
  },

  list: async (actor: AccessPayload, query: ListApplicationsQuery) => {
    const filter: ApplicationFilter = {};

    if (!seesEveryApplication(actor)) filter.applicantId = actor.sub;
    if (query.status !== undefined) filter.status = query.status;

    const { rows, total } = await repo.list(filter, {
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return {
      data: rows.map(toResponse),
      page: query.page,
      limit: query.limit,
      total,
    };
  },

  getById: async (actor: AccessPayload, id: string) => {
    const row = await repo.findById(id);

    if (!row) throw AppError.notFound("Application not found");

    if (!seesEveryApplication(actor) && row.applicantId !== actor.sub) {
      throw AppError.forbidden();
    }

    return toResponse(row);
  },

  transitionStatus: async (
    actor: AccessPayload,
    id: string,
    input: UpdateApplicationStatusInput,
  ) => {
    if (actor.role === "APPLICANT") {
      throw AppError.forbidden(
        "Only officers and administrators can change application status",
      );
    }

    const application = await repo.findById(id);

    if (!application) {
      throw AppError.notFound("Application not found");
    }

    const isFinalStatus =
      input.status === "APPROVED" || input.status === "REJECTED";

    const updated = await repo.updateStatus(
      id,
      {
        status: input.status,
        ...(isFinalStatus ? { decidedAt: new Date() } : {}),
      },
      {
        actorId: actor.sub,
        reason: input.reason,
      },
    );

    return toResponse(updated);
  },
});

export const applicationService = createApplicationService(
  applicationRepository,
);
