// Bug class: "absent" and "present but undefined" are different at runtime.
// A PATCH object with an explicit `name: undefined` wipes the existing value when
// spread over the record, though the type said `name` is an optional string.
type User = { id: number; name: string };
type Patch = { name?: string };

export function apply(user: User, patch: Patch): User {
  return { ...user, ...patch }; // { id, name: undefined } if patch = { name: undefined }
}
export const p: Patch = { name: undefined };
