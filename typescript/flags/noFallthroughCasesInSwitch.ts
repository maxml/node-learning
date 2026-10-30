// Bug class: a missing `break` makes "admin" also run the "user" branch.
export function perms(role: string): string[] {
  const out: string[] = [];
  switch (role) {
    case "admin":
      out.push("delete");
    case "user":
      out.push("read");
      break;
  }
  return out;
}
