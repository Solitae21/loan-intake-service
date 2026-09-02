import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { validate } from "../middleware/validate.js";
import { AppError } from "../errors.js";
import { idParamSchema } from "../schemas/common.js";
import {
  createApplicationSchema,
  listApplicationsQuerySchema,
  updateApplicationStatusSchema,
} from "./application.schema.js";
import { applicationService } from "../../domain/applications/application.service.js";
import type { AccessPayload } from "../../infra/tokens.js";

const actorOf = (req: { user?: AccessPayload }): AccessPayload => {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
};

export const applicationRouter = Router();

applicationRouter.use(requireAuth);

applicationRouter.post(
  "/",
  validate({ body: createApplicationSchema }),
  async (req, res) => {
    const application = await applicationService.submit(actorOf(req), req.body);
    res
      .status(202)
      .location(`${req.baseUrl}/${application.id}`)
      .json(application);
  },
);

applicationRouter.get(
  "/",
  validate({ query: listApplicationsQuerySchema }),
  async (req, res) => {
    res.json(await applicationService.list(actorOf(req), req.query));
  },
);

applicationRouter.get(
  "/:id",
  validate({ params: idParamSchema }),
  async (req, res) => {
    res.json(await applicationService.getById(actorOf(req), req.params.id));
  },
);

applicationRouter.patch(
  "/:id/status",
  validate({
    params: idParamSchema,
    body: updateApplicationStatusSchema,
  }),
  async (req, res) => {
    const application = await applicationService.transitionStatus(
      actorOf(req),
      req.params.id,
      req.body,
    );

    res.json(application);
  },
);
