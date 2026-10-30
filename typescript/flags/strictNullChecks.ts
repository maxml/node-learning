// Bug class: `find` can return undefined; without strictNullChecks `undefined`
// is assignable to everything, so the missing-user path crashes at runtime.
type User = { id: number; name: string };
export function nameOf(users: User[], id: number): string {
  const user = users.find((u) => u.id === id);
  return user.name.toUpperCase();
}
