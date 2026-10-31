import { YogaInitialContext } from "graphql-yoga";
import { Requester, validateToken } from "./jwt";

export class Context {
  requester: Requester;
}

// graphql-yoga 6 передає Fetch API Request (а не Express req): заголовок через headers.get
export const securityContextHandler = ({
  request,
}: YogaInitialContext): Context => {
  const regex = /Bearer\s(\S+)/g;
  const matches = regex.exec(request.headers.get("authorization") ?? "");
  if (matches && matches.length === 2) {
    const requester = validateToken(matches[1]);
    return { requester };
  }
};
