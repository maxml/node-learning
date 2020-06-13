import { Role } from "../api/model";
import { Context } from "./context";

export function Authenticated(roles: Role[]) {
  return function (
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalValue = descriptor.value;

    // tslint:disable-next-line:no-any
    descriptor.value = function (...args: any[]) {
      if (args.length !== 4 && !(args[2] instanceof Context)) {
        throw new Error(
          "Invalid use of the authenticated decorator. Please use this decorator for graphql resolvers."
        );
      }

      const context = args[2] as Context;
      if (!context.requester) {
        throw new Error("Not authorized!");
      }

      const requesterRole = context.requester.role;

      if (!roles.includes(requesterRole) && requesterRole !== Role.ADMIN) {
        throw new Error("User has insufficient rights");
      }
      // Call the original function
      return originalValue.apply(this, args);
    };
  };
}
