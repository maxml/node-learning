import { makeExecutableSchema } from "graphql-tools";
import { ApiResolver } from "./resolver";

const schema = `
      type Query {
        sayHello(name: String!): String
      }
`;

const resolver = new ApiResolver();

const resolvers = {
  Query: {
    sayHello: resolver.sayHello,
  },
};

export const apiSchema = makeExecutableSchema({ typeDefs: schema, resolvers });
