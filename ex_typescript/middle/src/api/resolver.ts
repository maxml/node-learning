import { Context } from "../security/context";
import { Authenticated } from "../security/decorator";
import { Role } from "./model";

export class ApiResolver {
  @Authenticated([Role.USER])
  public sayHello(_: {}, args: { name: string }, context: Context) {
    return `Hello ${args.name}`;
  }
}
