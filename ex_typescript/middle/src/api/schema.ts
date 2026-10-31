// graphql-tools@3 → @graphql-tools/schema: та сама makeExecutableSchema
import { makeExecutableSchema } from "@graphql-tools/schema";
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
