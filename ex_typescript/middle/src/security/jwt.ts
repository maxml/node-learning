import * as jwt from "jsonwebtoken";
import { Role } from "../api/model";
import { config } from "../config";

export class Requester {
  username: string;
  role: Role;
}

export const generateToken = (): String => {
  return jwt.sign({ username: "admin", role: Role.ADMIN }, config.auth.secret);
};

export const validateToken = (token: string): Requester => {
  return jwt.verify(token, config.auth.secret) as Requester;
};
