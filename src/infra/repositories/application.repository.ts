import { Prisma } from "../../generated/prisma/client.js";
import type { Application } from "../../generated/prisma/client.js";
import type { ApplicationStatus } from "../../generated/prisma/enums.js";
import { assertTransition } from "../../domain/applications/application-state.js";
import { prisma } from "../prisma.js";

export type OutboxDraft = {
  exchange: string;
  routingKey: string;
  payload: Prisma.InputJsonValue;
};

export type CreateApplicationData = {
  applicantId: string;
  amount: string;
  term: number;
  monthlyIncome: string;
  purpose: string;
};

export type ApplicationFilter = {
  applicantId?: string;
  status?: ApplicationStatus;
};

export type PageRequest = {
  skip: number;
  take: number;
};

export type Page<T> = {
  rows: T[];
  total: number;
};

export type StatusChange = {
  status: ApplicationStatus;
  score?: number;
  decidedAt?: Date;
};

export type AuditContext = {
  actorId: string;
  reason: string;
};

export type Decision = StatusChange & {
  reason: string;
};

export type EventClaim = {
  messageId: string;
  eventType: string;
  applicationId: string;
  actorId: string;
};

export type DecisionResult =
  | { outcome: "DECIDED" }
  | { outcome: "DUPLICATE" }
  | { outcome: "NOT_FOUND" }
  | { outcome: "ALREADY_DECIDED"; status: ApplicationStatus }
  | { outcome: "LOST_RACE" };

const UNIQUE_VIOLATION = "P2002";

const isDuplicateClaim = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === UNIQUE_VIOLATION;

const toWhere = (
  filter: ApplicationFilter,
): Prisma.ApplicationWhereInput => {
  const where: Prisma.ApplicationWhereInput = {};

  if (filter.applicantId !== undefined) {
    where.applicantId = filter.applicantId;
  }

  if (filter.status !== undefined) {
    where.status = filter.status;
  }

  return where;
};

const toMutation = (
  changes: StatusChange,
): Prisma.ApplicationUpdateManyMutationInput => {
  const data: Prisma.ApplicationUpdateManyMutationInput = {
    status: changes.status,
  };

  if (changes.score !== undefined) {
    data.score = changes.score;
  }

  if (changes.decidedAt !== undefined) {
    data.decidedAt = changes.decidedAt;
  }

  return data;
};

const create = (data: CreateApplicationData): Promise<Application> =>
  prisma.application.create({ data });

const findById = (id: string): Promise<Application | null> =>
  prisma.application.findUnique({ where: { id } });

const list = async (
  filter: ApplicationFilter,
  page: PageRequest,
): Promise<Page<Application>> => {
  const where = toWhere(filter);

  const [rows, total] = await prisma.$transaction([
    prisma.application.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: page.skip,
      take: page.take,
    }),
    prisma.application.count({ where }),
  ]);

  return { rows, total };
};

const updateStatus = (
  id: string,
  changes: StatusChange,
  audit: AuditContext,
): Promise<Application> =>
  prisma.$transaction(async (tx) => {
    const current = await tx.application.findUniqueOrThrow({
      where: { id },
    });

    assertTransition(current.status, changes.status);

    const data: Prisma.ApplicationUpdateInput = {
      status: changes.status,
    };

    if (changes.score !== undefined) {
      data.score = changes.score;
    }

    if (changes.decidedAt !== undefined) {
      data.decidedAt = changes.decidedAt;
    }

    const updated = await tx.application.update({
      where: { id },
      data,
    });

    await tx.auditLogs.create({
      data: {
        applicationId: current.id,
        actorId: audit.actorId,
        fromStatus: current.status,
        toStatus: changes.status,
        reason: audit.reason,
      },
    });

    return updated;
  });

const createWithOutbox = (
  data: CreateApplicationData,
  event: (row: Application) => OutboxDraft,
): Promise<Application> =>
  prisma.$transaction(async (tx) => {
    const row = await tx.application.create({ data });

    await tx.outboxMessage.create({
      data: event(row),
    });

    return row;
  });

const decideOnce = async (
  claim: EventClaim,
  decide: (row: Application) => Decision,
): Promise<DecisionResult> => {
  try {
    return await prisma.$transaction(
      async (tx): Promise<DecisionResult> => {
        await tx.processedEvent.create({
          data: {
            messageId: claim.messageId,
            eventType: claim.eventType,
          },
        });

        const row = await tx.application.findUnique({
          where: { id: claim.applicationId },
        });

        if (!row) {
          return { outcome: "NOT_FOUND" };
        }

        if (row.status !== "PENDING") {
          return {
            outcome: "ALREADY_DECIDED",
            status: row.status,
          };
        }

        const changes = decide(row);

        assertTransition(row.status, changes.status);

        const { count } = await tx.application.updateMany({
          where: {
            id: row.id,
            status: row.status,
          },
          data: toMutation(changes),
        });

        if (count !== 1) {
          return { outcome: "LOST_RACE" };
        }

        await tx.auditLogs.create({
          data: {
            applicationId: row.id,
            actorId: claim.actorId,
            fromStatus: row.status,
            toStatus: changes.status,
            reason: changes.reason,
          },
        });

        return { outcome: "DECIDED" };
      },
    );
  } catch (error) {
    if (isDuplicateClaim(error)) {
      return { outcome: "DUPLICATE" };
    }

    throw error;
  }
};

export type ApplicationRepository = {
  create(data: CreateApplicationData): Promise<Application>;

  createWithOutbox(
    data: CreateApplicationData,
    event: (row: Application) => OutboxDraft,
  ): Promise<Application>;

  findById(id: string): Promise<Application | null>;

  list(
    filter: ApplicationFilter,
    page: PageRequest,
  ): Promise<Page<Application>>;

  updateStatus(
    id: string,
    changes: StatusChange,
    audit: AuditContext,
  ): Promise<Application>;

  decideOnce(
    claim: EventClaim,
    decide: (row: Application) => Decision,
  ): Promise<DecisionResult>;
};

export const applicationRepository: ApplicationRepository = {
  create,
  createWithOutbox,
  findById,
  list,
  updateStatus,
  decideOnce,
};