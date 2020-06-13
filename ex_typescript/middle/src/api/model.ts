export enum Role {
  ADMIN = "ADMIN",
  USER = "USER",
  ANONYMOUS = "ANONYMOUSE",
}
export class User {
  id: string;
  username: string;
  role: Role;
}
