import { GraphQLError } from "graphql";
import { Role } from "../api/model";
import { Context } from "./context";

// graphql-yoga маскує звичайні Error як "Unexpected error."; клієнту доходить лише
// текст GraphQLError, тому помилки авторизації кидаємо саме нею.
export function Authenticated(roles: Role[]) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalValue = descriptor.value;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = function (...args: any[]) {
      if (args.length !== 4 && !(args[2] instanceof Context)) {
        throw new Error(
          "Invalid use of the authenticated decorator. Please use this decorator for graphql resolvers."
        );
      }

      const context = args[2] as Context;
      if (!context.requester) {
        throw new GraphQLError("Not authorized!");
      }

      const requesterRole = context.requester.role;

      if (!roles.includes(requesterRole) && requesterRole !== Role.ADMIN) {
        throw new GraphQLError("User has insufficient rights");
      }
      // Call the original function
      return originalValue.apply(this, args);
    };
  };
}
