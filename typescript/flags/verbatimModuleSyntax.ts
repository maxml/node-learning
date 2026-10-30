// Bug class: a type imported without `import type` looks like a value import.
// A per-file transpiler (Node type stripping, esbuild, swc) cannot know it is a type,
// keeps the import, and the ESM loader fails: "does not provide an export named 'User'".
import { User } from "./types.ts";
export const u: User = { id: 1, name: "a" };
console.log(u.name);
