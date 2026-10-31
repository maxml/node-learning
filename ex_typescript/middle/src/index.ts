import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { apiSchema } from "./api/schema";
import { config } from "./config";
import { securityContextHandler } from "./security/context";
import { generateToken } from "./security/jwt";

// graphql-yoga 1 (GraphQLServer + Express + Apollo Server 1) замінено на graphql-yoga 6:
// createYoga повертає обробник запитів для node:http. GraphiQL відкривається на тому ж
// /graphql (замість окремого /playground), підписки йдуть через SSE на /graphql.
const options = {
  port: config.server.port,
  endpoint: "/graphql",
};
const yoga = createYoga({
  schema: apiSchema,
  graphqlEndpoint: options.endpoint,
  context: securityContextHandler,
});
const server = createServer(yoga);
server.listen(options.port, () => {
  console.log(`Server is running on http://localhost:${options.port}${options.endpoint}`);
  console.log(`Global admin token: ${generateToken()}`);
});
