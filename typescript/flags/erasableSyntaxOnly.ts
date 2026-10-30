// Bug class: syntax with runtime semantics (enum, namespace with code,
// parameter properties) cannot be executed by type stripping.
// Node fails with ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX at load time.
export enum Status {
  Active = "active",
  Blocked = "blocked",
}
export class Svc {
  constructor(private readonly url: string) {}
}
console.log(Status.Active, new Svc("x"));
