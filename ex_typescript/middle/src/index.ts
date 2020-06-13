import { GraphQLServer } from "graphql-yoga";
import { apiSchema } from "./api/schema";
import { config } from "./config";
import { securityContextHandler } from "./security/context";
import { generateToken } from "./security/jwt";

const options = {
  port: config.server.port,
  endpoint: "/graphql",
  subscriptions: "/subscriptions",
  playground: "/playground",
};
const server = new GraphQLServer({
  schema: apiSchema,
  context: securityContextHandler,
});
server.start(options, () => {
  console.log(`Server is running on http://localhost:${options.port}`);
  console.log(`Global admin token: ${generateToken()}`);
});
