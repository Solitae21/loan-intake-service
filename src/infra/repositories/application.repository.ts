import { Prisma } from "../../generated/prisma/client.js";
import type { Application } from "../../generated/prisma/client.js";
import type { ApplicationStatus } from "../../generated/prisma/enums.js";
import { prisma } from "../prisma.js";

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

const toWhere = (filter: ApplicationFilter): Prisma.ApplicationWhereInput => {
  const where: Prisma.ApplicationWhereInput = {};
  if (filter.applicantId !== undefined) where.applicantId = filter.applicantId;
  if (filter.status !== undefined) where.status = filter.status;
  return where;
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
): Promise<Application> => {
  const data: Prisma.ApplicationUpdateInput = { status: changes.status };
  if (changes.score !== undefined) data.score = changes.score;
  if (changes.decidedAt !== undefined) data.decidedAt = changes.decidedAt;
  return prisma.application.update({ where: { id }, data });
};

export type ApplicationRepository = {
  create(data: CreateApplicationData): Promise<Application>;
  findById(id: string): Promise<Application | null>;
  list(
    filter: ApplicationFilter,
    page: PageRequest,
  ): Promise<Page<Application>>;
  updateStatus(id: string, changes: StatusChange): Promise<Application>;
};

export const applicationRepository: ApplicationRepository = {
  create,
  findById,
  list,
  updateStatus,
};
