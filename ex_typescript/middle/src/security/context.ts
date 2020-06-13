import { Request, Response } from "express";
import { ExecutionParams } from "subscriptions-transport-ws";
import { Requester, validateToken } from "./jwt";

export class Context {
  requester: Requester;
}

export const securityContextHandler = (req: {
  request: Request;
  response: Response;
  connection: ExecutionParams;
}): Context => {
  const regex = /Bearer\s(\S+)/g;
  const matches = regex.exec(req.request.headers.authorization);
  if (matches && matches.length === 2) {
    const requester = validateToken(matches[1]);
    return { requester };
  }
};
